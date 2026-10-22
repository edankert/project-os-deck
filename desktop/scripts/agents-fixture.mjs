// TASK-0178 — records the fixtures DES-0006's page is drawn from. For each workspace: its
// overview model now (the same builder as the overview fixtures), and the agent sessions
// the cockpit has recorded in its `.cockpit/` folder, reduced by agents-notes.mjs to what
// may be committed (ids, states, times, counts, names). Run from desktop/ after
// `npm run build`:
//   node scripts/agents-fixture.mjs [--your-trainer <root>] [--cockpit <root>]
// It reads the transcripts the sessions name, for counts only, where they still exist.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sessionsFrom, countTranscript } from './agents-notes.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.join(here, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const out = path.join(desktop, 'fixtures', 'agents');
export const AGENT_WORKSPACES = {
  deck: { label: 'Deck', root: path.join(desktop, '..') },
  'your-trainer': { label: 'your-trainer', root: path.resolve(option('--your-trainer', path.join(desktop, '..', '..', 'your-trainer'))) },
  cockpit: { label: 'project-os-cockpit', root: path.resolve(option('--cockpit', path.join(desktop, '..', '..', 'project-os-cockpit'))) },
};

const read = (p, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return fallback;
  }
};

fs.mkdirSync(out, { recursive: true });
for (const [ws, { root }] of Object.entries(AGENT_WORKSPACES)) {
  const built = spawnSync(process.execPath, [path.join(here, 'overview.mjs'), root, '--json'], { encoding: 'utf-8', maxBuffer: 1 << 28 });
  if (built.status !== 0) throw new Error(`the overview model of ${ws} could not be built: ${built.stderr}`);
  fs.writeFileSync(path.join(out, `${ws}.json`), built.stdout);
  const model = JSON.parse(built.stdout);
  const cockpit = path.join(root, '.cockpit');
  const recorded = read(path.join(cockpit, 'sessions.json'), { sessions: [] });
  const counts = (s) => (s.transcript_path && fs.existsSync(s.transcript_path) ? countTranscript(fs.readFileSync(s.transcript_path, 'utf-8'), s.agent) : null);
  const agents = sessionsFrom({ sessions: recorded.sessions, approvals: read(path.join(cockpit, 'approvals.json'), []), agentState: read(path.join(cockpit, 'agent-state.json'), null), counts, tickets: new Set(Object.keys(model.tickets)) });
  // What is not yet pushed, as counts: commits ahead of the upstream, files changed in the tree.
  const git = (a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf-8' });
  const ahead = git(['rev-list', '--count', '@{u}..HEAD']);
  const changed = git(['status', '--porcelain']);
  const publish = { ahead: ahead.status === 0 ? Number(ahead.stdout.trim()) : null, changed: changed.status === 0 ? changed.stdout.split('\n').filter(Boolean).length : null };
  // When the person last caught up in the cockpit, for "since you last looked".
  const seen = read(path.join(cockpit, 'last-seen.json'), null)?.seen_at ?? null;
  fs.writeFileSync(path.join(out, `${ws}-sessions.json`), JSON.stringify({ workspace: ws, recorded: new Date().toISOString(), head: model.head, seen, publish, ...agents }, null, 1) + '\n');
  console.log(`agents-fixture: ${ws}: ${Object.keys(model.tickets).length} tickets at ${String(model.head).slice(0, 7)}; ${agents.sessions.length} sessions, ${agents.requests.length} permission requests`);
}
