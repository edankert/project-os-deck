// A fake `codex app-server` for TST-0104 (FEAT-0032, TASK-0193): JSON-RPC over stdio, one
// message per line. It answers initialize, thread/start, thread/resume, turn/start and
// turn/interrupt, and plays FAKE_CODEX_SCRIPT (a JSON list of turns, each a list of steps) as
// notifications and approval requests, waiting for each answer. Every request it receives is
// appended to FAKE_CODEX_LOG. All text is invented (RISK-0016); no model is reached (RISK-0017).
import fs from 'node:fs';
import readline from 'node:readline';

const script = JSON.parse(process.env.FAKE_CODEX_SCRIPT ?? '[]');
const log = process.env.FAKE_CODEX_LOG;
const send = (m) => process.stdout.write(`${JSON.stringify(m)}\n`);
const waiting = new Map();
let serverId = 1000;
let turnNo = 0;
let interrupted = false;
const ask = (method, params) => new Promise((resolve) => { const id = serverId++; waiting.set(id, resolve); send({ id, method, params }); });

async function play(turnId) {
  const steps = script[turnNo++] ?? [];
  send({ method: 'turn/started', params: { threadId: 'thread-1', turn: { id: turnId, status: 'inProgress', items: [] } } });
  let status = 'completed';
  for (const step of steps) {
    if (interrupted) { status = 'interrupted'; break; }
    if (step.say) send({ method: 'item/completed', params: { threadId: 'thread-1', turnId, item: { type: 'agentMessage', id: `m${serverId++}`, text: step.say } } });
    if (step.plan) send({ method: 'turn/plan/updated', params: { threadId: 'thread-1', turnId, explanation: null, plan: step.plan.map(([s, done]) => ({ step: s, status: done ? 'completed' : 'pending' })) } });
    if (step.run) {
      const item = { type: 'commandExecution', id: `c${serverId++}`, command: step.run, cwd: '/tmp', status: 'inProgress' };
      send({ method: 'item/started', params: { threadId: 'thread-1', turnId, item } });
      const answer = step.ask ? await ask('item/commandExecution/requestApproval', { threadId: 'thread-1', turnId, itemId: item.id, command: step.run }) : { decision: 'accept' };
      send({ method: 'item/completed', params: { threadId: 'thread-1', turnId, item: { ...item, status: answer.decision === 'accept' ? 'completed' : 'declined' } } });
    }
    if (step.patch) {
      const [path, diff] = step.patch;
      const item = { type: 'fileChange', id: `f${serverId++}`, changes: [{ path, kind: { type: 'update', move_path: null }, diff }], status: 'inProgress' };
      send({ method: 'item/started', params: { threadId: 'thread-1', turnId, item } });
      const answer = await ask('item/fileChange/requestApproval', { threadId: 'thread-1', turnId, itemId: item.id });
      send({ method: 'item/completed', params: { threadId: 'thread-1', turnId, item: { ...item, status: answer.decision === 'accept' ? 'completed' : 'declined' } } });
    }
    if (step.unknown) await ask(step.unknown, {}).then((r) => send({ method: 'item/completed', params: { threadId: 'thread-1', turnId, item: { type: 'agentMessage', id: 'u', text: `answered ${JSON.stringify(r)}` } } }));
  }
  send({ method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: turnId, status, items: [], error: null } } });
}

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const m = JSON.parse(line);
  if (log) fs.appendFileSync(log, `${line}\n`);
  if (m.id !== undefined && m.method === undefined) {
    const resolve = waiting.get(m.id);
    waiting.delete(m.id);
    resolve?.(m.error ? { error: m.error } : m.result);
    return;
  }
  if (m.method === 'initialize') send({ id: m.id, result: { userAgent: 'fake' } });
  else if (m.method === 'thread/start') send({ id: m.id, result: { thread: { id: 'thread-1' } } });
  else if (m.method === 'thread/resume') send({ id: m.id, result: { thread: { id: m.params.threadId } } });
  else if (m.method === 'turn/start') {
    const turnId = `turn-${turnNo + 1}`;
    interrupted = false;
    send({ id: m.id, result: { turn: { id: turnId, status: 'inProgress' } } });
    void play(turnId);
  } else if (m.method === 'turn/interrupt') { interrupted = true; send({ id: m.id, result: {} }); }
  else if (m.id !== undefined) send({ id: m.id, error: { code: -32601, message: 'unknown' } });
});
