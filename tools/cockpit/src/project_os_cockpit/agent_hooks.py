"""Hook-fed agent session tracking (FEAT-0019 / TASK-0114).

Claude Code (and Codex, via an adapter forwarder) can POST structured
lifecycle events to ``/api/agent-hook`` — ``SessionStart``,
``UserPromptSubmit``, ``PreToolUse``, ``PostToolUse``,
``PermissionRequest``, ``Notification``, ``Stop``, ``SessionEnd``, plus
a cockpit-defined ``Statusline`` event carrying cost/context data. This
module owns the per-workspace accumulation of those events:

* the **headline state mapping** (``UserPromptSubmit`` → ``busy``,
  ``PermissionRequest`` → ``needs-input``, ``Stop`` → ``waiting``,
  ``SessionEnd`` → ``idle``) that feeds the existing ``CockpitState``
  agent-state machine,
* the **activity feed** (current prompt, tool, file) fanned out as
  ``cockpit:agent-activity`` SSE events,
* the **session index** (TASK-0123): a bounded, atomically-persisted
  record of past sessions under ``.cockpit/sessions.json``,
* the **undocumented-work rule** (TASK-0125): source files edited with
  no TASK/ISS/CHG note touched,
* **CHG provenance** (TASK-0126): correlating CHG notes created during
  a live session.

Trust model (RISK-0004): payloads arrive from localhost but are
*untrusted input* — any local process can POST here. Everything is
shape-validated, size-capped, and clipped before storage; nothing from
a payload is ever rendered as HTML by this layer. Unknown events are
logged and dropped rather than erroring, so hook-schema drift in the
CLIs cannot break ingestion.
"""

from __future__ import annotations

import datetime as _dt
import json
import logging
import os
import re
import threading
import uuid
from pathlib import Path
from typing import Any

from . import session_cache
from .events import relative_to_ci

log = logging.getLogger("project_os_cockpit.agent_hooks")

# Hard cap on accepted request bodies. PostToolUse payloads for Write
# carry whole file contents in ``tool_input``, so this is deliberately
# generous; storage below clips to small fields regardless.
MAX_BODY_BYTES = 2 * 1024 * 1024

SESSIONS_MAX = 50      # persisted session records per workspace
DISPATCHES_MAX = 30    # pending dispatch records kept (FEAT-0025)
REQUESTS_MAX = 20      # CLI queue-requests awaiting desktop pickup
# A pending dispatch is stamped onto the next session that starts
# within this window; older ones are considered abandoned.
DISPATCH_STAMP_WINDOW_SECONDS = 900.0
PROMPTS_MAX = 50       # prompts kept per session
PROMPT_CLIP = 500      # chars kept per prompt
FILES_MAX = 200        # touched files kept per session
STATUS_TOUCHED_MAX = 60  # notes whose status changed, kept per session (TASK-0194)
MESSAGE_CLIP = 300     # chars kept for notification/stop messages
PERSIST_INTERVAL_SECONDS = 5.0
# A cockpit-terminal session with the opt-in external hook enabled fires
# BOTH capture paths, posting the same payload ~100ms apart. Identical
# (session, event, payload) within this window is that double-capture,
# not two real events — drop the second (TASK-0152).
DEDUP_WINDOW_SECONDS = 2.0
# The cockpit's Claude plugin (FEAT-0156) marks every post with this key.
# Once a session has sent a marked post, an unmarked Claude post for it is
# the opt-in external hook (FEAT-0027) capturing the same event a second
# time, and is dropped. The window above still catches a terminal opened
# before the plugin, whose shell runs the old generated hooks.
PLUGIN_MARK = "_cockpit_plugin"
# A delivery is one dispatched prompt on its way to one Claude session, which
# the cockpit's plugin submits once the session is idle (FEAT-0158). States:
#   held       nothing will submit it: no plugin claims the session yet, or
#              the session ended (``reason`` says which)
#   waiting    the plugin will submit it once the session is idle
#              (``waiting_for: "you"`` while the person has stopped the
#              session with Esc: it follows their next message, TASK-0659)
#   sending    the plugin called ``$.prompt.submit``; the turn has not started
#   cancelling unused: a prompt being submitted cannot be withdrawn, because a
#              plugin's own `prompt.submit` hook never sees its own
#              submission (TASK-0655's live run), so there is nothing to ask
#   started    the session's turn started with it: delivered
#   cancelled  withdrawn before the plugin claimed it (TASK-0657)
#   dropped    ``$.prompt.submit`` refused it; ``reason`` says why
DELIVERY_FINISHED = frozenset({"started", "cancelled"})
DELIVERIES_MAX_OPEN = 30       # unfinished deliveries kept per workspace
DELIVERIES_KEEP_FINISHED = 30  # finished ones kept, newest first, then pruned
DELIVERY_REASON_UNCLAIMED = "this Claude session has no cockpit plugin"
DELIVERY_REASON_ENDED = "the session ended"
# A prompt the plugin was submitting when its session ended, or its sidecar
# restarted: it may have started a turn that nobody reported (TASK-0662).
DELIVERY_REASON_UNCONFIRMED = "the session ended before Claude confirmed its turn, so it may have run"
# On their way into a session the plugin speaks for.
DELIVERY_PENDING = frozenset({"waiting", "sending"})


def _can_still_be_submitted(d: dict[str, Any]) -> bool:
    """Counts toward the cap: on its way, or held only until a plugin claims
    its session. A prompt whose session ended, or that was dropped, cannot
    block new dispatches (TASK-0662)."""
    return d.get("state") in DELIVERY_PENDING or (
        d.get("state") == "held" and d.get("reason") == DELIVERY_REASON_UNCLAIMED)

# Notification subtypes that mean "a human must act now" — the agent is
# blocked mid-work. idle_prompt is deliberately excluded (see below):
# a finished turn is `waiting` (review me), not blocked, and must not
# escalate to the red needs-input tier (TASK-0156, the never-ending
# red-blink report 2026-07-19).
_NEEDS_INPUT_NOTIFICATIONS = frozenset(
    {"permission_prompt", "elicitation_dialog"}
)
# Notification subtypes that mean "the agent finished and is idling,
# waiting for you" — the amber `waiting` tier, same as a Stop.
_WAITING_NOTIFICATIONS = frozenset({"idle_prompt"})
# Tool names whose tool_input.file_path counts as "touching a file".
_EDIT_TOOLS = frozenset(
    {"Edit", "Write", "MultiEdit", "NotebookEdit", "apply_patch"}
)
_PATCH_PATH = re.compile(r"^\*\*\* (?:Update File|Add File|Delete File|Move to): (.+)$", re.MULTILINE)


def _codex_patch_paths(command: str, cwd: str | None, root: Path) -> list[str]:
    """Read file paths from an apply_patch payload, never from a Bash command."""
    base = Path(cwd) if isinstance(cwd, str) and cwd else root
    paths: list[str] = []
    for match in _PATCH_PATH.finditer(command):
        candidate = Path(match.group(1).strip())
        absolute = candidate if candidate.is_absolute() else base / candidate
        absolute = absolute.resolve(strict=False)
        if relative_to_ci(absolute, root) is not None:
            value = str(absolute)
            if value not in paths:
                paths.append(value)
        if len(paths) >= FILES_MAX:
            break
    return paths
# Docs-note filename prefixes that satisfy the documentation contract
# for the undocumented-work rule (TASK-0125).
_DOC_NOTE_PREFIXES = ("TASK-", "ISS-", "CHG-")
# Broader set — every trackable note type — for the live-work views
# (FEAT-0036): "what items is this session touching", independent of the
# narrower undocumented-work contract above.
_WORK_NOTE_PREFIXES = (
    "TASK-", "ISS-", "FEAT-", "REQ-", "PHASE-", "RISK-", "CHG-", "ADR-", "TST-",
)


def _utc_now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="milliseconds")


def _parse_iso(ts: str) -> float:
    try:
        return _dt.datetime.fromisoformat(ts).timestamp()
    except (ValueError, TypeError):
        return 0.0


def _normalize_reset(value: Any) -> str | None:
    """Normalise a rate-limit ``resets_at`` to an ISO-8601 string so every
    UI surface parses it the same way (review finding F2). Accepts an ISO
    string as-is, or a Unix epoch in seconds or milliseconds."""
    if isinstance(value, str) and value:
        return value
    if isinstance(value, (int, float)):
        secs = value / 1000.0 if value > 1e11 else float(value)
        try:
            return _dt.datetime.fromtimestamp(
                secs, _dt.timezone.utc
            ).isoformat(timespec="seconds")
        except (ValueError, OverflowError, OSError):
            return None
    return None


def _clip(value: Any, limit: int) -> str:
    text = str(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"


class AgentSessionTracker:
    """Accumulates hook events into per-session records for one workspace.

    Thread-safe: the HTTP server is multi-threaded and the watcher
    thread calls :meth:`on_file_event` concurrently with ingestion.
    """

    def __init__(
        self, *, docs_root: Path, sessions_path: Path | None = None
    ) -> None:
        self._lock = threading.Lock()
        self._docs_root = docs_root.resolve()
        self._sessions_path = sessions_path
        self._sessions: dict[str, dict[str, Any]] = {}
        self._order: list[str] = []  # session ids, oldest first
        # Dispatch ledger (FEAT-0025 / TASK-0135): dispatches awaiting
        # a session to stamp, and CLI queue-requests awaiting the
        # desktop shell (TASK-0136).
        self._pending_dispatches: list[dict[str, Any]] = []
        self._dispatch_requests: list[dict[str, Any]] = []
        # Deliveries (FEAT-0158 / TASK-0654), oldest first.
        self._deliveries: list[dict[str, Any]] = []
        self._delivery_changes: list[dict[str, Any]] = []
        self._activity: dict[str, Any] | None = None
        self._last_persist = 0.0
        # Dedup window for the terminal+external double-capture
        # (TASK-0152): {(sid, event, digest): monotonic-ish ts}.
        self._recent_events: dict[tuple[str, str, int], float] = {}
        self._live_ttl = float(
            os.environ.get("COCKPIT_AGENT_SESSION_TTL_SECONDS", "600")
        )
        if sessions_path is not None:
            self._seed(sessions_path)

    # ---- persistence ----

    def _seed(self, path: Path) -> None:
        """Best-effort load of past sessions. Sessions that were live
        when the previous process died are marked ended so they can't
        ghost as live forever."""
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            return
        if not isinstance(data, dict) or not isinstance(
            data.get("sessions"), list
        ):
            return
        for rec in data["sessions"]:
            if not isinstance(rec, dict):
                continue
            sid = rec.get("session_id")
            if not isinstance(sid, str) or not sid:
                continue
            if rec.get("ended") is None:
                rec["ended"] = rec.get("last_event") or _utc_now_iso()
            self._sessions[sid] = rec
            self._order.append(sid)
        for rec in data.get("deliveries") or []:
            if isinstance(rec, dict) and isinstance(rec.get("did"), str):
                self._deliveries.append(rec)
        # Every session was just marked ended, so nothing addressed to one
        # can still be submitted.
        for sid in list(self._sessions):
            self._hold_deliveries_locked(sid, DELIVERY_REASON_ENDED, _utc_now_iso())

    def _persist_locked(self, *, force: bool = False) -> None:
        """Atomic (temp+rename) mirror of the session index. Called
        under the instance lock; failures are logged, never raised."""
        if self._sessions_path is None:
            return
        now = _dt.datetime.now().timestamp()
        if not force and now - self._last_persist < PERSIST_INTERVAL_SECONDS:
            return
        self._last_persist = now
        # Retention: keep the most recent SESSIONS_MAX records.
        while len(self._order) > SESSIONS_MAX:
            dropped = self._order.pop(0)
            self._sessions.pop(dropped, None)
        payload = {
            "sessions": [self._sessions[sid] for sid in self._order],
            "deliveries": self._deliveries,
        }
        try:
            self._sessions_path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self._sessions_path.with_name(
                self._sessions_path.name + ".tmp"
            )
            tmp.write_text(
                json.dumps(payload, ensure_ascii=False), encoding="utf-8"
            )
            os.replace(tmp, self._sessions_path)
        except OSError as exc:
            log.warning(
                "session index write failed for %s: %s",
                self._sessions_path, exc,
            )

    # ---- ingestion ----

    def _session_locked(self, sid: str, agent: str, ts: str) -> dict[str, Any]:
        sess = self._sessions.get(sid)
        if sess is None:
            sess = {
                "session_id": sid,
                "agent": agent,
                "started": ts,
                "ended": None,
                "last_event": ts,
                "cwd": None,
                "transcript_path": None,
                "prompts": [],
                "files": [],
                "docs_notes": [],
                "work_ts": {},
                "prompt_started": None,
                "status_touched": {},
                "cost": None,
                "chg_ids": [],
                "dispatches": [],
                "undocumented": False,
            }
            self._sessions[sid] = sess
            self._order.append(sid)
            # Stamp fresh pending dispatches onto the session they most
            # plausibly started (TASK-0135) — same correlation pattern
            # as CHG notes.
            now = _dt.datetime.now(_dt.timezone.utc).timestamp()
            fresh = [
                d for d in self._pending_dispatches
                if now - _parse_iso(d["ts"]) <= DISPATCH_STAMP_WINDOW_SECONDS
            ]
            if fresh:
                sess["dispatches"] = [dict(d) for d in fresh]
                self._pending_dispatches = [
                    d for d in self._pending_dispatches if d not in fresh
                ]
        return sess

    def _record_file_locked(self, sess: dict[str, Any], file_path: str) -> str | None:
        """Record a touched file; returns the docs-relative path when
        the file lives under the docs root, else None."""
        rel = relative_to_ci(Path(file_path), self._docs_root)
        entry = rel if rel is not None else file_path
        files = sess["files"]
        if entry in files:
            files.remove(entry)  # move to end = most recent
        files.append(entry)
        del files[:-FILES_MAX]
        if rel is not None:
            name = rel.rsplit("/", 1)[-1]
            if name.upper().startswith(_DOC_NOTE_PREFIXES):
                if rel not in sess["docs_notes"]:
                    sess["docs_notes"].append(rel)
            if name.upper().startswith(_WORK_NOTE_PREFIXES):
                work = sess.setdefault("work_notes", [])
                if rel not in work:
                    work.append(rel)
                # Last edit-touch per work note (TASK-0191) — drives the
                # prompt-scoped in-flight set and the active-item pulse.
                sess.setdefault("work_ts", {})[rel] = (
                    sess.get("last_event") or _utc_now_iso()
                )
        self._refresh_undocumented_locked(sess)
        return rel

    def _refresh_undocumented_locked(self, sess: dict[str, Any]) -> None:
        """TASK-0125 rule: source files edited (outside docs/) while no
        TASK/ISS/CHG note has been touched this session.

        Files under the docs root are stored docs-relative by
        ``_record_file_locked``; everything else keeps its absolute
        path — so "absolute path present" ⇔ "source file touched".
        """
        has_src = any(
            f.startswith("/") or (len(f) > 1 and f[1] == ":")
            for f in sess["files"]
        )
        sess["undocumented"] = has_src and not (
            sess["docs_notes"] or sess["chg_ids"]
        )

    def ingest(self, body: dict[str, Any]) -> dict[str, Any]:
        """Fold one hook payload into the tracker.

        Returns an outcome dict: ``{"ok": bool, "state": str | None,
        "message": str | None, "activity": dict | None,
        "ignored": bool}``. ``state`` is the headline agent-state the
        caller should record + fan out (None = no state change).
        """
        event = body.get("hook_event_name")
        if not isinstance(event, str) or not event:
            return {"ok": False, "error": "missing 'hook_event_name'"}
        sid = body.get("session_id")
        if not isinstance(sid, str) or not sid:
            # Codex notify payloads carry `thread-id` instead.
            sid = body.get("thread-id")
        sid = sid if isinstance(sid, str) and sid else "unknown"
        agent = body.get("agent")
        agent = agent if isinstance(agent, str) and agent else "claude"
        ts = _utc_now_iso()

        state: str | None = None
        message: str | None = None
        ignored = False

        with self._lock:
            # Drop the terminal+external double-capture (TASK-0152):
            # identical payload for the same session/event within the
            # dedup window. Never persisted, no state/activity fan-out.
            # The plugin's mark is left out of the comparison, so its copy
            # and the external hook's match in either order (FEAT-0156
            # review, TASK-0653). A marked copy dropped here still claims
            # the session, so the external hook's later posts are dropped.
            now_ts = _parse_iso(ts)
            marked = body.get(PLUGIN_MARK) is True
            try:
                digest = hash(json.dumps(
                    {k: v for k, v in body.items() if k != PLUGIN_MARK},
                    sort_keys=True, default=str))
            except (TypeError, ValueError):
                digest = None
            dk = (sid, event, digest) if digest is not None else None
            if dk is not None:
                seen = self._recent_events.get(dk)
                if seen is not None and now_ts - seen <= DEDUP_WINDOW_SECONDS:
                    if marked and agent == "claude":
                        self._claim_for_plugin_locked(sid, agent, ts)
                    return {"ok": True, "state": None, "message": None,
                            "activity": None, "ignored": True,
                            "duplicate": True}
            if agent == "claude":
                claimed = self._sessions.get(sid, {}).get("plugin_claimed")
                if marked:
                    if not claimed:
                        self._claim_for_plugin_locked(sid, agent, ts)
                elif claimed:
                    return {"ok": True, "state": None, "message": None,
                            "activity": None, "ignored": True,
                            "duplicate": True}
            # Only a post that is kept is remembered: a copy dropped above
            # must not make the plugin's own copy of that event look like a
            # duplicate of it.
            if dk is not None:
                self._recent_events[dk] = now_ts
                if len(self._recent_events) > 256:
                    cutoff = now_ts - DEDUP_WINDOW_SECONDS
                    self._recent_events = {
                        k: v for k, v in self._recent_events.items()
                        if v > cutoff
                    }
            sess = self._session_locked(sid, agent, ts)
            if agent == "codex" and body.get("_cockpit_notify"):
                if sess.get("native_codex_hook_seen"):
                    return {"ok": True, "state": None, "message": None,
                            "activity": None, "ignored": True}
            elif agent == "codex":
                sess["native_codex_hook_seen"] = True
            sess["last_event"] = ts
            # A session receiving fresh activity is alive again — clear a
            # stale `ended` marker (ISS-0014). `_seed` stamps `ended` on
            # every persisted-live session at startup so a dead one can't
            # ghost as live; but the soft live-reload (TASK-0014) restarts
            # the sidecar under a still-running terminal, so its live
            # session would otherwise stay `ended` forever and never show
            # its cost/ctx. `SessionEnd` is the only event that ends a
            # session; a truly dead one gets no further events and still
            # ages out via `_live_ttl`. (A late event buffered after a
            # legitimate SessionEnd would briefly re-live the session, but
            # the CLI has already exited so no more arrive and it ages out
            # via the TTL — tolerated as purely cosmetic.)
            if event != "SessionEnd" and sess.get("ended") is not None:
                sess["ended"] = None
            for key in ("cwd", "transcript_path"):
                val = body.get(key)
                if isinstance(val, str) and val:
                    sess[key] = val

            activity: dict[str, Any] = {
                "event": event, "session_id": sid, "agent": agent, "ts": ts,
            }

            if event == "SessionStart":
                sess["ended"] = None
            elif event == "UserPromptSubmit":
                prompt = body.get("prompt")
                if isinstance(prompt, str) and prompt.strip():
                    clipped = _clip(prompt.strip(), PROMPT_CLIP)
                    sess["prompts"].append({"ts": ts, "text": clipped})
                    del sess["prompts"][:-PROMPTS_MAX]
                    activity["prompt"] = clipped
                # Prompt boundary (TASK-0191): work-note touches at/after
                # this stamp are "in flight for the current prompt".
                sess["prompt_started"] = ts
                sess.pop("interrupted", None)
                self._mark_waiting_for_person_locked(sid, False, ts)
                state = "busy"
            elif event in ("PreToolUse", "PostToolUse"):
                tool = body.get("tool_name")
                if isinstance(tool, str) and tool:
                    activity["tool"] = tool
                tool_input = body.get("tool_input")
                if (
                    isinstance(tool, str)
                    and tool in _EDIT_TOOLS
                    and isinstance(tool_input, dict)
                ):
                    file_path = tool_input.get("file_path") or tool_input.get(
                        "path"
                    )
                    if isinstance(file_path, str) and file_path:
                        rel = self._record_file_locked(sess, file_path)
                        activity["file"] = file_path
                        if rel is not None:
                            activity["rel"] = rel
                    elif (
                        agent == "codex" and tool == "apply_patch"
                        and event == "PostToolUse"
                        and isinstance(tool_input.get("command"), str)
                    ):
                        for patch_path in _codex_patch_paths(
                            tool_input["command"], body.get("cwd"),
                            self._docs_root.parent,
                        ):
                            rel = self._record_file_locked(sess, patch_path)
                            activity["file"] = patch_path
                            #: `file` and `rel` name the same file. A later
                            #: path outside docs/ used to leave an earlier
                            #: path's `rel` behind (FEAT-0019 review, 2026-09-25).
                            if rel is not None:
                                activity["rel"] = rel
                            else:
                                activity.pop("rel", None)
                # A tool event means the agent is actively working —
                # refresh busy so long tasks don't decay mid-flight.
                state = "busy"
            elif event == "PermissionRequest":
                tool = body.get("tool_name")
                message = (
                    f"wants to use {tool}" if isinstance(tool, str) and tool
                    else "needs permission"
                )
                state = "needs-input"
            elif event == "Interrupt":
                # Cancellation requires a new user decision. Using waiting
                # would immediately release queued prompts after the user
                # deliberately stopped the agent. Codex sends this itself;
                # for Claude the cockpit plugin sends it, because Claude Code
                # fires no Stop for a turn stopped with Esc (TASK-0659).
                state = "needs-input"
                sess["interrupted"] = True
                message = "interrupted — waiting for your input"
                self._mark_waiting_for_person_locked(sid, True, ts)
            elif event == "Notification":
                ntype = body.get("notification_type")
                raw_msg = body.get("message")
                if isinstance(raw_msg, str) and raw_msg.strip():
                    message = _clip(raw_msg.strip(), MESSAGE_CLIP)
                if isinstance(ntype, str) and ntype in _NEEDS_INPUT_NOTIFICATIONS:
                    state = "needs-input"
                    message = message or "needs your input"
                elif isinstance(ntype, str) and ntype in _WAITING_NOTIFICATIONS:
                    # Idle prompt = turn finished, agent waiting — amber,
                    # not the red blocked tier (TASK-0156).
                    state = "waiting"
                    message = message or "waiting for your input"
            elif event == "Stop":
                raw_msg = body.get("message")
                if isinstance(raw_msg, str) and raw_msg.strip():
                    message = _clip(raw_msg.strip(), MESSAGE_CLIP)
                state = "waiting"
            elif event == "SessionEnd":
                sess["ended"] = ts
                state = "idle"
                self._hold_deliveries_locked(sid, DELIVERY_REASON_ENDED, ts)
            elif event == "Statusline":
                cost = body.get("cost")
                ctx = body.get("context_window")
                snap: dict[str, Any] = {}
                if isinstance(cost, dict):
                    for k in (
                        "total_cost_usd", "total_lines_added",
                        "total_lines_removed", "total_duration_ms",
                    ):
                        if isinstance(cost.get(k), (int, float)):
                            snap[k] = cost[k]
                if isinstance(ctx, dict):
                    for k in ("used_percentage", "context_window_size"):
                        if isinstance(ctx.get(k), (int, float)):
                            snap[k] = ctx[k]
                rl = body.get("rate_limits")
                if isinstance(rl, dict):
                    slim_rl: dict[str, Any] = {}
                    for window in ("five_hour", "seven_day"):
                        w = rl.get(window)
                        if isinstance(w, dict) and isinstance(
                            w.get("used_percentage"), (int, float)
                        ):
                            slim_rl[window] = {
                                "used_percentage": w["used_percentage"],
                                "resets_at": _normalize_reset(
                                    w.get("resets_at")
                                ),
                            }
                    if slim_rl:
                        snap["rate_limits"] = slim_rl
                if snap:
                    # When this reading was captured — lets the UI keep
                    # the freshest account-global usage across workspaces
                    # (TASK-0169).
                    snap["captured_at"] = ts
                    sess["cost"] = snap
                    activity["cost"] = snap
                else:
                    ignored = True
            elif event in ("SubagentStart", "SubagentStop"):
                agent_type = body.get("agent_type")
                if isinstance(agent_type, str) and agent_type:
                    activity["subagent"] = agent_type
                child_id = body.get("agent_id")
                if isinstance(child_id, str) and child_id:
                    #: Capped like `session_id` (FEAT-0019 review, 2026-09-25).
                    activity["subagent_id"] = child_id[:128]
            else:
                # Unknown / future event: log-and-drop (RISK-0004 —
                # schema drift must never break ingestion).
                log.debug("agent-hook: ignoring unknown event %r", event)
                ignored = True

            # Background tools can finish after Escape. Hold the interruption
            # until a new prompt or session exit, including a late Stop event.
            if sess.get("interrupted") and event != "SessionEnd":
                state = "needs-input"
                message = "interrupted — waiting for your input"
            self._refresh_undocumented_locked(sess)
            activity["undocumented"] = sess["undocumented"]
            if state is not None:
                activity["state"] = state
                sess["state"] = state
            if not ignored:
                self._activity = activity
            self._persist_locked(
                force=event in ("SessionStart", "SessionEnd", "Interrupt")
            )

        return {
            "ok": True,
            "state": state,
            "message": message,
            "activity": None if ignored else activity,
            "ignored": ignored,
        }

    # ---- dispatch ledger (FEAT-0025 / TASK-0135 + TASK-0136) ----

    def record_dispatch(
        self, note_id: str, verb: str | None = None,
        agent: str | None = None, *, enqueue: bool = False,
        delivered_by: str | None = None, rel: str | None = None,
    ) -> dict[str, Any]:
        """A dispatch ledger entry, or with ``enqueue`` a request for the
        desktop shell (`cockpit dispatch`). A request writes no ledger entry:
        the shell writes the real one when it delivers, so a request used to
        leave a second, agentless entry beside it (ISS-0320). ``rel`` is the
        note's docs-relative path, which the request carries."""
        rec: dict[str, Any] = {"id": note_id, "ts": _utc_now_iso()}
        if verb:
            rec["verb"] = str(verb)
        if agent:
            rec["agent"] = str(agent)
        # `typed`: the shell wrote it into the terminal, and `ts` is when.
        # A submitted prompt is stamped by `_stamp_delivered_locked` instead.
        if delivered_by in ("typed", "submit"):
            rec["delivered_by"] = delivered_by
        with self._lock:
            if enqueue:
                request = dict(rec)
                if rel:
                    request["rel"] = rel
                self._dispatch_requests.append(request)
                del self._dispatch_requests[:-REQUESTS_MAX]
                return request
            live = self._live_session_locked()
            if live is not None:
                # Agent already running: this dispatch belongs to the
                # live session (queued delivery lands there).
                live.setdefault("dispatches", []).append(dict(rec))
                del live["dispatches"][:-DISPATCHES_MAX]
                self._persist_locked(force=True)
            else:
                self._pending_dispatches.append(dict(rec))
                del self._pending_dispatches[:-DISPATCHES_MAX]
        return rec

    # ---- deliveries (FEAT-0158 / TASK-0654) ----

    def _claim_for_plugin_locked(self, sid: str, agent: str, ts: str) -> None:
        """Mark the session as the plugin's, and wake what was held for it."""
        self._session_locked(sid, agent, ts)["plugin_claimed"] = True
        for d in self._deliveries:
            if (d.get("session_id") == sid and d.get("state") == "held"
                    and d.get("reason") == DELIVERY_REASON_UNCLAIMED):
                d["state"] = "waiting"
                d.pop("reason", None)
                d["updated"] = ts
                self._delivery_changes.append(dict(d))

    def _hold_deliveries_locked(self, sid: str, reason: str, ts: str) -> None:
        """Hold what was on its way to a session that can no longer take it.

        A `waiting` prompt is held. A `sending` one is already in Claude's
        hands and may have started a turn, so it becomes `dropped` as
        unconfirmed: a late report of its turn still counts, and removing it
        is not recorded as a cancel (TASK-0662)."""
        for d in self._deliveries:
            if d.get("session_id") != sid or d.get("state") not in DELIVERY_PENDING:
                continue
            if d["state"] == "sending":
                d["state"], d["reason"] = "dropped", DELIVERY_REASON_UNCONFIRMED
            else:
                d["state"], d["reason"] = "held", reason
            d["updated"] = ts
            self._delivery_changes.append(dict(d))

    def _mark_waiting_for_person_locked(self, sid: str, on: bool, ts: str) -> None:
        """Mark, or unmark, the prompts waiting for a session the person
        stopped with Esc. Claude Code takes no plugin prompt until the person
        sends input, so the plugin holds them; the mark lets the queue list
        say so instead of "waiting for Claude" (TASK-0659)."""
        for d in self._deliveries:
            if d.get("session_id") != sid or d.get("state") != "waiting":
                continue
            if on == (d.get("waiting_for") == "you"):
                continue
            if on:
                d["waiting_for"] = "you"
            else:
                d.pop("waiting_for", None)
            d["updated"] = ts
            self._delivery_changes.append(dict(d))

    def _prune_deliveries_locked(self) -> None:
        finished = [d for d in self._deliveries if d.get("state") in DELIVERY_FINISHED]
        drop = {id(d) for d in finished[:-DELIVERIES_KEEP_FINISHED]} if len(finished) > DELIVERIES_KEEP_FINISHED else set()
        if drop:
            self._deliveries = [d for d in self._deliveries if id(d) not in drop]

    def take_delivery_changes(self) -> list[dict[str, Any]]:
        """Deliveries whose state changed as a side effect of a hook event
        (a session claimed or ended) since the last call, for the server to
        publish. Changes made by a delivery route are returned by that route."""
        with self._lock:
            out = self._delivery_changes
            self._delivery_changes = []
            return out

    def add_delivery(self, item: dict[str, Any], session_id: str) -> tuple[dict[str, Any] | None, str | None]:
        """Address a dispatched prompt to a Claude session. Returns the new
        delivery, or ``None`` and the reason it was refused."""
        prompt = item.get("prompt")
        note_id = item.get("id")
        if not isinstance(prompt, str) or not prompt.strip():
            return None, "missing 'prompt'"
        if not isinstance(note_id, str) or not note_id.strip():
            return None, "missing 'id'"
        if not isinstance(session_id, str) or not session_id:
            return None, "missing 'session_id'"
        ts = _utc_now_iso()
        with self._lock:
            open_count = sum(1 for d in self._deliveries if _can_still_be_submitted(d))
            if open_count >= DELIVERIES_MAX_OPEN:
                return None, f"{DELIVERIES_MAX_OPEN} prompts are already waiting in this workspace"
            sess = self._sessions.get(session_id)
            rec: dict[str, Any] = {
                "did": uuid.uuid4().hex[:12],
                "id": note_id.strip().upper(),
                "agent": "claude",
                "prompt": prompt,
                "session_id": session_id,
                "ts": item.get("ts") if isinstance(item.get("ts"), str) else ts,
                "created": ts,
                "updated": ts,
            }
            for key in ("rel", "verb"):
                if isinstance(item.get(key), str) and item[key]:
                    rec[key] = item[key]
            if sess is not None and sess.get("ended") is not None:
                rec["state"], rec["reason"] = "held", DELIVERY_REASON_ENDED
            elif sess is not None and sess.get("plugin_claimed"):
                rec["state"] = "waiting"
                if sess.get("interrupted"):
                    rec["waiting_for"] = "you"
            else:
                rec["state"], rec["reason"] = "held", DELIVERY_REASON_UNCLAIMED
            self._deliveries.append(rec)
            self._persist_locked(force=True)
            return dict(rec), None

    def list_deliveries(self, session_id: str | None = None) -> list[dict[str, Any]]:
        """Every delivery not yet finished, oldest first; one session's when
        ``session_id`` is given. Reading removes nothing."""
        with self._lock:
            return [
                dict(d) for d in self._deliveries
                if d.get("state") not in DELIVERY_FINISHED
                and (session_id is None or d.get("session_id") == session_id)
            ]

    def _find_delivery_locked(self, did: Any) -> dict[str, Any] | None:
        if not isinstance(did, str):
            return None
        return next((d for d in self._deliveries if d.get("did") == did), None)

    def move_delivery(
        self, did: Any, to: str, *, turn_id: str | None = None,
        started_at: str | None = None, reason: str | None = None,
    ) -> tuple[dict[str, Any] | None, str | None]:
        """One plugin step: ``claim`` (waiting to sending), ``started``
        (sending to started, stamping the ledger) or ``dropped`` (sending to
        dropped). Returns the delivery after the move, or ``None`` and why
        not. A refusal carries the delivery as it now stands, so a caller that
        lost a race learns what won."""
        allowed = {"sending": ("waiting",), "started": ("sending", "dropped"), "dropped": ("sending",)}
        if to not in allowed:
            return None, f"unknown step {to!r}"
        ts = _utc_now_iso()
        with self._lock:
            d = self._find_delivery_locked(did)
            if d is None:
                return None, "no such delivery"
            late = to == "started" and d.get("state") == "dropped"
            if d.get("state") not in allowed[to] or (late and d.get("reason") != DELIVERY_REASON_UNCONFIRMED):
                return dict(d), f"the delivery is {d.get('state')}, not {' or '.join(allowed[to])}"
            d["state"] = to
            d["updated"] = ts
            if to == "dropped":
                d["reason"] = reason or "the session refused it"
            if to == "started":
                # A turn confirmed after its session was given up on: the
                # report wins, because the prompt did run.
                d.pop("reason", None)
                d["started_at"] = started_at or ts
                if turn_id:
                    d["turn_id"] = turn_id
                self._stamp_delivered_locked(d)
            self._prune_deliveries_locked()
            self._persist_locked(force=True)
            return dict(d), None

    def cancel_delivery(self, did: Any) -> tuple[dict[str, Any] | None, str | None]:
        """Withdraw a delivery the plugin has not claimed (TASK-0657).

        ``held``, ``waiting`` and ``dropped`` become ``cancelled``, and the
        note's dispatch history records it: as cancelled for a prompt that
        never left, as removed, with the reason, for a dropped one. A ``sending`` delivery is already
        on its way into the session and cannot be withdrawn; a ``started`` one
        has its turn running. Both are refused, with the delivery as it stands,
        so the caller can say which. Under the lock, a cancel and a claim
        cannot both win."""
        ts = _utc_now_iso()
        with self._lock:
            d = self._find_delivery_locked(did)
            if d is None:
                return None, "no such delivery"
            state = d.get("state")
            if state == "cancelled":
                return dict(d), None
            if state == "sending":
                return dict(d), "too late: it is being submitted to Claude"
            if state == "started":
                return dict(d), "too late: its turn has started"
            # A dropped prompt reached Claude, or may have: removing it is
            # not a cancel "before it reached the session" (TASK-0662).
            removed = state == "dropped"
            d["state"] = "cancelled"
            d["cancelled_at"] = ts
            d["updated"] = ts
            sess = self._sessions.get(d.get("session_id"))
            if sess is not None:
                rec: dict[str, Any] = {
                    "id": d["id"], "ts": ts, "agent": "claude",
                    "delivery": d["did"],
                }
                if removed:
                    rec["removed"] = True
                    rec["reason"] = d.get("reason") or "not delivered"
                else:
                    rec["cancelled"] = True
                if d.get("verb"):
                    rec["verb"] = d["verb"]
                sess.setdefault("dispatches", []).append(rec)
                del sess["dispatches"][:-DISPATCHES_MAX]
            self._prune_deliveries_locked()
            self._persist_locked(force=True)
            return dict(d), None

    def _stamp_delivered_locked(self, d: dict[str, Any]) -> None:
        """The ledger entry for a delivered prompt: on its own session, at the
        time its turn started (FEAT-0025's ledger, ``delivered_by: submit``)."""
        sess = self._sessions.get(d["session_id"])
        if sess is None:
            sess = self._session_locked(d["session_id"], "claude", d["started_at"])
        rec: dict[str, Any] = {
            "id": d["id"], "ts": d["started_at"], "agent": "claude",
            "delivered_by": "submit", "delivery": d["did"],
        }
        if d.get("verb"):
            rec["verb"] = d["verb"]
        if d.get("turn_id"):
            rec["turn_id"] = d["turn_id"]
        sess.setdefault("dispatches", []).append(rec)
        del sess["dispatches"][:-DISPATCHES_MAX]

    def take_dispatch_requests(self) -> list[dict[str, Any]]:
        """Hand queued CLI requests to the desktop shell exactly once."""
        with self._lock:
            out = list(self._dispatch_requests)
            self._dispatch_requests = []
            return out

    def dispatch_history(self, note_id: str) -> list[dict[str, Any]]:
        """Newest-first dispatch records for one note, with the session
        each landed in (TASK-0135). Pending records carry no session."""
        out: list[dict[str, Any]] = []
        with self._lock:
            now = _dt.datetime.now(_dt.timezone.utc).timestamp()
            for d in reversed(self._pending_dispatches):
                if d["id"] == note_id:
                    out.append({**d, "session_id": None, "live": False,
                                "pending": True})
            for sid in reversed(self._order):
                sess = self._sessions[sid]
                is_live = sess.get("ended") is None and (
                    now - _parse_iso(sess["last_event"]) <= self._live_ttl
                )
                for d in reversed(sess.get("dispatches") or []):
                    if d["id"] == note_id:
                        # A cancelled dispatch never reached the session, so
                        # it is not live work there (the re-dispatch guard).
                        entry = {**d, "session_id": sid,
                                 "live": is_live and not d.get("cancelled") and not d.get("removed")}
                        cost = sess.get("cost")
                        if isinstance(cost, dict) and isinstance(
                            cost.get("total_cost_usd"), (int, float)
                        ):
                            entry["total_cost_usd"] = cost["total_cost_usd"]
                        out.append(entry)
        return out

    # ---- file-event correlation (TASK-0126) ----

    def on_file_event(self, kind: str, rel_path: str) -> None:
        """Watcher callback: attach CHG notes created/modified during a
        live session to that session, and count them for the
        undocumented-work rule."""
        if kind not in ("created", "modified"):
            return
        name = rel_path.rsplit("/", 1)[-1]
        if not name.upper().startswith("CHG-") or not name.endswith(".md"):
            return
        chg_id = name[: -len(".md")]
        with self._lock:
            sess = self._live_session_locked()
            if sess is None:
                return
            if chg_id not in sess["chg_ids"]:
                sess["chg_ids"].append(chg_id)
            if rel_path not in sess["docs_notes"]:
                sess["docs_notes"].append(rel_path)
            self._refresh_undocumented_locked(sess)
            self._persist_locked(force=True)

    def record_status_change(self, payload: dict[str, Any]) -> None:
        """Stamp a note whose status changed onto the live session
        (TASK-0194). Fed from the watcher's ``cockpit:status-change`` events,
        so it captures shell-tool writes the PostToolUse touch-tracker misses,
        and — being persisted on the session — survives a sidecar restart.
        Bounded; created-but-unchanged notes emit no transition so the
        untouched backlog never lands here.
        """
        rel = payload.get("rel")
        nid = payload.get("id")
        if not isinstance(rel, str) or not rel:
            return
        with self._lock:
            sess = self._live_session_locked()
            if sess is None:
                return
            touched = sess.setdefault("status_touched", {})
            touched[rel] = {
                "id": nid if isinstance(nid, str) else None,
                "status": payload.get("to"),
                "ts": payload.get("ts") or sess.get("last_event") or _utc_now_iso(),
                "title": payload.get("title"),
            }
            # Bound to the most recent changes by timestamp.
            if len(touched) > STATUS_TOUCHED_MAX:
                for k in sorted(touched, key=lambda r: str(touched[r].get("ts") or ""))[
                    : len(touched) - STATUS_TOUCHED_MAX
                ]:
                    touched.pop(k, None)
            self._persist_locked()

    def chg_provenance(self, chg_id: str) -> dict[str, Any] | None:
        """Which session produced this CHG note (if known)?"""
        with self._lock:
            for sid in reversed(self._order):
                sess = self._sessions[sid]
                if chg_id in sess.get("chg_ids", ()):
                    prov: dict[str, Any] = {
                        "session_id": sid,
                        "agent": sess.get("agent"),
                        "started": sess.get("started"),
                    }
                    cost = sess.get("cost")
                    if isinstance(cost, dict) and isinstance(
                        cost.get("total_cost_usd"), (int, float)
                    ):
                        prov["total_cost_usd"] = cost["total_cost_usd"]
                    return prov
        return None

    # ---- read paths ----

    def _live_session_locked(
        self, now: float | None = None
    ) -> dict[str, Any] | None:
        if now is None:
            now = _dt.datetime.now(_dt.timezone.utc).timestamp()
        candidates = [
            self._sessions[sid] for sid in self._order
            if self._sessions[sid].get("ended") is None
            and now - _parse_iso(self._sessions[sid]["last_event"])
            <= self._live_ttl
        ]
        if not candidates:
            return None
        priority = {"needs-input": 3, "busy": 2, "waiting": 1}
        return max(
            candidates,
            key=lambda sess: (
                priority.get(sess.get("state"), 0),
                _parse_iso(sess["last_event"]),
            ),
        )

    def has_live_session(self, now: float | None = None) -> bool:
        with self._lock:
            return self._live_session_locked(now) is not None

    @staticmethod
    def _slim(sess: dict[str, Any], *, live: bool) -> dict[str, Any]:
        prompts = sess.get("prompts") or []
        return {
            "session_id": sess["session_id"],
            "agent": sess.get("agent"),
            "state": sess.get("state"),
            "started": sess.get("started"),
            "ended": sess.get("ended"),
            "live": live,
            "prompt_count": len(prompts),
            "last_prompt": prompts[-1]["text"] if prompts else None,
            "files": list(sess.get("files") or []),
            "docs_notes": list(sess.get("docs_notes") or []),
            "work_notes": list(sess.get("work_notes") or []),
            # Per-note last-touch timestamps + the current prompt boundary
            # (TASK-0191) — the server enriches these into work_items.
            "work_ts": dict(sess.get("work_ts") or {}),
            "prompt_started": sess.get("prompt_started"),
            # Notes whose status changed this session (TASK-0194).
            "status_touched": dict(sess.get("status_touched") or {}),
            "cost": sess.get("cost"),
            "chg_ids": list(sess.get("chg_ids") or []),
            "dispatches": [dict(d) for d in sess.get("dispatches") or []],
            "undocumented": bool(sess.get("undocumented")),
            "transcript_path": sess.get("transcript_path"),
            # The cockpit plugin speaks for this session (FEAT-0156), so a
            # dispatch to it is submitted rather than typed (FEAT-0158).
            "plugin_claimed": bool(sess.get("plugin_claimed")),
        }

    def _latest_rate_limits_locked(self) -> dict[str, Any] | None:
        """Freshest account-global rate-limit reading across every
        session, by ``captured_at`` (TASK-0171). Rate limits are
        account-global, so the most recently captured reading wins
        regardless of which session recorded it; readings without a
        ``captured_at`` (freshness unknown) are ignored."""
        best: tuple[float, dict[str, Any], str] | None = None
        for sess in self._sessions.values():
            cost = sess.get("cost") or {}
            rl = cost.get("rate_limits")
            cap = cost.get("captured_at")
            if not isinstance(rl, dict) or not isinstance(cap, str):
                continue
            ts = _parse_iso(cap)
            if ts <= 0:
                continue
            if best is None or ts > best[0]:
                best = (ts, rl, cap)
        if best is None:
            return None
        return {"rate_limits": best[1], "rate_limits_at": best[2]}

    def latest_rate_limits(self) -> dict[str, Any] | None:
        with self._lock:
            return self._latest_rate_limits_locked()

    def snapshot(self) -> dict[str, Any]:
        """Live-activity block merged into ``/api/cockpit/state``.

        ``last_session`` carries the most recent session when none is
        live, so the agent strip can keep showing what the agent last
        did here — including the files it touched — between runs
        instead of vanishing the moment a session ends.

        ``rate_limits`` / ``rate_limits_at`` carry the freshest
        account-global usage reading across ALL sessions (TASK-0171).

        ``cache`` carries prompt-cache standing for the session being
        shown — what its prefix weighs and whether that prefix is still
        warm (FEAT-0081 / TASK-0344). Read from the transcript by a
        bounded tail read, so this stays cheap enough for a block that
        re-renders on every snapshot.
        """
        with self._lock:
            live = self._live_session_locked()
            last = None
            if live is None and self._order:
                last = self._sessions[self._order[-1]]
            out: dict[str, Any] = {
                "activity": self._activity,
                "session": self._slim(live, live=True) if live else None,
                "last_session": (
                    self._slim(last, live=False) if last is not None else None
                ),
                # Prompts on their way to a Claude session here, for the
                # fleet view's queue depth (FEAT-0158).
                "deliveries_open": sum(
                    1 for d in self._deliveries
                    if d.get("state") not in DELIVERY_FINISHED
                ),
            }
            lrl = self._latest_rate_limits_locked()
            if lrl:
                out["rate_limits"] = lrl["rate_limits"]
                out["rate_limits_at"] = lrl["rate_limits_at"]
            shown = live if live is not None else last
            if shown is not None and shown.get("agent") == "claude":
                cache = session_cache.live_state(shown.get("transcript_path"))
                if cache is not None:
                    out["cache"] = cache.as_dict()
            return out

    def cache_report(self) -> dict[str, Any]:
        """Retrospective prompt-cache accounting for this workspace
        (FEAT-0081 / TASK-0345).

        Aggregates :func:`session_cache.history` over every transcript
        the tracker knows about. Full scans, but memoised against mtime,
        so a repeat call after no agent activity is free.
        """
        with self._lock:
            paths: list[str] = []
            for sid in self._order:
                path = self._sessions[sid].get("transcript_path")
                if isinstance(path, str) and path and path not in paths:
                    paths.append(path)

        totals = {
            "transcripts": 0, "turns": 0,
            "read_tokens": 0, "write_tokens": 0,
            "read_cost_usd": 0.0, "write_cost_usd": 0.0,
        }
        buckets: dict[str, dict[str, Any]] = {}
        for path in paths:
            hist = session_cache.history(path)
            if hist is None:
                continue
            totals["transcripts"] += 1
            totals["turns"] += hist.turns
            totals["read_tokens"] += hist.read_tokens
            totals["write_tokens"] += hist.write_tokens
            totals["read_cost_usd"] += hist.read_cost_usd
            totals["write_cost_usd"] += hist.write_cost_usd
            for cause, agg in hist.buckets().items():
                dst = buckets.setdefault(
                    cause, {"count": 0, "tokens": 0, "cost_usd": 0.0}
                )
                dst["count"] += agg["count"]
                dst["tokens"] += agg["tokens"]
                dst["cost_usd"] += agg["cost_usd"]

        for agg in buckets.values():
            agg["cost_usd"] = round(agg["cost_usd"], 2)
        totals["read_cost_usd"] = round(totals["read_cost_usd"], 2)
        totals["write_cost_usd"] = round(totals["write_cost_usd"], 2)
        return {
            **totals,
            "rewrites": buckets,
            # Everything but the unavoidable first cold write of a
            # session. Rendered with a `~`: token counts are exact, the
            # dollars come from a price table that drifts.
            "avoidable_cost_usd": round(
                sum(
                    agg["cost_usd"]
                    for cause, agg in buckets.items()
                    if cause != session_cache.CAUSE_SESSION_START
                ),
                2,
            ),
        }

    def sessions_payload(self) -> list[dict[str, Any]]:
        """Newest-first slim session list for ``/api/cockpit/sessions``
        (TASK-0123). Prompts are included in full (clipped at ingest)."""
        with self._lock:
            now = _dt.datetime.now(_dt.timezone.utc).timestamp()
            out: list[dict[str, Any]] = []
            for sid in reversed(self._order):
                sess = self._sessions[sid]
                is_live = sess.get("ended") is None and (
                    now - _parse_iso(sess["last_event"]) <= self._live_ttl
                )
                slim = self._slim(sess, live=is_live)
                slim["prompts"] = [dict(p) for p in sess.get("prompts") or []]
                out.append(slim)
            return out
