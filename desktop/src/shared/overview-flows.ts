/** S5–S7: recorded evidence as pictures. No I/O, DOM, or verdict is made here. */
import { backControl, heading, words } from './overview-chrome.js';
import { annularSector, arc, polar, TAU } from './overview-geometry.js';
import type { ListRow, Scene, SceneNode, ScreenContext } from './overview-scene.js';
import { cockpitSquare, markWords, TYPE_COLOUR, FIELD, NEEDS_YOU } from './overview-marks.js';
import { cockpitMarks } from './overview-status.js';
import { resultMark, RESULT_MARK } from './overview-results.js';
import type { NoteRecord } from './records.js';
import { PALETTE, walkScene } from './overview-scene.js';
import type { OverviewModel, Ticket, NoteType } from './overview-types.js';

export interface FlowImage { href: string; label: string }
export interface DesignFlowData {
  id: string; title: string; status: string; canWrite: boolean; mtime?: number;
  plates: FlowImage[]; selected?: number;
  revisions: Array<{ label: string }>;
  comments: Array<{ text: string; answered: boolean; plate: number }>;
}
export const RESULTS = ['pass', 'fail', 'partial', 'question', 'blocked', 'na', 'excused'] as const;
export type CheckResult = typeof RESULTS[number] | 'canceled' | 'not-run' | 'rerun' | 'unknown';
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
export interface GateItem {
  id: string; label: string;
  /** Evidence for this item, independent of its ticket's lifecycle state. */
  complete?: boolean; result?: CheckResult;
  ticket?: Pick<Ticket, 'id' | 'type' | 'fill' | 'needsYou' | 'title' | 'status'>;
}
export interface GateLamp {
  key: GateKey; label: string; known: boolean; done: number; total: number; missing: string[]; items?: GateItem[];
}
export interface AcceptData {
  id: string; title: string; status: string; canWrite: boolean; lamps: GateLamp[];
  acceptanceRequested: boolean; transitions: string[]; mtime?: number;
}
export const FEATURE_TRANSITION_UNAVAILABLE = 'the cockpit does not yet move a feature out of review';
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

const RANK: Record<string, number> = { na: 0, canceled: 0, pass: 1, excused: 2, partial: 3, blocked: 4, fail: 5, question: 6, rerun: 7, unknown: 8, 'not-run': 9 };
export function resultFrom(value: unknown): CheckResult {
  const valueText = str(value);
  // The current acceptance route normalises characters; retain older payloads too.
  // Match characters exactly: whitespace around an x must not certify a pass.
  const aliases: Record<string, CheckResult> = { done: 'pass', passed: 'pass', failed: 'fail', important: 'fail', incomplete: 'partial', canceled: 'canceled', todo: 'not-run', 'not-run': 'not-run', rerun: 'rerun', 'needs-re-run': 'rerun', '': 'not-run', ' ': 'not-run', x: 'pass', X: 'pass', '/': 'partial', '~': 'partial', '-': 'canceled', '!': 'fail', F: 'fail', '?': 'question' };
  return (RESULTS as readonly string[]).includes(valueText) ? valueText as CheckResult : Object.hasOwn(aliases, valueText) ? aliases[valueText]! : 'unknown';
}
export const worstResult = (values: CheckResult[]): CheckResult => values.reduce((a, b) => (RANK[b] ?? 8) > (RANK[a] ?? 8) ? b : a, values[0] ?? 'not-run');

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
        const key = JSON.stringify([release, platform, slug, tags, action, tickets, expected, check['preparation'] === true]);
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

const GATES: Array<[GateKey, string]> = [['requirements', 'Requirements'], ['tasks', 'Tasks'], ['reviews', 'Reviews'], ['automated', 'Automated tests'], ['acceptance', 'Acceptance tests']];
function gateItem(model: OverviewModel, id: string, label: string, complete?: boolean, result?: CheckResult): GateItem {
  const t = model.tickets[id];
  return { id, label, ...(complete === undefined ? {} : { complete }), ...(result === undefined ? {} : { result }), ...(t ? { ticket: { id: t.id, title: t.title, status: t.status, type: t.type, fill: t.fill, needsYou: t.needsYou } } : {}) };
}
export function gateFromModel(model: OverviewModel, featureId: string): AcceptData {
  const t = model.tickets[featureId];
  const neighbours = Object.values(model.tickets).filter(n => t?.links.includes(n.id) || n.links.includes(featureId));
  const lamps = GATES.map(([key, label]): GateLamp => {
    const items = neighbours.filter(n => n.kind === (key === 'requirements' ? 'req' : key === 'tasks' ? 'task' : key === 'automated' || key === 'acceptance' ? 'test' : ''));
    return { key, label, known: false, items: items.map(n => gateItem(model, n.id, n.title)), total: items.length, done: items.filter(n => n.state === 'closed').length,
      missing: [`${label}: the model has links and statuses, not the complete evidence`, ...items.filter(n => n.state !== 'closed').map(n => `${n.id}: ${n.title}`)] };
  });
  return { id: featureId, title: t?.title ?? featureId, status: t?.status ?? '', canWrite: false, lamps, acceptanceRequested: false, transitions: [] };
}

/** S7 enriches the model with per-feature criteria, note fields and the union ledger.
 * Global obligation badges are never evidence that a particular feature passed.
 * Command test results are not exposed by these APIs; they remain unknown.
 */
export function acceptFromPayloads(model: OverviewModel, featureId: string, payload: { note: unknown; criteria: unknown; acceptance: unknown; obligations: unknown; tests: unknown[]; actions?: unknown }, canWrite = false): AcceptData {
  const data = gateFromModel(model, featureId), note = obj(payload.note), fm = obj(note['frontmatter']);
  if (str(fm['id']) !== featureId) throw new Error('the feature evidence names a different note');
  data.title = str(note['title']) || data.title; data.status = str(fm['status']); data.canWrite = canWrite;
  data.acceptanceRequested = fm['acceptance'] === 'requested';
  data.transitions = arr(obj(payload.actions)['actions']).map(obj)
    .filter(a => a['disabled'] === false && (!a['endpoint'] || a['endpoint'] === '/api/notes/transition'))
    .map(a => str(a['to'])).filter(to => to === 'done' || to === 'doing');
  if (typeof note['mtime'] === 'number') data.mtime = note['mtime'];
  const set = (key: GateKey, known: boolean, done: number, total: number, missing: string[], items: GateItem[]): void => {
    if (!known && !missing.length) missing = [`${key}: the evidence payload is incomplete or unreadable`];
    const lamp = data.lamps.find(l => l.key === key)!; Object.assign(lamp, { known, done, total, missing, items });
  };
  const criteria = obj(payload.criteria);
  if (criteria['id'] === featureId && Array.isArray(criteria['requirements']) && !criteria['error']) {
    const requirements = arr(criteria['requirements']).map(obj);
    const items: Array<Record<string, unknown>> = requirements.flatMap(r => arr(r['criteria']).map(c => ({ ...obj(c), requirement: str(r['id']) })));
    const missing = items.filter(c => c['state'] !== 'ticked' && c['state'] !== 'reconciled').map(c => `${c.requirement}: ${str(c['text'])}`);
    const empty = requirements.filter(r => arr(r['criteria']).length === 0).map(r => `${str(r['id'])}: no criteria recorded`);
    set('requirements', empty.length === 0, items.length - missing.length, items.length, [...missing, ...empty], items.map(c => gateItem(model, str(c['requirement']), `${str(c['text'])} (${str(c['state']) || 'open'})`, c['state'] === 'ticked' || c['state'] === 'reconciled')));
  }
  const taskIds = linkIds(fm['tasks']);
  if (Array.isArray(fm['tasks'])) {
    const missing = taskIds.filter(id => model.tickets[id]?.status !== 'done').map(id => `${id}: ${model.tickets[id]?.status ?? 'not in the model'}`);
    set('tasks', taskIds.every(id => !!model.tickets[id]), taskIds.length - missing.length, taskIds.length, missing, taskIds.map(id => gateItem(model, id, model.tickets[id]?.title ?? id, model.tickets[id]?.status === 'done')));
  }
  const suite = obj(payload.acceptance), obligations = obj(payload.obligations);
  const scope = new Set([featureId, ...linkIds(fm['requirements']), ...taskIds]);
  if (suite['schema_version'] === 4 && suite['exists'] === true && Array.isArray(suite['tiers']) && suite['platform'] === '') {
    const tiers = arr(suite['tiers']).map(obj);
    const valid = tiers.every(t => typeof t['manual'] === 'boolean' && Array.isArray(t['items']));
    const checks = tiers.flatMap(t => arr(t['items']).map(c => ({ ...obj(c), manual: t['manual'] }) as Record<string, unknown>)).filter(c => strings(c['refs']).some(id => scope.has(id)));
    const manual = checks.filter(c => c['manual'] === true);
    const missing = manual.filter(c => resultFrom(c['mark']) !== 'pass' || c['stale'] !== false).map(c => `${str(c['id'])}: ${str(c['name'])} (${c['stale'] ? 'stale' : str(c['mark']) || 'not run'})`);
    const resultItem = (c: Record<string, unknown>, recorded = true): GateItem => gateItem(model, str(c['id']), `${str(c['name'])}${c['stale'] ? ' (stale)' : ''}`, recorded && resultFrom(c['mark']) === 'pass' && c['stale'] === false, recorded ? resultFrom(c['mark']) : undefined);
    set('acceptance', valid && manual.length > 0, manual.length - missing.length, manual.length, manual.length ? missing : ['no acceptance checks name this feature'], manual.map(c => resultItem(c)));
    // automation describes coverage, not who ran it. Only the ledger's method is evidence of an automated run.
    const auto = checks.filter(c => c['manual'] === false);
    const standings = arr(obj(suite['view'])['tiers']).flatMap(t => arr(obj(t)['areas']).flatMap(a => arr(obj(a)['items']).map(obj)));
    const recorded = (c: Record<string, unknown>): boolean => standings.some(r => r['id'] === c['id'] && r['verdict_method'] === 'automated' && !!str(r['verdict_date']) && r['mark'] === c['mark'] && r['stale'] === false);
    const commands = payload.tests.map(p => obj(obj(p)['frontmatter'])).filter(f => str(f['command']));
    const autoMissing = auto.filter(c => !recorded(c) || resultFrom(c['mark']) !== 'pass' || c['stale'] !== false).map(c => `${str(c['id'])}: ${recorded(c) ? str(c['mark']) : 'no recorded automated run'}`);
    const unrecorded = commands.filter(f => !auto.some(c => c['id'] === f['id'])).map(f => `${str(f['id'])}: command result is not exposed by the sidecar`);
    set('automated', valid && unrecorded.length === 0 && auto.length > 0 && auto.every(recorded), auto.length - autoMissing.length, auto.length + unrecorded.length, [...autoMissing, ...unrecorded, ...(auto.length || unrecorded.length ? [] : ['no automated results recorded'])], [...auto.map(c => resultItem(c, recorded(c))), ...commands.filter(f => !auto.some(c => c['id'] === f['id'])).map(f => gateItem(model, str(f['id']), 'command result not reported'))]);
  }
  // Both scalar and list frontmatter can name several reviewers, including two of the same model.
  const reviewers = (Array.isArray(fm['reviewed_by']) ? strings(fm['reviewed_by']) : [str(fm['reviewed_by'])])
    .flatMap(value => value.match(/\b(?:user|model):[\w.-]+/g) ?? []);
  const human = reviewers.some(r => r.startsWith('user:'));
  const reviewTotal = human ? 1 : 2;
  const approved = fm['review_verdict'] === 'approved' && !!str(fm['review_date']) && !!String(fm['review_round'] ?? '');
  set('reviews', true, approved ? Math.min(reviewTotal, reviewers.length) : 0, reviewTotal,
    approved && reviewers.length >= reviewTotal ? [] : [`independent review: ${str(fm['review_verdict']) || 'no verdict'}, ${reviewers.length} reviewers recorded`], Array.from({ length: reviewTotal }, (_, i) => ({ id: `review-${i}`, label: reviewers[i] ?? 'Reviewer not recorded', complete: approved && i < reviewers.length })));
  // This endpoint carries aggregate badges only. A malformed read cannot certify a gate.
  if (typeof obligations['total'] !== 'number' || !('views' in obligations)) data.lamps.forEach(l => { l.known = false; l.missing.push('the obligations payload could not be read'); });
  return data;
}
export const lampEmpty = (l: GateLamp): boolean => l.known && l.total === 0 && l.done === 0 && l.missing.length === 0;
export const lampComplete = (l: GateLamp): boolean => l.known && Number.isSafeInteger(l.total) && l.total > 0 && l.done === l.total && l.missing.length === 0;
export const gateReady = (d: AcceptData): boolean => d.lamps.length === GATES.length && d.lamps.some(lampComplete)
  && GATES.every(([key]) => d.lamps.filter(l => l.key === key).length === 1 && (lampComplete(d.lamps.find(l => l.key === key)!) || lampEmpty(d.lamps.find(l => l.key === key)!)));
function lampLabel(l: GateLamp): string {
  if (lampEmpty(l)) return `${l.label}: nothing to check — no ${l.label.toLowerCase()} items recorded`;
  const details = l.missing.length ? l.missing.join('; ') : l.known ? 'all recorded items complete' : 'no readable evidence is available';
  return `${l.label}: ${l.known ? `${l.done} of ${l.total}` : 'not reported'} · ${details}`;
}

function control(nodes: SceneNode[], list: ListRow[], action: string, label: string, x: number, y: number, enabled: boolean, tone = '', width = 200, unavailable = 'unavailable'): void {
  const description = enabled ? label : `${label}: ${unavailable}`;
  nodes.push({ kind: 'mark', tag: 'rect', attrs: { x, y, width, height: 64, rx: 32 }, cls: `ov-control ${tone}${enabled ? '' : ' ov-off'}`, glow: enabled, label: description });
  nodes.push({ kind: 'text', x: x + width / 2, y: y + 40, text: label, rest: true, role: 'control', anchor: 'middle', size: 22 });
  // A transparent hit surface over the label means clicking its letters works too.
  nodes.push({ kind: 'mark', tag: 'rect', attrs: { x, y, width, height: 64, rx: 32 }, cls: `ov-hit${enabled ? '' : ' ov-off'}`, action, label: description });
  list.push({ id: action, label: description, group: 'Controls', action });
}
function base(screen: Scene['screen'], id: string, title: string, ctx: ScreenContext, parts: { step?: string; note?: string }): Scene {
  const back = backControl(ctx, id ? { page: 'ticket', note: id } : { page: 'wheel' }, id ? `Back to ${id}` : 'Back to the wheel');
  return { screen, width: 1440, height: 1000, address: ctx.address({ flow: screen, ...parts }), title, nodes: [back.node, ...heading(id, words(title, 7))], list: [back.row] };
}

function flowTicket(model: OverviewModel, id: string, title: string, status: string, type: NoteType): Pick<Ticket, 'id' | 'title' | 'status' | 'type' | 'fill' | 'needsYou'> {
  const known = model.tickets[id];
  if (known) return known;
  const record: NoteRecord = { id, title, status, types: [type], frontmatter: {}, aliases: [], relPath: '', fileName: '', mtimeMs: 0, digest: '' };
  return { id, title, status, ...cockpitMarks([], model.generated.slice(0, 10))(record, type) };
}

export function designScene(model: OverviewModel, data: DesignFlowData, ctx: ScreenContext): Scene {
  const scene = base('design', data.id, data.title, ctx, { note: data.id }), { nodes, list } = scene;
  const selected = Math.min(Math.max(0, data.selected ?? 0), Math.max(0, data.plates.length - 1));
  const enabled = data.canWrite && data.status === 'proposed';
  const ticket = flowTicket(model, data.id, data.title, data.status, 'design');
  const target = ctx.address({ page: 'ticket', note: data.id });
  nodes.push(cockpitSquare(ticket, 1340, 58, 30, { label: markWords(ticket), target }));
  list.push({ id: data.id, label: markWords(ticket), group: 'Design', target });
  nodes.push({ kind: 'mark', tag: 'rect', attrs: { x: 230, y: 145, width: 980, height: 590, rx: 14 }, cls: 'ov-glass' });
  if (!data.plates.length) nodes.push({ kind: 'text', x: 720, y: 440, text: 'nothing to look at', rest: true, role: 'label', anchor: 'middle', size: 28, cls: 'ov-dim' });
  const order = data.plates.map((_, i) => i).filter(i => i !== selected).reverse().concat(data.plates.length ? [selected] : []);
  order.forEach((i, depth) => {
    const top = i === selected, offset = top ? 0 : 14 + (depth % 5) * 12;
    const plate = data.plates[i]!;
    nodes.push({ kind: 'group', key: `plate-${i}`, transform: top ? undefined : `rotate(${(depth % 2 ? -1 : 1) * (2 + depth % 4)} 720 440)`, cls: top ? '' : 'ov-faint', children: [
      { kind: 'mark', tag: 'rect', attrs: { x: 260 + offset, y: 170 - offset / 2, width: 920, height: 540, rx: 8 }, cls: top ? 'ov-glass' : 'ov-wire' },
      ...(top ? [{ kind: 'image' as const, href: plate.href, label: plate.label, x: 270, y: 180, w: 900, h: 520 }] : []),
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
    if (c.plate === selected) nodes.push({ kind: 'mark', tag: 'circle', attrs: { cx: x, cy: y, r: 9, fill: c.answered ? PALETTE.dim : NEEDS_YOU }, cls: c.answered ? 'ov-faint' : undefined, glow: !c.answered, label: c.text, action: `plate:${Math.min(c.plate, Math.max(0, data.plates.length - 1))}` });
    list.push({ id: `comment-${i}`, label: `${c.answered ? 'Answered' : 'Open'}: ${c.text}`, group: 'Review', action: `plate:${Math.min(c.plate, Math.max(0, data.plates.length - 1))}` });
  });
  control(nodes, list, 'decide:accept', 'Accept', 480, 880, enabled, 'ov-go');
  control(nodes, list, 'decide:decline', 'Decline', 760, 880, enabled, 'ov-stop');
  return scene;
}

export function testRunScene(model: OverviewModel, data: TestRunData, ctx: ScreenContext): Scene {
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
        const action = `check:${c.key}`, result = RESULT_MARK[c.result];
        if (!c.preparation && c.result !== 'not-run' && c.result !== 'rerun' && c.result !== 'unknown') done++;
        const label = `${p.id} · ${s.name} · ${c.number}: ${c.action} — ${result.glyph} ${result.word}${c.reason ? `: ${c.reason}` : ''}`;
        nodes.push(resultMark(c.result, x, y, Math.max(1.2, Math.min(5, TAU * r / Math.max(1, total) * .38)), { action, glow: c.key === data.open, label }));
        list.push({ id: `check-${c.key}`, label: `${label}. ${c.expected}${c.tickets.length ? ` · ${c.tickets.join(', ')}` : ''}`, group: `${p.id}: ${s.name}`, action });
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
    nodes.push(resultMark(c.result, cx, cy - 35, 12, { label: RESULT_MARK[c.result].word }));
    nodes.push({ kind: 'text', x: cx, y: cy - 12, text: RESULT_MARK[c.result].word, role: 'label', rest: true, anchor: 'middle', size: 13 });
    unique(c.tickets).forEach((id, i) => {
      const ticket = model.tickets[id];
      if (!ticket) return;
      const target = ctx.address({ page: 'ticket', note: id });
      nodes.push(cockpitSquare(ticket, 110 + (i % 20) * 22, 775 + Math.floor(i / 20) * 24, 14, { label: markWords(ticket), target }));
      list.push({ id, label: markWords(ticket), group: 'Test notes', target });
    });
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

/** Five chips in one row; compact fits beneath S3's track. Each gate item is
 * retained, even when several criteria belong to the same requirement ticket.
 * Squares draw evidence, never tickets; their labels retain the ticket id.
 * Unknown evidence has neutral outlines and no fill claim or attention dot.
 */
export function gateChips(data: AcceptData, x: number, y: number, width: number, options: { compact?: boolean } = {}): { nodes: SceneNode[]; rows: ListRow[] } {
  const nodes: SceneNode[] = [], rows: ListRow[] = [];
  const gap = options.compact ? 8 : 16, chipWidth = (width - gap * 4) / 5;
  const size = options.compact ? 7 : 11, pitch = size + 5, padding = options.compact ? 8 : 14;
  const columns = Math.max(1, Math.floor((chipWidth - 2 * padding) / pitch));
  GATES.forEach(([key, word], i) => {
    const lamp = data.lamps.find(l => l.key === key);
    if (!lamp) return;
    const left = x + i * (chipWidth + gap), markId = `gate-${data.id}-${key}`;
    const label = lampLabel({ ...lamp, label: word }), empty = lampEmpty(lamp);
    const total = Math.max(0, lamp.total), rowCount = Math.ceil(total / columns);
    const top = options.compact ? 76 : 88, height = top + Math.max(1, rowCount) * pitch + padding;
    const children: SceneNode[] = [{ kind: 'mark', tag: 'rect', attrs: { x: left, y, width: chipWidth, height, rx: 9, fill: FIELD, stroke: PALETTE.dim, 'stroke-width': 1, tabindex: 0, role: 'img' }, label }];
    // Two short lines keep the compact chip legible without hiding its label.
    const labels = options.compact && word.includes(' ') ? word.split(' ') : [word];
    labels.forEach((text, line) => children.push({ kind: 'text', x: left + padding, y: y + 20 + line * 12, text, role: 'label', rest: true, size: options.compact ? 10 : 16 }));
    const baseline = y + 49, inner = Math.max(1, chipWidth - 2 * padding);
    if (empty || !lamp.known) {
      children.push({ kind: 'text', x: left + padding, y: baseline, text: empty ? 'nothing to check' : 'not reported', role: 'label', rest: true, size: options.compact ? 9 : 13, cls: 'ov-dim' });
    } else {
      children.push({ kind: 'text', x: left + padding, y: baseline, text: String(lamp.done), role: 'number', markRef: `${markId}-done`, rest: true, size: options.compact ? 12 : 19 });
      children.push({ kind: 'text', x: left + chipWidth / 2, y: baseline, text: '/', role: 'label', rest: true, anchor: 'middle', size: options.compact ? 12 : 19 });
      children.push({ kind: 'text', x: left + chipWidth - padding, y: baseline, text: String(lamp.total), role: 'number', markRef: `${markId}-total`, rest: true, anchor: 'end', size: options.compact ? 12 : 19 });
      children.push({ kind: 'mark', tag: 'rect', attrs: { x: left + padding, y: baseline + 10, width: inner, height: 4, fill: 'none', stroke: PALETTE.dim }, markId: `${markId}-total`, count: lamp.total, label });
      children.push({ kind: 'mark', tag: 'rect', attrs: { x: left + padding, y: baseline + 10, width: Math.max(1, inner * lamp.done / Math.max(1, lamp.total)), height: 4, fill: lamp.done ? PALETTE.ink : 'none', stroke: PALETTE.ink }, markId: `${markId}-done`, count: lamp.done, label });
    }
    for (let j = 0; j < total; j++) {
      const item = lamp.items?.[j], ticket = item?.ticket;
      const px = left + padding + size / 2 + (j % columns) * pitch, py = y + top + Math.floor(j / columns) * pitch;
      const complete = lamp.known && item?.complete === true;
      const verdict = !lamp.known ? 'not reported' : item?.result ? `${RESULT_MARK[item.result].word} ${RESULT_MARK[item.result].glyph}` : complete ? 'complete' : 'incomplete';
      const itemLabel = item ? `${item.id}: ${item.label} · ${verdict}` : `${word}: item ${j + 1}, identity not reported`;
      const type = ticket?.type ?? (key === 'requirements' ? 'requirement' : key === 'tasks' ? 'task' : key === 'automated' || key === 'acceptance' ? 'test' : undefined);
      const colour = lamp.known && type ? TYPE_COLOUR[type] : PALETTE.dim;
      children.push({ kind: 'group', key: `${markId}-item-${j}`, children: [{ kind: 'mark', tag: 'rect', markId: `${markId}-item-${j}`, attrs: { x: px - size / 2, y: py - size / 2, width: size, height: size, rx: 1, fill: complete ? colour : 'none', stroke: colour }, label: itemLabel }] });
    }
    nodes.push({ kind: 'group', key: markId, children });
    rows.push({ id: `gate-${key}`, label, group: 'Evidence' });
  });
  return { nodes, rows };
}

export function acceptScene(model: OverviewModel, data: AcceptData, ctx: ScreenContext): Scene {
  const scene = base('accept', data.id, data.title, ctx, { note: data.id }), { nodes, list } = scene;
  const ticket = flowTicket(model, data.id, data.title, data.status, 'feature');
  const target = ctx.address({ page: 'ticket', note: data.id });
  nodes.push(cockpitSquare(ticket, 720, 267, 64, { label: markWords(ticket), target }));
  list.push({ id: data.id, label: markWords(ticket), group: 'Feature', target });
  const gate = gateChips(data, 120, 410, 1200);
  nodes.push(...gate.nodes); list.push(...gate.rows);
  const canAccept = data.acceptanceRequested || data.transitions?.includes('done');
  const canSendBack = data.transitions?.includes('doing');
  const why = !data.canWrite ? 'this host does not write' : data.status !== 'review' ? 'this feature is not at review' : 'the feature still has missing evidence';
  control(nodes, list, 'accept:accept', 'Accept', 480, 820, data.canWrite && data.status === 'review' && gateReady(data) && !!canAccept, 'ov-go', 200, canAccept ? why : FEATURE_TRANSITION_UNAVAILABLE);
  control(nodes, list, 'accept:back', 'Send back', 760, 820, data.canWrite && data.status === 'review' && !!canSendBack, 'ov-stop', 200, canSendBack ? why : FEATURE_TRANSITION_UNAVAILABLE);
  if (data.acceptanceRequested) nodes.push({ kind: 'text', x: 720, y: 930, text: 'Records acceptance without changing status', role: 'label', rest: true, anchor: 'middle', size: 17 });
  return scene;
}
