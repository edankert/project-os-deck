"""Permission prompts as durable state, not a colour (ISS-0094).

`agent_hooks.py` maps `PermissionRequest → needs-input` and the landing shows an
amber card. That is **detection**. Answering still means finding the terminal
and typing into it, and nothing survives a restart.

**Why this is a hole and not a wish.** [[FEAT-0076]] establishes that *nothing
in the system can wait silently without bound* — timeouts per kind,
proceed-on-assumption, the stall alarm. Every one of those mechanisms watches
**the review queue**.

A tool-permission prompt is not a queue entry. So the most likely way an
unattended worker stops — an agent asking *"may I run this command?"* — is
precisely the way the alarm cannot see it. The worker is not idle, not failed,
not budget-exhausted; it is blocked, and the loop's own supervision is blind.

This module gives a prompt an id, a status and a clock, so it can be answered
from the cockpit and **counted by the same sweep as everything else**.
"""

from __future__ import annotations

import datetime as _dt
import json
import threading
import uuid
from pathlib import Path
from typing import Any

#: Where they live. Runtime state beside the review ledger, not in `docs/` —
#: an approval is a fact about a session, not a record of the project.
STORE_REL = Path(".cockpit") / "approvals.json"

#: The escalation kind these register under, so `escalation.assess` can see
#: them without learning a second vocabulary.
KIND = "permission"

#: **No default, deliberately.** A permission prompt is a request to take an
#: action with effects outside the record — running a command, writing a file
#: somewhere the cockpit does not guard. Lapsing one into "yes" would be the
#: system granting itself authority nobody delegated; lapsing into "no" would
#: silently change what the agent did. So it has a timeout that makes it
#: **alarm**, and never an assumption.
POLICY: dict[str, Any] = {"timeout_hours": 1, "default": None}

_STATUSES = ("open", "granted", "denied", "expired", "handed-to-terminal", "closed")

#: The statuses a card is drawn for: still waiting on the cockpit, or handed
#: to the terminal while the session still waits there (FEAT-0159).
LIVE = ("open", "handed-to-terminal")

#: The largest tool input the cockpit offers for an answer (FEAT-0159). A
#: person must read what they approve in full, so a longer one is not offered
#: at all, rather than shown cut short.
MAX_INPUT_BYTES = 16 * 1024

#: The refusal for a click that arrived after the plugin gave up waiting.
HANDED_BACK = "Answer in the terminal: the cockpit's wait ran out"


def summary(tool: str, tool_input: Any) -> str:
    """What the card shows as the request: the command, the file or the URL,
    in full; any other tool's arguments as JSON."""
    if isinstance(tool_input, dict):
        for key in ("command", "file_path", "notebook_path", "url", "path", "pattern"):
            value = tool_input.get(key)
            if isinstance(value, str) and value:
                return value
    return json.dumps(tool_input, ensure_ascii=False, indent=1, sort_keys=True)


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds")


class ApprovalStore:
    """Permission prompts, persisted so they survive a restart."""

    def __init__(self, project_root: Path) -> None:
        self._path = project_root / STORE_REL
        self._lock = threading.Lock()
        self._items: list[dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        try:
            raw = json.loads(self._path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        if isinstance(raw, list):
            self._items = [i for i in raw if isinstance(i, dict)]

    def _persist_locked(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._items, indent=2), encoding="utf-8")
        tmp.replace(self._path)

    def record(
        self, *, session_id: str, tool: str = "", prompt: str = "",
        agent: str = "", options: list[str] | None = None,
    ) -> dict[str, Any]:
        """A prompt arrived. Idempotent per (session, tool, prompt) while open.

        Repeated hook deliveries are normal — a retried request must not become
        two obligations, which is the same lesson the review store learned when
        16 concurrent offers produced 9 indistinguishable rows.
        """
        with self._lock:
            for item in self._items:
                if (item.get("status") == "open"
                        and item.get("session_id") == session_id
                        and item.get("tool") == tool
                        and item.get("prompt") == prompt):
                    return dict(item)
            entry = {
                "approval_id": uuid.uuid4().hex[:12],
                "session_id": str(session_id),
                "agent": str(agent),
                "tool": str(tool),
                "prompt": str(prompt)[:1000],
                "options": [str(o) for o in (options or [])],
                "status": "open",
                "ts": _now(),
                "kind": KIND,
            }
            self._items.append(entry)
            self._persist_locked()
            return dict(entry)

    def ask(
        self, *, session_id: str, tool: str, tool_input: Any, tool_use_id: str,
        agent_id: str = "", wait_ms: int = 0,
    ) -> dict[str, Any] | None:
        """The cockpit plugin offers a permission ask (FEAT-0159 / TASK-0665).

        Idempotent on the session and ``tool_use_id``: one tool call is one
        approval whatever its status, so a retried offer never asks the person
        twice. Another session's offer with the same ID gets its own record, so
        it cannot put its input on that session's card (FEAT-0159 review,
        round 1). ``None``
        when the input is too long to show in full (MAX_INPUT_BYTES).
        """
        text = json.dumps(tool_input, ensure_ascii=False)
        if len(text.encode("utf-8")) > MAX_INPUT_BYTES:
            return None
        with self._lock:
            for item in self._items:
                if (tool_use_id and item.get("tool_use_id") == tool_use_id
                        and item.get("session_id") == str(session_id)):
                    return dict(item)
            entry = {
                "approval_id": uuid.uuid4().hex[:12],
                "session_id": str(session_id),
                "agent": "claude",
                "agent_id": str(agent_id or ""),
                "tool": str(tool),
                "tool_use_id": str(tool_use_id),
                "input": tool_input,
                "prompt": summary(str(tool), tool_input),
                # How long the plugin waits, so a card handed back to the
                # terminal can say so in this workspace's own number.
                "wait_ms": int(wait_ms),
                "options": [],
                "status": "open",
                "ts": _now(),
                "kind": KIND,
            }
            self._items.append(entry)
            self._persist_locked()
            return dict(entry)

    def get(self, approval_id: str) -> dict[str, Any] | None:
        with self._lock:
            for item in self._items:
                if item.get("approval_id") == approval_id:
                    return dict(item)
        return None

    def hand_back(self, approval_id: str) -> dict[str, Any] | None:
        """The plugin's wait ran out: an ``open`` approval goes to the terminal.

        Under the lock, and returning the record whatever its status, so a
        click that landed first is the answer the plugin uses.
        """
        with self._lock:
            for item in self._items:
                if item.get("approval_id") != approval_id:
                    continue
                if item.get("status") == "open":
                    item["status"] = "handed-to-terminal"
                    item["handed_back_at"] = _now()
                    self._persist_locked()
                return dict(item)
        return None

    def close(
        self, *, session_id: str = "", tool_use_id: str = "",
        main_loop_only: bool = False,
    ) -> list[dict[str, Any]]:
        """Close the live approvals of a call that ran, a turn that ended or a
        session that ended.

        A call that ran (``PostToolUse`` with its ``tool_use_id``) or a session
        that ended leaves nothing to answer, so its card leaves the list. So
        does the end of a main-loop turn (``main_loop_only``): no call of that
        loop is still waiting. That is the only close a prompt refused in the
        terminal gets, since a refused call never runs (live run, 2026-10-14).
        A subagent's ask is left alone, because a background subagent can
        still be waiting after the main turn ends.
        """
        closed: list[dict[str, Any]] = []
        if not session_id and not tool_use_id:
            return closed
        with self._lock:
            for item in self._items:
                if item.get("status") not in LIVE:
                    continue
                if tool_use_id and item.get("tool_use_id") != tool_use_id:
                    continue
                if session_id and item.get("session_id") != session_id:
                    continue
                if main_loop_only and item.get("agent_id"):
                    continue
                item["status"] = "closed"
                item["closed_at"] = _now()
                closed.append(dict(item))
            if closed:
                self._persist_locked()
        return closed

    def live_prompts(self) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(i) for i in self._items if i.get("status") in LIVE]

    def answer(
        self, approval_id: str, *, decision: str, actor: str = "",
    ) -> dict[str, Any] | None:
        """Grant or deny; the record, or ``None`` for an unknown id. An
        approval no longer ``open`` comes back unchanged."""
        return self.answer_open(approval_id, decision=decision, actor=actor)[0]

    def answer_open(
        self, approval_id: str, *, decision: str, actor: str = "",
    ) -> tuple[dict[str, Any] | None, bool]:
        """Grant or deny, and say whether this call was the one that did.

        **An agent may not answer its own prompt.**

        The whole point of a permission prompt is that a different party
        decides; an agent answering its own would be the loop granting itself
        authority, which is exactly what the prompt exists to prevent.
        """
        if decision not in ("granted", "denied"):
            raise ValueError(f"decision must be granted or denied, not {decision!r}")
        who = (actor or "").strip()
        if not who:
            raise ValueError("an answer needs an actor; a permission decision is somebody's")
        low = who.lower()
        if low.startswith("agent:") and low != "agent:principal":
            raise ValueError(
                f"{actor!r} may not answer a permission prompt — the prompt exists "
                "because a different party decides (ADR-0009)"
            )
        with self._lock:
            for item in self._items:
                if item.get("approval_id") != approval_id:
                    continue
                if item.get("status") != "open":
                    return dict(item), False
                item["status"] = decision
                item["decided_by"] = who
                item["decided_at"] = _now()
                self._persist_locked()
                return dict(item), True
        return None, False

    def open_prompts(self) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(i) for i in self._items if i.get("status") == "open"]

    def all_prompts(self) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(i) for i in self._items]
