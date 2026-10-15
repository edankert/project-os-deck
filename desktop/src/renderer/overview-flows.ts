/** Acceptance controls only write after a person's action, through the shell. */
import {
  acceptFromPayloads, acceptScene, deckImageHref, designFromPayload, designScene, gateReady, FEATURE_TRANSITION_UNAVAILABLE,
  gateFromModel, linkIds, noteVerdicts, RESULTS, testRunFromPayloads, testRunScene,
  type AcceptData, type DesignFlowData, type StepMarks, type TestRunData,
} from '../shared/overview-flows.js';
import { drawnMtime, drawnMtimeKey, noteMtime, registerScreen, type ScreenDefinition, type ScreenInput } from './overview.js';

const object = (v: unknown): Record<string, unknown> => typeof v === 'object' && v !== null ? v as Record<string, unknown> : {};
const text = (v: unknown): string => typeof v === 'string' ? v : '';
const imageLink = (input: ScreenInput) => (rel: string): string => deckImageHref(input.ctx.workspaceId, rel);
const memoryKey = (input: ScreenInput, kind: string): string => `${kind}:${input.address.note ?? ''}:${input.address.step ?? ''}`;

async function note(input: ScreenInput, id: string): Promise<unknown> {
  const located = object(await input.read(`/api/cockpit/locate?id=${encodeURIComponent(id)}`));
  if (located['found'] !== true || !text(located['rel'])) throw new Error(`the sidecar cannot find ${id}`);
  return input.read(`/api/render?path=${encodeURIComponent(text(located['rel']))}`);
}
function writable(input: ScreenInput): void {
  if (!input.canWrite) throw new Error('this host does not write');
}
async function write(input: ScreenInput, verb: string, request: Record<string, unknown>): Promise<void> {
  writable(input);
  const result = await input.write(verb, request);
  if (!result.ok) throw new Error(result.error || 'the sidecar refused the action');
}
async function reason(input: ScreenInput, prompt: string): Promise<string | null> {
  const answer = await input.ask(prompt);
  if (answer === null) return null;
  if (!answer.trim()) throw new Error('a reason is required');
  return answer.trim();
}
async function designData(input: ScreenInput): Promise<DesignFlowData> {
  if (!input.address.note?.startsWith('DES-')) throw new Error('a design flow needs its design id');
  const data = designFromPayload(await note(input, input.address.note), imageLink(input), input.canWrite);
  data.selected = Number(input.memory.get(memoryKey(input, 'plate')) ?? 0);
  return data;
}
export const designFlow: ScreenDefinition = {
  scene: async input => {
    const data = await designData(input);
    // The sidecar's note payload carries no modification time; Deck's index does. It is
    // kept as this screen saw it, the guard for a decision made here (review of TASK-0160).
    input.memory.set(drawnMtimeKey(data.id), await noteMtime(input.ctx.workspaceId, data.id));
    return designScene(input.model, data, input.ctx);
  },
  onAction: async (action, input) => {
    if (action.startsWith('plate:')) {
      const n = Number(action.slice(6));
      if (Number.isSafeInteger(n) && n >= 0) input.memory.set(memoryKey(input, 'plate'), n);
      return true;
    }
    if (action !== 'decide:accept' && action !== 'decide:decline') return false;
    writable(input);
    const data = await designData(input); // A stale picture is not authority to decide.
    if (data.status !== 'proposed') throw new Error(`${data.id} is ${data.status}; only a proposed design can be decided`);
    // The time the screen was drawn at; checked before asking why, so nobody is asked for a
    // reason Deck will not send (the review of TASK-0160).
    const mtime = drawnMtime(input.memory, data.id);
    if (action === 'decide:decline') {
      const why = await reason(input, 'Why are you declining this design?');
      if (why === null) return false;
      // /decide accepts no reason. The cockpit's design Decline row uses transition.
      const actions = object(await input.read(`/api/notes/actions?id=${encodeURIComponent(data.id)}`));
      const row = (Array.isArray(actions['actions']) ? actions['actions'] : []).map(object).find(r => r['verb'] === 'Decline');
      if (!row || row['disabled'] === true || (row['endpoint'] && row['endpoint'] !== '/api/notes/transition')) throw new Error(text(row?.['reason']) || 'the sidecar offers no design decline');
      await write(input, 'transition', { id: data.id, to: row['to'], note: why, mtime });
    } else await write(input, 'decide', { id: data.id, accept: true, mtime });
    return true;
  },
};

/** Kept per workspace and release; changing an action changes its key too. */
const marksKey = (input: ScreenInput): string => `deck:steps:v2:${input.ctx.workspaceId}`;
function marksFor(input: ScreenInput): StepMarks {
  const key = marksKey(input);
  if (input.memory.has(key)) return input.memory.get(key) as StepMarks;
  let marks: StepMarks = {};
  try {
    const raw = object(JSON.parse(globalThis.localStorage?.getItem(key) ?? '{}'));
    for (const [key, v] of Object.entries(raw)) {
      const m = object(v);
      if ((RESULTS as readonly unknown[]).includes(m['result']) && typeof m['reason'] === 'string') marks[key] = { result: m['result'] as typeof RESULTS[number], reason: m['reason'], baseline: text(m['baseline']) };
    }
  } catch { /* A restricted host still keeps this session's steps. */ }
  input.memory.set(key, marks); return marks;
}
function saveMarks(input: ScreenInput, marks: StepMarks): void {
  input.memory.set(marksKey(input), marks);
  try { globalThis.localStorage?.setItem(marksKey(input), JSON.stringify(marks)); } catch { /* Session memory remains. */ }
}
async function runData(input: ScreenInput): Promise<TestRunData> {
  const suite = object(await input.read('/api/cockpit/acceptance?platform=all'));
  if (!Array.isArray(suite['ledger_platforms'])) throw new Error('the sidecar did not name its ledger platforms');
  const platforms = suite['ledger_platforms'].filter((p): p is string => typeof p === 'string' && /^[a-z][a-z0-9-]*$/.test(p));
  if (!platforms.length) return { release: null, platforms: [{ id: 'desktop', sections: [], error: '' }], step: input.address.step ?? 'desktop', canWrite: false };
  const requestedPlatform = input.address.step?.split('.')[0];
  const firstPlatform = requestedPlatform && platforms.includes(requestedPlatform) ? requestedPlatform : platforms[0]!;
  // Asking without release finds the current working release, which is where mark-check writes.
  const current = object(await input.read(`/api/cockpit/release-test?platform=${encodeURIComponent(firstPlatform)}`));
  const release = input.address.note?.startsWith('REL-') ? input.address.note : text(current['release']);
  if (!release) return { release: null, platforms: platforms.map(id => ({ id, sections: [], error: '' })), step: firstPlatform, canWrite: false };
  const pages = await Promise.all(platforms.map(p => input.read(`/api/cockpit/release-test?platform=${encodeURIComponent(p)}&release=${encodeURIComponent(release)}`)));
  const data = testRunFromPayloads(pages, imageLink(input), { step: input.address.step ?? firstPlatform, canWrite: input.canWrite && release === current['release'] });
  input.address.note = release;
  const saved = input.memory.get(memoryKey(input, 'open'));
  const sectionNo = Number(data.step.split('.')[1]);
  data.open = typeof saved === 'string' ? saved : data.platforms.find(p => p.id === firstPlatform)?.sections.find(s => s.number === sectionNo)?.checks.find(c => !c.preparation)?.key;
  data.more = input.memory.get('test-run:more') === true;
  const marks = marksFor(input);
  let dropped = false;
  // Only prune inventories successfully read for this release; preserve other releases and platforms.
  for (const p of data.platforms.filter(p => !p.error)) {
    const currentKeys = new Set(p.sections.flatMap(s => s.checks.map(c => c.key)));
    for (const key of Object.keys(marks)) {
      try {
        const scope: unknown = JSON.parse(key);
        if (Array.isArray(scope) && scope[0] === data.release && scope[1] === p.id && !currentKeys.has(key)) { delete marks[key]; dropped = true; }
      } catch { delete marks[key]; dropped = true; }
    }
  }
  for (const p of data.platforms) for (const s of p.sections) for (const c of s.checks) {
    const mark = marks[c.key];
    if (mark && mark.baseline === c.evidence) { c.result = mark.result; c.reason = mark.reason; }
    else if (mark) { delete marks[c.key]; dropped = true; }
  }
  if (dropped) saveMarks(input, marks);
  return data;
}
export const testRunFlow: ScreenDefinition = {
  scene: async input => testRunScene(input.model, await runData(input), input.ctx),
  onAction: async (action, input) => {
    if (action.startsWith('check:')) {
      const data = await runData(input), key = action.slice(6);
      const found = data.platforms.flatMap(p => p.sections.map(s => ({ p, s }))).find(v => v.s.checks.some(c => c.key === key));
      if (!found) return false;
      input.address.step = `${found.p.id}.${found.s.number}`;
      input.memory.set(memoryKey(input, 'open'), key); input.memory.set('test-run:more', false); return true;
    }
    if (action === 'mark:more') { input.memory.set('test-run:more', input.memory.get('test-run:more') !== true); return true; }
    const verdict = action.slice(5);
    if (!action.startsWith('mark:') || !(RESULTS as readonly string[]).includes(verdict)) return false;
    writable(input);
    const data = await runData(input);
    if (!data.canWrite) throw new Error('only the current release can receive a result');
    const found = data.platforms.flatMap(p => p.sections.flatMap(s => s.checks.map(c => ({ p, c })))).find(v => v.c.key === data.open);
    if (!found || found.c.preparation || found.p.error) throw new Error('open a check before recording its result');
    const why = verdict === 'pass' ? '' : await reason(input, `Why is this check ${verdict}?`);
    if (why === null) return false;
    const marks = { ...marksFor(input), [found.c.key]: { result: verdict as typeof RESULTS[number], reason: why, baseline: found.c.evidence } };
    // Persist only after every required sidecar request succeeds. On a refusal the previous result stands.
    for (const result of noteVerdicts(data, found.p.id, marks).filter(r => found.c.tickets.includes(r.id))) await write(input, 'mark-check', result);
    saveMarks(input, marks); return true;
  },
};

/** Shared by S3 and S7. Unreadable evidence leaves a neutral, unwritable gate. */
export async function featureGate(input: ScreenInput, featureId = input.address.note): Promise<AcceptData> {
  const id = featureId;
  if (!id?.startsWith('FEAT-')) throw new Error('an acceptance flow needs its feature id');
  try {
    return await readFeatureGate(input, id);
  } catch (error) {
    const fallback = gateFromModel(input.model, id);
    const why = `the feature evidence could not be read: ${error instanceof Error ? error.message : String(error)}`;
    for (const lamp of fallback.lamps) lamp.missing.push(why);
    return fallback;
  }
}

async function readFeatureGate(input: ScreenInput, id: string): Promise<AcceptData> {
  const rendered = await note(input, id), fm = object(object(rendered)['frontmatter']);
  const scope = new Set([id, ...linkIds(fm['requirements'])]);
  const testIds = Object.values(input.model.tickets).filter(t => t.kind === 'test' && (t.links.some(l => scope.has(l)) || input.model.tickets[id]?.links.includes(t.id))).map(t => t.id);
  const taskIds = linkIds(fm['tasks']);
  const [criteria, acceptance, obligations, tests, tasks, actions] = await Promise.all([
    input.read(`/api/notes/acceptance?id=${encodeURIComponent(id)}`), input.read('/api/cockpit/acceptance?platform=all'), input.read('/api/cockpit/obligations'),
    Promise.all(testIds.map(t => note(input, t).catch(() => ({ frontmatter: { id: t, command: 'unread' } })))),
    Promise.all(taskIds.map(t => note(input, t).catch(() => ({ frontmatter: { id: t, status: 'unread' } })))),
    input.read(`/api/notes/actions?id=${encodeURIComponent(id)}`).catch(() => ({})),
  ]);
  // The overview model may be cached while another window reopens a task.
  const currentModel = { ...input.model, tickets: { ...input.model.tickets } };
  for (const task of tasks) {
    const fields = object(object(task)['frontmatter']), taskId = text(fields['id']);
    const previous = currentModel.tickets[taskId];
    if (previous) currentModel.tickets[taskId] = { ...previous, status: text(fields['status']) };
  }
  return acceptFromPayloads(currentModel, id, { note: rendered, criteria, acceptance, obligations, tests, actions }, input.canWrite);
}
export const acceptFlow: ScreenDefinition = {
  scene: async input => acceptScene(input.model, await featureGate(input), input.ctx),
  onAction: async (action, input) => {
    if (action !== 'accept:accept' && action !== 'accept:back') return false;
    writable(input);
    const data = await featureGate(input);
    if (data.status !== 'review') throw new Error('this feature is not at review');
    const stamp = data.mtime === undefined ? {} : { mtime: data.mtime };
    if (action === 'accept:back') {
      if (!data.transitions.includes('doing')) throw new Error(FEATURE_TRANSITION_UNAVAILABLE);
      const why = await reason(input, 'What must change before this feature can be accepted?');
      if (why === null) return false;
      await write(input, 'transition', { id: data.id, to: 'doing', note: why, ...stamp });
    } else {
      if (!data.acceptanceRequested && !data.transitions.includes('done')) throw new Error(FEATURE_TRANSITION_UNAVAILABLE);
      if (data.status !== 'review' || !gateReady(data)) throw new Error('the feature still has missing evidence');
      if (data.acceptanceRequested) {
        const criteria = object(await input.read(`/api/notes/acceptance?id=${encodeURIComponent(data.id)}`));
        const totals = object(criteria['totals']);
        if (totals['open'] !== 0) throw new Error('the feature criteria changed; reload before accepting');
        // The cockpit's Skip reconciles a criterion with a reason. This summarizes that evidence, not a new walk.
        await write(input, 'acceptance-run', { id: data.id, passed: totals['ticked'], failed: 0, skipped: totals['reconciled'], complete: true, issues: [], ...stamp });
      } else await write(input, 'transition', { id: data.id, to: 'done', ...stamp });
    }
    return true;
  },
};

registerScreen('flow', 'design', designFlow);
registerScreen('flow', 'test-run', testRunFlow);
registerScreen('flow', 'accept', acceptFlow);
