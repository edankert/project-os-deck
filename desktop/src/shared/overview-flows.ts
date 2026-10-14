/** S5–S7: recorded evidence as pictures. No I/O, DOM, or verdict is made here. */
import { backControl, heading, words } from './overview-chrome.js';
import { annularSector, arc, polar, TAU } from './overview-geometry.js';
import type { ListRow, Scene, SceneNode, ScreenContext } from './overview-scene.js';
import type { OverviewModel, State } from './overview-types.js';

export interface FlowImage { href: string; label: string }
export interface DesignFlowData {
  id: string; title: string; status: string; canWrite: boolean; mtime?: number;
  plates: FlowImage[]; selected?: number;
  revisions: Array<{ label: string }>;
  comments: Array<{ text: string; answered: boolean; plate: number }>;
}
export const RESULTS = ['pass', 'fail', 'partial', 'question', 'blocked', 'na', 'excused'] as const;
export type CheckResult = typeof RESULTS[number] | 'not-run' | 'rerun' | 'unknown';
export interface FlowCheck {
  key: string; number: number; tickets: string[]; action: string; expected: string;
  result: CheckResult; reason: string; before?: FlowImage; after?: FlowImage;
  preparation: boolean;
  /** Result signature read before a local step; a new ledger result invalidates that local copy. */
  evidence: string;
}
export interface RunSection { number: number; slug: string; name: string; checks: FlowCheck[] }
export interface RunPlatform { id: string; sections: RunSection[]; error: string }
export interface TestRunData {
  release: string | null; platforms: RunPlatform[]; step: string; open?: string;
  canWrite: boolean; more?: boolean;
}
export type GateKey = 'requirements' | 'tasks' | 'automated' | 'acceptance' | 'reviews';
export interface GateLamp {
  key: GateKey; label: string; known: boolean; done: number; total: number; missing: string[];
}
export interface AcceptData {
  id: string; title: string; status: string; canWrite: boolean; lamps: GateLamp[];
  acceptanceRequested: boolean; mtime?: number;
}
export type ImageLink = (docsRelative: string) => string;
const obj = (v: unknown): Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v) ? v as Record<string, unknown> : {};
const arr = (v: unknown): unknown[] => Array.isArray(v) ? v : [];
const str = (v: unknown): string => typeof v === 'string' ? v : '';
const num = (v: unknown): number => typeof v === 'number' && Number.isFinite(v) ? v : 0;
const strings = (v: unknown): string[] => arr(v).map(str).filter(Boolean);
export const linkIds = (v: unknown): string[] => [...new Set((Array.isArray(v) ? v : [v]).flatMap(x => str(x).match(/\b[A-Z]+-\d+\b/g) ?? []))];
const unique = <T>(v: T[]): T[] => [...new Set(v)];
function plain(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, s => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' }[s] ?? s)).replace(/\s+/g, ' ').trim();
}

/** Only images below docs. Relative ../ links within docs are normal in notes. */
export function docsImagePath(href: string, noteRel = ''): string | null {
  let raw: string;
  try { raw = decodeURIComponent(href.split(/[?#]/)[0] ?? ''); } catch { return null; }
  if (!raw || /[\\\0]/.test(raw) || /^[a-z][\w+.-]*:/i.test(raw) || raw.startsWith('//')) return null;
  const rooted = /^\/?docs\//.test(raw);
  if (raw.startsWith('/') && !rooted) return null;
  raw = raw.replace(/^\/?docs\//, '');
  const parts = rooted ? [] : noteRel.split('/').slice(0, -1);
  for (const part of raw.split('/')) {
    if (part === '..') { if (parts.length === 0) return null; parts.pop(); }
    else if (part !== '.' && part !== '') parts.push(part);
  }
  const path = parts.join('/');
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(path) ? path : null;
}
export const deckImageHref = (workspace: string, path: string): string => `/deck/file/${encodeURIComponent(workspace)}/${path.split('/').map(encodeURIComponent).join('/')}`;

function sectionHtml(html: string, heading: RegExp): string {
  const headings = [...html.matchAll(/<h([2-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const at = headings.findIndex(h => heading.test(plain(h[2] ?? '')));
  if (at < 0) return '';
  const h = headings[at]!;
  const next = headings.slice(at + 1).find(n => Number(n[1]) <= Number(h[1]));
  return html.slice(h.index! + h[0].length, next?.index ?? html.length);
}

/** `/api/render` is the source, including its already resolved image URLs. */
export function designFromPayload(payload: unknown, imageLink: ImageLink = p => p, canWrite = false): DesignFlowData {
  const p = obj(payload), fm = obj(p['frontmatter']), html = str(p['html']);
  if (!str(fm['id']) || !('html' in p)) throw new Error(str(p['error']) || 'the design note could not be read');
  const plates: FlowImage[] = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const src = match[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
    const path = docsImagePath(plain(src), str(p['rel_path']));
    if (path && !plates.some(x => x.href === imageLink(path))) plates.push({ href: imageLink(path), label: plain(match[0].match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? path) });
  }
  const revisions = [...sectionHtml(html, /^revisions?\b/i).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m => ({ label: plain(m[1] ?? '') }));
  const comments = [...sectionHtml(html, /^review\b/i).matchAll(/<(?:li|p)\b[^>]*>([\s\S]*?)<\/(?:li|p)>/gi)].map(m => {
    const text = plain(m[1] ?? '');
    const plate = Math.max(0, Number(text.match(/plate\s+(\d+)/i)?.[1] ?? 1) - 1);
    return { text, answered: /\b(?:answered|resolved)\s*:/i.test(text) || /\bchecked\b/.test(m[1] ?? ''), plate };
  }).filter(c => c.text && !/^<Comments land here/.test(c.text));
  return { id: str(fm['id']), title: str(p['title']), status: str(fm['status']), canWrite, plates, revisions, comments,
    ...(typeof p['mtime'] === 'number' ? { mtime: p['mtime'] } : {}) };
}

const RANK: Record<string, number> = { na: 0, pass: 1, excused: 2, partial: 3, blocked: 4, fail: 5, question: 6, rerun: 7, unknown: 8, 'not-run': 9 };
export function resultFrom(value: unknown): CheckResult {
  const valueText = str(value);
  const aliases: Record<string, CheckResult> = { done: 'pass', passed: 'pass', failed: 'fail', important: 'fail', incomplete: 'partial', canceled: 'excused', todo: 'not-run', 'needs-re-run': 'rerun', '': 'not-run' };
  return (RESULTS as readonly string[]).includes(valueText) ? valueText as CheckResult : aliases[valueText] ?? (valueText === 'rerun' ? 'rerun' : 'unknown');
}
export const worstResult = (values: CheckResult[]): CheckResult => values.reduce((a, b) => (RANK[b] ?? 8) > (RANK[a] ?? 8) ? b : a, values[0] ?? 'not-run');
export function resultState(result: CheckResult): State {
  return ({ pass: 'closed', fail: 'failed', partial: 'progress', question: 'owed', blocked: 'open', na: 'dropped', excused: 'dropped', 'not-run': 'open', rerun: 'owed', unknown: 'owed' } as const)[result];
}

/** The release-test generator's sections, plus the sidecar's per-note results. */
export function testRunFromPayloads(payloads: unknown[], imageLink: ImageLink = p => p, options: { step?: string; open?: string; canWrite?: boolean } = {}): TestRunData {
  const pages = payloads.map(obj);
  const releases = unique(pages.map(p => str(p['release'])).filter(Boolean));
  if (releases.length > 1) throw new Error('the platform rings name different releases');
  const release = releases[0] ?? null;
  const platforms = pages.map(p => {
    const platform = str(p['platform']);
    if (!/^[a-z][a-z0-9-]*$/.test(platform)) throw new Error('a release test must name one platform');
    const error = str(p['error']) || (!Array.isArray(p['sections']) ? 'the release test has no sections payload' : '');
    const results = obj(p['results']);
    const sections = (release && !error ? arr(p['sections']) : []).map((s, si): RunSection => {
      const section = obj(s), slug = str(section['slug']) || str(section['name']).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const captures = arr(section['what_changed']).flatMap(screen => arr(obj(screen)['captures'])).map(obj);
      const capture = captures.find(c => str(c['before']) && str(c['after'])) ?? captures[0];
      const picture = (which: string): FlowImage | undefined => {
        const raw = str(capture?.[which]);
        const path = docsImagePath(raw);
        return path ? { href: imageLink(path), label: `${which === 'before' ? 'Last release' : 'Now'} · ${str(capture?.['key'])}${str(capture?.['stale']) ? ` · capture stale: ${str(capture?.['stale'])}` : ''}` } : undefined;
      };
      const checks = arr(section['groups']).flatMap(g => arr(obj(g)['checks'])).map(c => {
        const check = obj(c), tickets = strings(check['checks']);
        const expected = arr(check['expected']).map(obj);
        const tags = unique([...strings(check['tags']), ...expected.flatMap(e => [...strings(e['tags']), ...strings(e['passed'])])]).sort();
        const action = str(check['action']);
        const key = JSON.stringify([release, platform, slug, tags, action]);
        const recorded = tickets.map(t => obj(results[t]));
        const result = tickets.length && recorded.every(r => str(r['result'])) ? worstResult(recorded.map(r => resultFrom(r['result']))) : 'not-run';
        return { key, evidence: JSON.stringify(tickets.map(t => results[t] ?? null)), number: num(check['number']), tickets, action, expected: expected.map(e => str(e['text'])).join(' '), result,
          reason: recorded.map(r => str(r['reason'])).filter(Boolean).join('; '), before: picture('before'), after: picture('after'), preparation: check['preparation'] === true || tickets.length === 0 } satisfies FlowCheck;
      });
      return { number: typeof section['number'] === 'number' ? section['number'] : si + 1, slug, name: str(section['name']), checks };
    });
    return { id: platform, sections, error };
  });
  return { release, platforms, step: options.step ?? platforms[0]?.id ?? 'desktop', open: options.open, canWrite: options.canWrite === true };
}

export interface StepMark { result: typeof RESULTS[number]; reason: string; baseline?: string }
export type StepMarks = Record<string, StepMark>;
/** A printed step is not a test note. All of a note's steps must have results. */
export function noteVerdicts(data: TestRunData, platform: string, marks: StepMarks): Array<{ id: string; verdict: string; reason: string; platform: string }> {
  const byNote = new Map<string, FlowCheck[]>();
  for (const section of data.platforms.find(p => p.id === platform)?.sections ?? []) for (const c of section.checks) {
    if (c.preparation) continue;
    for (const id of c.tickets) byNote.set(id, [...(byNote.get(id) ?? []), c]);
  }
  const out: Array<{ id: string; verdict: string; reason: string; platform: string }> = [];
  for (const [id, checks] of byNote) {
    if (!checks.every(c => marks[c.key] && (marks[c.key]!.result === 'pass' || marks[c.key]!.reason.trim()))) continue;
    out.push({ id, platform, verdict: worstResult(checks.map(c => marks[c.key]!.result)), reason: checks.filter(c => marks[c.key]!.reason).map(c => `check ${c.number}: ${marks[c.key]!.reason}`).join('; ') });
  }
  return out;
}

const GATES: Array<[GateKey, string]> = [['requirements', 'Requirements'], ['tasks', 'Tasks'], ['automated', 'Automated'], ['acceptance', 'Acceptance'], ['reviews', 'Reviews']];
export function gateFromModel(model: OverviewModel, featureId: string): AcceptData {
  const t = model.tickets[featureId];
  const neighbours = Object.values(model.tickets).filter(n => t?.links.includes(n.id) || n.links.includes(featureId));
  const lamps = GATES.map(([key, label]): GateLamp => {
    const items = neighbours.filter(n => n.kind === (key === 'requirements' ? 'req' : key === 'tasks' ? 'task' : key === 'automated' || key === 'acceptance' ? 'test' : ''));
    return { key, label, known: false, total: items.length, done: items.filter(n => n.state === 'closed').length,
      missing: [`${label}: the model has links and statuses, not the complete evidence`, ...items.filter(n => n.state !== 'closed').map(n => `${n.id}: ${n.title}`)] };
  });
  return { id: featureId, title: t?.title ?? featureId, status: t?.status ?? '', canWrite: false, lamps, acceptanceRequested: false };
}

/** S7 enriches the model with per-feature criteria, note fields and the union ledger.
 * Global obligation badges are never evidence that a particular feature passed.
 * Command test results are not exposed by these APIs; they remain unknown.
 */
export function acceptFromPayloads(model: OverviewModel, featureId: string, payload: { note: unknown; criteria: unknown; acceptance: unknown; obligations: unknown; tests: unknown[] }, canWrite = false): AcceptData {
  const data = gateFromModel(model, featureId), note = obj(payload.note), fm = obj(note['frontmatter']);
  if (str(fm['id']) !== featureId) throw new Error('the feature evidence names a different note');
  data.title = str(note['title']) || data.title; data.status = str(fm['status']); data.canWrite = canWrite;
  data.acceptanceRequested = fm['acceptance'] === 'requested';
  if (typeof note['mtime'] === 'number') data.mtime = note['mtime'];
  const set = (key: GateKey, known: boolean, done: number, total: number, missing: string[]): void => {
    const lamp = data.lamps.find(l => l.key === key)!; Object.assign(lamp, { known, done, total, missing });
  };
  const criteria = obj(payload.criteria);
  if (criteria['id'] === featureId && Array.isArray(criteria['requirements']) && !criteria['error']) {
    const requirements = arr(criteria['requirements']).map(obj);
    const items: Array<Record<string, unknown>> = requirements.flatMap(r => arr(r['criteria']).map(c => ({ ...obj(c), requirement: str(r['id']) })));
    const missing = items.filter(c => c['state'] !== 'ticked' && c['state'] !== 'reconciled').map(c => `${c.requirement}: ${str(c['text'])}`);
    const empty = requirements.filter(r => arr(r['criteria']).length === 0).map(r => `${str(r['id'])}: no criteria recorded`);
    set('requirements', empty.length === 0, items.length - missing.length, items.length, [...missing, ...empty]);
  }
  const taskIds = linkIds(fm['tasks']);
  if (Array.isArray(fm['tasks'])) {
    const missing = taskIds.filter(id => model.tickets[id]?.status !== 'done').map(id => `${id}: ${model.tickets[id]?.status ?? 'not in the model'}`);
    set('tasks', taskIds.every(id => !!model.tickets[id]), taskIds.length - missing.length, taskIds.length, missing);
  }
  const suite = obj(payload.acceptance), obligations = obj(payload.obligations);
  const scope = new Set([featureId, ...linkIds(fm['requirements']), ...taskIds]);
  if (suite['schema_version'] === 4 && suite['exists'] === true && Array.isArray(suite['tiers']) && suite['platform'] === '') {
    const tiers = arr(suite['tiers']).map(obj);
    const valid = tiers.every(t => typeof t['manual'] === 'boolean' && Array.isArray(t['items']));
    const checks = tiers.flatMap(t => arr(t['items']).map(c => ({ ...obj(c), manual: t['manual'] }) as Record<string, unknown>)).filter(c => strings(c['refs']).some(id => scope.has(id)));
    const manual = checks.filter(c => c['manual'] === true);
    const missing = manual.filter(c => resultFrom(c['mark']) !== 'pass' || c['stale'] !== false).map(c => `${str(c['id'])}: ${str(c['name'])} (${c['stale'] ? 'stale' : str(c['mark']) || 'not run'})`);
    set('acceptance', valid && manual.length > 0, manual.length - missing.length, manual.length, manual.length ? missing : ['no acceptance checks name this feature']);
    // automation describes coverage, not who ran it. Only the ledger's method is evidence of an automated run.
    const auto = checks.filter(c => c['manual'] === false);
    const standings = arr(obj(suite['view'])['tiers']).flatMap(t => arr(obj(t)['areas']).flatMap(a => arr(obj(a)['items']).map(obj)));
    const recorded = (c: Record<string, unknown>): boolean => standings.some(r => r['id'] === c['id'] && r['verdict_method'] === 'automated' && !!str(r['verdict_date']) && r['mark'] === c['mark'] && r['stale'] === false);
    const commands = payload.tests.map(p => obj(obj(p)['frontmatter'])).filter(f => str(f['command']));
    const autoMissing = auto.filter(c => !recorded(c) || resultFrom(c['mark']) !== 'pass' || c['stale'] !== false).map(c => `${str(c['id'])}: ${recorded(c) ? str(c['mark']) : 'no recorded automated run'}`);
    const unrecorded = commands.filter(f => !auto.some(c => c['id'] === f['id'])).map(f => `${str(f['id'])}: command result is not exposed by the sidecar`);
    set('automated', valid && unrecorded.length === 0 && auto.length > 0 && auto.every(recorded), auto.length - autoMissing.length, auto.length + unrecorded.length, [...autoMissing, ...unrecorded, ...(auto.length || unrecorded.length ? [] : ['no automated results recorded'])]);
  }
  // This endpoint carries aggregate badges only. A malformed read cannot certify a gate.
  if (typeof obligations['total'] !== 'number' || !('views' in obligations)) data.lamps.forEach(l => { l.known = false; l.missing.push('the obligations payload could not be read'); });
  const reviewers = Array.isArray(fm['reviewed_by']) ? strings(fm['reviewed_by']) : str(fm['reviewed_by']) ? [str(fm['reviewed_by'])] : [];
  const human = reviewers.some(r => r.startsWith('user:'));
  const reviewTotal = human ? 1 : 2;
  const approved = fm['review_verdict'] === 'approved' && !!str(fm['review_date']) && !!String(fm['review_round'] ?? '');
  set('reviews', true, approved ? Math.min(reviewTotal, reviewers.length) : 0, reviewTotal,
    approved && reviewers.length >= reviewTotal ? [] : [`independent review: ${str(fm['review_verdict']) || 'no verdict'}, ${reviewers.length} reviewers recorded`]);
  return data;
}
export const lampComplete = (l: GateLamp): boolean => l.known && Number.isSafeInteger(l.total) && l.total >= 0 && l.done === l.total && l.missing.length === 0;
export const gateReady = (d: AcceptData): boolean => GATES.every(([key]) => d.lamps.filter(l => l.key === key).length === 1 && lampComplete(d.lamps.find(l => l.key === key)!));

function control(nodes: SceneNode[], list: ListRow[], action: string, label: string, x: number, y: number, enabled: boolean, tone = '', width = 200): void {
  nodes.push({ kind: 'mark', tag: 'rect', attrs: { x, y, width, height: 64, rx: 32 }, cls: `ov-control ${tone}${enabled ? '' : ' ov-off'}`, glow: enabled, label: enabled ? label : `${label}: unavailable` });
  nodes.push({ kind: 'text', x: x + width / 2, y: y + 40, text: label, rest: true, role: 'control', anchor: 'middle', size: 22 });
  // A transparent hit surface over the label means clicking its letters works too.
  nodes.push({ kind: 'mark', tag: 'rect', attrs: { x, y, width, height: 64, rx: 32 }, cls: `ov-hit${enabled ? '' : ' ov-off'}`, action, label: enabled ? label : `${label}: unavailable` });
  list.push({ id: action, label: enabled ? label : `${label}: unavailable`, group: 'Controls', action });
}
function base(screen: Scene['screen'], id: string, title: string, ctx: ScreenContext, parts: { step?: string; note?: string }): Scene {
  const back = backControl(ctx, id ? { page: 'ticket', note: id } : { page: 'wheel' }, id ? `Back to ${id}` : 'Back to the wheel');
  return { screen, width: 1440, height: 1000, address: ctx.address({ flow: screen, ...parts }), title, nodes: [back.node, ...heading(id, words(title, 7))], list: [back.row] };
}

export function designScene(_model: OverviewModel, data: DesignFlowData, ctx: ScreenContext): Scene {
  const scene = base('design', data.id, data.title, ctx, { note: data.id }), { nodes, list } = scene;
  const selected = Math.min(Math.max(0, data.selected ?? 0), Math.max(0, data.plates.length - 1));
  const enabled = data.canWrite && data.status === 'proposed';
  nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: 1340, cy: 58, r: 17 }, ticket: data.id, state: data.status === 'accepted' ? 'closed' : data.status === 'cancelled' ? 'dropped' : 'open', glow: enabled, label: `${data.id}: ${data.status}` });
  list.push({ id: data.id, label: `${data.title}: ${data.status}`, group: 'Design', target: ctx.address({ page: 'ticket', note: data.id }) });
  nodes.push({ kind: 'mark', tag: 'rect', attrs: { x: 230, y: 145, width: 980, height: 590, rx: 14 }, cls: 'ov-glass' });
  if (!data.plates.length) nodes.push({ kind: 'text', x: 720, y: 440, text: 'nothing to look at', rest: true, role: 'label', anchor: 'middle', size: 28, cls: 'ov-dim' });
  const order = data.plates.map((_, i) => i).filter(i => i !== selected).reverse().concat(data.plates.length ? [selected] : []);
  order.forEach((i, depth) => {
    const top = i === selected, offset = top ? 0 : 14 + (depth % 5) * 12;
    const plate = data.plates[i]!;
    nodes.push({ kind: 'group', key: `plate-${i}`, transform: top ? undefined : `rotate(${(depth % 2 ? -1 : 1) * (2 + depth % 4)} 720 440)`, cls: top ? '' : 'ov-faint', children: [
      { kind: 'mark', tag: 'rect', attrs: { x: 260 + offset, y: 170 - offset / 2, width: 920, height: 540, rx: 8 }, cls: 'ov-glass' },
      { kind: 'image', href: plate.href, label: plate.label, x: 270 + offset, y: 180 - offset / 2, w: 900, h: 520 },
    ] });
  });
  data.plates.forEach((p, i) => {
    const action = `plate:${i}`;
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: 720 + (i - (data.plates.length - 1) / 2) * 24, cy: 758, r: i === selected ? 7 : 4 }, cls: 'ov-glass', glow: i === selected, action, label: p.label });
    list.push({ id: action, action, label: p.label, group: 'Plates' });
  });
  nodes.push({ kind: 'mark', tag: 'line', attrs: { x1: 400, y1: 810, x2: 1040, y2: 810 }, cls: 'ov-wire', markId: 'revisions', count: data.revisions.length, label: `${data.revisions.length} revisions` });
  data.revisions.forEach((r, i) => {
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: 420 + i * 600 / Math.max(1, data.revisions.length - 1), cy: 810, r: 6 }, state: 'progress', label: r.label });
    list.push({ id: `revision-${i}`, label: r.label, group: 'Revisions' });
  });
  data.comments.forEach((c, i) => {
    const x = 290 + (i % 8) * 106, y = 205 + Math.floor(i / 8) * 32;
    if (c.plate === selected) nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: x, cy: y, r: 9 }, state: c.answered ? 'closed' : 'owed', glow: !c.answered, label: c.text, action: `plate:${Math.min(c.plate, Math.max(0, data.plates.length - 1))}` });
    list.push({ id: `comment-${i}`, label: `${c.answered ? 'Answered' : 'Open'}: ${c.text}`, group: 'Review', action: `plate:${Math.min(c.plate, Math.max(0, data.plates.length - 1))}` });
  });
  control(nodes, list, 'decide:accept', 'Accept', 480, 880, enabled, 'ov-go');
  control(nodes, list, 'decide:decline', 'Decline', 760, 880, enabled, 'ov-stop');
  return scene;
}

export function testRunScene(_model: OverviewModel, data: TestRunData, ctx: ScreenContext): Scene {
  const scene = base('test-run', '', 'Release test', ctx, { ...(data.release ? { note: data.release } : {}), step: data.step }), { nodes, list } = scene;
  const open = data.platforms.flatMap(p => p.sections.flatMap(s => s.checks.map(c => ({ p, s, c })))).find(v => v.c.key === data.open);
  const cx = open ? 340 : 720, cy = open ? 440 : 500, outer = open ? 235 : 340;
  data.platforms.forEach((p, pi) => {
    const r = outer - pi * Math.min(50, outer / Math.max(2, data.platforms.length));
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx, cy, r }, cls: 'ov-arc ov-track', label: p.error || p.id, target: ctx.address({ flow: 'test-run', note: data.release, step: p.id }) });
    nodes.push({ kind: 'text', x: cx, y: cy - r - 12, text: p.id, rest: true, role: 'name', anchor: 'middle', cls: 'ov-dim', size: 13 });
    list.push({ id: `platform-${p.id}`, label: p.error || p.id, group: 'Platforms', target: ctx.address({ flow: 'test-run', note: data.release, step: p.id }) });
    const total = p.sections.reduce((n, s) => n + s.checks.length, 0);
    let at = 0, done = 0;
    p.sections.forEach(s => {
      const span = TAU * s.checks.length / Math.max(1, total), start = at;
      const target = ctx.address({ flow: 'test-run', note: data.release, step: `${p.id}.${s.number}` });
      nodes.push({ kind: 'group', key: `${p.id}-${s.number}`, target, label: s.name, children: [
        { kind: 'mark', tag: 'path', attrs: { d: annularSector(cx, cy, r - 10, r - 4, start + .007, start + Math.max(.008, span - .007)) }, cls: data.step === `${p.id}.${s.number}` ? 'ov-glass' : 'ov-track' },
      ] });
      list.push({ id: `section-${p.id}-${s.number}`, label: s.name, group: p.id, target });
      s.checks.forEach((c, ci) => {
        const angle = start + span * (ci + .5) / Math.max(1, s.checks.length), [x, y] = polar(cx, cy, r, angle);
        const state = resultState(c.result), action = `check:${c.key}`;
        if (!c.preparation && c.result !== 'not-run' && c.result !== 'rerun' && c.result !== 'unknown') done++;
        nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: x, cy: y, r: Math.max(1.2, Math.min(5, TAU * r / Math.max(1, total) * .38)) }, ticket: c.tickets[0], state, action, glow: c.result === 'fail' || c.result === 'question' || c.key === data.open, label: `${p.id} · ${s.name} · ${c.number}: ${c.action} — ${c.result}${c.reason ? `: ${c.reason}` : ''}` });
        list.push({ id: c.tickets[0] ?? `check-${c.key}`, label: `${c.number}. ${c.action} — ${c.result}. ${c.expected}`, group: `${p.id}: ${s.name}`, action, state });
      });
      at += span;
    });
    const tally = p.sections.flatMap(s => s.checks).filter(c => !c.preparation).length, pr = 60 + pi * 15;
    const label = `${p.id}: ${done} of ${tally} results`, y = cy + 110 + pi * 22;
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx, cy, r: pr }, cls: 'ov-arc ov-track', markId: `progress-${p.id}-total`, count: tally, label });
    nodes.push({ kind: 'mark', tag: 'path', attrs: { d: arc(cx, cy, pr, 0, TAU * done / Math.max(1, tally)), 'stroke-width': 5 }, cls: 'ov-arc', state: 'closed', markId: `progress-${p.id}-done`, count: done, label });
    nodes.push({ kind: 'text', x: cx - 6, y, text: String(done), rest: true, role: 'number', markRef: `progress-${p.id}-done`, anchor: 'end', size: 14 });
    nodes.push({ kind: 'text', x: cx, y, text: '/', rest: true, role: 'label', anchor: 'middle', size: 14 });
    nodes.push({ kind: 'text', x: cx + 6, y, text: String(tally), rest: true, role: 'number', markRef: `progress-${p.id}-total`, anchor: 'start', size: 14 });
  });
  nodes.push({ kind: 'text', x: cx, y: cy + 5, text: data.release ?? 'No release', role: data.release ? 'id' : 'label', rest: true, anchor: 'middle', size: 18 });
  if (open) {
    const { c, p } = open;
    nodes.push({ kind: 'text', x: 990, y: 175, text: words(c.action, 12), role: 'name', rest: true, anchor: 'middle', size: 17 });
    for (const [i, picture] of [c.before, c.after].entries()) {
      const x = 630 + i * 375;
      nodes.push({ kind: 'mark', tag: 'rect', attrs: { x, y: 205, width: 350, height: 470, rx: 12 }, cls: 'ov-glass' });
      nodes.push({ kind: 'text', x: x + 175, y: 705, text: i === 0 ? 'Before' : 'After', role: 'label', rest: true, anchor: 'middle', size: 15 });
      if (picture) nodes.push({ kind: 'image', href: picture.href, label: picture.label, x: x + 8, y: 213, w: 334, h: 454 });
      else nodes.push({ kind: 'text', x: x + 175, y: 440, text: 'No capture', role: 'label', rest: true, anchor: 'middle', cls: 'ov-dim' });
    }
    nodes.push({ kind: 'text', x: 990, y: 755, text: words(c.expected, 13), role: 'name', rest: true, anchor: 'middle', size: 15 });
    // Full instructions stay reachable, even when the visible line is shortened.
    nodes.push({ kind: 'mark', tag: 'rect', attrs: { x: 620, y: 135, width: 760, height: 55 }, cls: 'ov-hit', label: `${c.action}\nExpected: ${c.expected}`, action: `check:${c.key}` });
    const enabled = data.canWrite && !!data.release && !p.error && !c.preparation;
    control(nodes, list, 'mark:pass', 'Pass', 650, 810, enabled, 'ov-go', 180);
    control(nodes, list, 'mark:fail', 'Fail', 865, 810, enabled, 'ov-stop', 180);
    control(nodes, list, 'mark:more', 'More', 1080, 810, enabled, '', 180);
    if (data.more) RESULTS.slice(2).forEach((r, i) => control(nodes, list, `mark:${r}`, ({ partial: 'Partial', question: 'Question', blocked: 'Blocked', na: 'N/A', excused: 'Excused' } as Record<string,string>)[r]!, 630 + i * 148, 905, enabled, '', 140));
  }
  return scene;
}

export function gateNodes(data: AcceptData, x: number, y: number, scale: number): SceneNode[] {
  const nodes: SceneNode[] = [{ kind: 'mark', tag: 'line', attrs: { x1: x, y1: y, x2: x + 960 * scale, y2: y }, cls: 'ov-wire' }];
  data.lamps.forEach((lamp, i) => {
    const cx = x + i * 240 * scale, r = 72 * scale, complete = lampComplete(lamp), markId = `gate-${data.id}-${lamp.key}`;
    const label = `${lamp.label}: ${lamp.known ? `${lamp.done} of ${lamp.total}` : 'unknown'}${lamp.missing.length ? ` · ${lamp.missing.join('; ')}` : ''}`;
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx, cy: y, r }, cls: 'ov-glass', markId, count: lamp.total, label });
    const total = Math.max(0, Math.min(5000, lamp.total));
    for (let b = 0; b < total; b++) {
      const [bx, by] = polar(cx, y, r, TAU * b / Math.max(1, total));
      nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: bx, cy: by, r: Math.max(.6, Math.min(5 * scale, TAU * r / Math.max(1, total) * .35)) }, state: lamp.known && b < lamp.done ? 'closed' : 'open', label });
    }
    nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx, cy: y, r: 22 * scale, tabindex: 0, role: 'img' }, state: complete ? 'closed' : lamp.known ? 'open' : 'owed', cls: complete ? '' : 'ov-faint', glow: complete, label });
    nodes.push({ kind: 'text', x: cx, y: y + 112 * scale, text: lamp.label, role: 'label', rest: true, anchor: 'middle', size: 16 * scale });
    if (lamp.known) {
      nodes.push({ kind: 'mark', tag: 'path', attrs: { d: arc(cx, y, r + 10 * scale, 0, TAU * lamp.done / Math.max(1, lamp.total)), 'stroke-width': 3 * scale }, cls: 'ov-arc', state: 'closed', markId: `${markId}-done`, count: lamp.done, label });
      nodes.push({ kind: 'text', x: cx - 8 * scale, y: y + 142 * scale, text: String(lamp.done), role: 'number', markRef: `${markId}-done`, rest: true, anchor: 'end', size: 18 * scale });
      nodes.push({ kind: 'text', x: cx, y: y + 142 * scale, text: '/', role: 'label', rest: true, anchor: 'middle', size: 18 * scale });
      nodes.push({ kind: 'text', x: cx + 8 * scale, y: y + 142 * scale, text: String(lamp.total), role: 'number', markRef: markId, rest: true, anchor: 'start', size: 18 * scale });
    } else nodes.push({ kind: 'text', x: cx, y: y + 142 * scale, text: '?', role: 'label', rest: true, anchor: 'middle', size: 18 * scale });
  });
  return nodes;
}

export function acceptScene(model: OverviewModel, data: AcceptData, ctx: ScreenContext): Scene {
  const scene = base('accept', data.id, data.title, ctx, { note: data.id }), { nodes, list } = scene;
  nodes.push({ kind: 'mark', tag: 'polygon', attrs: { points: '720,225 757,246 757,288 720,309 683,288 683,246' }, ticket: data.id, state: model.tickets[data.id]?.state ?? 'open', glow: true, label: `${data.id}: ${data.status}` });
  list.push({ id: data.id, label: `${data.title}: ${data.status}`, group: 'Feature', target: ctx.address({ page: 'ticket', note: data.id }) });
  nodes.push(...gateNodes(data, 240, 490, 1));
  for (const l of data.lamps) list.push({ id: `gate-${l.key}`, label: `${l.label}: ${l.known ? `${l.done}/${l.total}` : 'unknown'}. ${l.missing.join('; ')}`, group: 'Evidence' });
  if (gateReady(data)) control(nodes, list, 'accept:accept', 'Accept', 480, 820, data.canWrite && data.status === 'review', 'ov-go');
  control(nodes, list, 'accept:back', 'Send back', gateReady(data) ? 760 : 620, 820, data.canWrite, 'ov-stop');
  return scene;
}
