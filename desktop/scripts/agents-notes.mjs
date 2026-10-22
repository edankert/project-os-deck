// TASK-0178 — what DES-0006's page may show of the agent sessions the cockpit has recorded.
// Pure, so a test can check on records of its own that nothing but ids, states, times,
// counts and names gets through: no prompt, no reply, no command, no file path.

const ID = /^[A-Z]+-\d+/;

/** Text the harness wrote into the conversation, not a person: tags, AGENTS.md, interruptions, resumptions. */
const isHarness = (text) => {
  const t = String(text).trimStart();
  return t === '' || t.startsWith('<') || t.startsWith('# AGENTS.md') || t.startsWith('[Request interrupted') || t.startsWith('This session is being continued');
};

/**
 * A Claude transcript (JSONL) or a Codex rollout, counted, never copied: tool calls by name,
 * the prompts a person typed, and each turn (from one prompt to the next) as its start time,
 * its tool calls by name, how many files it edited and how many lines it added and removed.
 */
export function countTranscript(text, agent) {
  const tools = {};
  let prompts = 0;
  const turns = [];
  let turn = null;
  const files = new Set();
  const startTurn = (ts) => {
    turn = { ts: String(ts ?? ''), tools: {}, files: 0, plus: 0, minus: 0 };
    files.clear();
    turns.push(turn);
  };
  const add = (name) => {
    if (!name) return;
    tools[name] = (tools[name] ?? 0) + 1;
    if (turn) turn.tools[name] = (turn.tools[name] ?? 0) + 1;
  };
  const lines = (v) => (typeof v === 'string' && v !== '' ? v.split('\n').length : 0);
  const edited = (file, plus, minus) => {
    if (!turn) return;
    if (file && !files.has(file)) {
      files.add(file);
      turn.files += 1;
    }
    turn.plus += plus;
    turn.minus += minus;
  };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (agent === 'codex') {
      const p = o.payload ?? {};
      // A person's message, not the harness's (AGENTS.md, <environment_context>, <hook_prompt>...).
      if (o.type === 'response_item' && p.type === 'message' && p.role === 'user') {
        const said = typeof p.content === 'string' ? p.content : (Array.isArray(p.content) ? p.content.map((b) => b?.text ?? '').join('') : '');
        if (!isHarness(said)) {
          prompts += 1;
          startTurn(o.timestamp);
        }
      }
      if (o.type === 'response_item' && (p.type === 'function_call' || p.type === 'custom_tool_call')) {
        add(p.name);
        const input = typeof p.input === 'string' ? p.input : typeof p.arguments === 'string' ? p.arguments : '';
        if (input.includes('*** Begin Patch')) {
          // Codex often writes the patch inside a script, its line breaks escaped as \n.
          const patch = /\n\*\*\* /.test(input) ? input : input.replace(/\\n/g, '\n');
          for (const l of patch.split('\n')) {
            const f = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/.exec(l)?.[1];
            if (f) edited(f, 0, 0);
            else if (l.startsWith('+') && !l.startsWith('+++')) edited(null, 1, 0);
            else if (l.startsWith('-') && !l.startsWith('---')) edited(null, 0, 1);
          }
        }
      }
      continue;
    }
    const content = o.message?.content;
    // A prompt is a person's turn: text, not a tool's result and not the harness's own note.
    if (o.type === 'user' && !o.isMeta && !o.toolUseResult) {
      const isText = typeof content === 'string' ? !isHarness(content) : Array.isArray(content) && content.some((b) => b?.type === 'text' && !isHarness(String(b.text))) && !content.some((b) => b?.type === 'tool_result');
      if (isText) {
        prompts += 1;
        startTurn(o.timestamp);
      }
    }
    if (o.type === 'assistant' && Array.isArray(content)) {
      for (const b of content) {
        if (b?.type !== 'tool_use') continue;
        add(b.name);
        const i = b.input ?? {};
        if (b.name === 'Edit') edited(i.file_path, lines(i.new_string), lines(i.old_string));
        else if (b.name === 'Write') edited(i.file_path, lines(i.content), 0);
        else if (b.name === 'MultiEdit') for (const e of i.edits ?? []) edited(i.file_path, lines(e.new_string), lines(e.old_string));
      }
    }
  }
  const top = (m, n) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n));
  return { tools, prompts, turns: turns.map((t) => ({ ...t, tools: top(t.tools, 6) })) };
}

/**
 * The ticket a session was started on, where it stands on the ring (TASK-0188, Edwin's answer of
 * 2026-10-22). The cockpit records no start ticket, so for a recorded session it is the first
 * ticket whose status it changed, in the order the cockpit first saw each change, else the first
 * ticket it touched. A session Deck starts with "Work on this" will know its ticket exactly.
 */
export function startOf(session) {
  return session.changed?.[0]?.[0] ?? session.tickets?.[0] ?? null;
}

/** The ticket id a note's path names, by its file name. */
const ticketOfPath = (p) => ID.exec(String(p).split('/').pop() ?? '')?.[0] ?? null;

/**
 * The sessions, permission requests and live states the page shows, from the cockpit's
 * records: `sessions` and `approvals` as the files hold them, `agentState` the
 * agent-state file, `counts(session)` a transcript's counts or null, `tickets` the ids the
 * workspace's model holds. Keeps the `keep` most recent sessions and any a recent request
 * belongs to.
 */
export function sessionsFrom({ sessions, approvals = [], agentState = null, counts = () => null, tickets, keep = 10, requests = 6 }) {
  const recent = [...(approvals ?? [])].sort((a, b) => String(a.ts).localeCompare(String(b.ts))).slice(-requests);
  const wanted = new Set(recent.map((a) => a.session_id));
  const ordered = [...(sessions ?? [])].sort((a, b) => String(a.last_event ?? a.started).localeCompare(String(b.last_event ?? b.started)));
  const chosen = ordered.filter((s, i) => i >= ordered.length - keep || wanted.has(s.session_id));
  const live = agentState?.hook_sessions ?? {};
  const short = (id) => String(id).slice(0, 8);
  const out = chosen.map((s) => {
    const changed = Object.values(s.status_touched ?? {}).filter((c) => c && ID.test(String(c.id))).map((c) => [String(c.id), String(c.status ?? ''), String(c.ts ?? '')]);
    const named = [...(s.work_notes ?? []), ...(s.docs_notes ?? [])].map(ticketOfPath);
    const ids = [...new Set([...changed.map((c) => c[0]), ...named])].filter((id) => id !== null && tickets.has(id));
    const c = s.cost ?? null;
    const n = counts(s);
    return {
      id: short(s.session_id),
      agent: s.agent === 'codex' ? 'codex' : 'claude',
      state: String(live[s.session_id]?.state ?? s.state ?? 'idle'),
      started: String(s.started ?? ''),
      last: String(s.last_event ?? s.started ?? ''),
      ended: s.ended ? String(s.ended) : null,
      tickets: ids,
      changed: changed.filter((x) => tickets.has(x[0])),
      files: (s.files ?? []).length,
      // Use, not money: Deck's repository is public, and Edwin left each session's dollar cost out (2026-10-22).
      cost: c ? { context: c.used_percentage ?? null, window: c.context_window_size ?? null, minutes: Math.round((c.total_duration_ms ?? 0) / 60000), fiveHour: c.rate_limits?.five_hour?.used_percentage ?? null, week: c.rate_limits?.seven_day?.used_percentage ?? null } : null,
      prompts: n?.prompts ?? (s.prompts ?? []).length,
      tools: n ? Object.fromEntries(Object.entries(n.tools).sort((a, b) => b[1] - a[1]).slice(0, 8)) : {},
      // The last eight turns, as counts: when each began, its steps, the files and lines it changed.
      turns: n?.turns ? n.turns.slice(-8) : [],
    };
  });
  const requestsOut = recent.map((a) => ({ session: short(a.session_id), agent: a.agent === 'codex' ? 'codex' : 'claude', tool: String(a.tool ?? ''), kind: String(a.kind ?? 'permission'), status: String(a.status ?? ''), ts: String(a.ts ?? ''), closed: String(a.closed_at ?? a.handed_back_at ?? '') }));
  return { sessions: out.reverse(), requests: requestsOut.reverse() };
}
