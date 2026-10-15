/**
 * A feature's gate drawn as an arch of five segments (TASK-0154).
 *
 * Edwin, 2026-10-15: the five labelled boxes "look wrong", and he was not sure
 * what the five buckets are. The gate is drawn as what it is: an arch the
 * feature passes under once every part of it is lit. Its five segments, left
 * to right, are the five checks before a feature is accepted. Each is a gauge
 * of cells, one per item, filled when that item counts as done; past forty
 * items it fills as one band. Its count stands outside the arch and its word
 * inside. What a segment counts is said in its callout, not on the screen at
 * rest (Edwin declined subtitles).
 *
 * A check Deck cannot read is drawn as a dashed, empty segment that says "not
 * reported", and one with nothing in it says "nothing to check". Neither is
 * drawn as needing anyone (TASK-0151).
 *
 * The data is Codex's `AcceptData` (`overview-flows.ts`); only the drawing is
 * here, for S3 (small) and S7 (large).
 */
import { annularSector, arc, polar } from './overview-geometry.js';
import { TYPE_COLOUR } from './overview-marks.js';
import { RESULT_MARK } from './overview-results.js';
import type { ListRow, SceneNode } from './overview-scene.js';
import { gateReady, lampEmpty, type AcceptData, type GateKey, type GateLamp } from './overview-flows.js';

/** The order of the arch, left to right. */
export const GATE_ORDER: readonly GateKey[] = ['requirements', 'tasks', 'reviews', 'automated', 'acceptance'];

export const GATE_WORD: Readonly<Record<GateKey, string>> = {
  requirements: 'Requirements',
  tasks: 'Tasks',
  reviews: 'Reviews',
  automated: 'Automated tests',
  acceptance: 'Acceptance tests',
};

/** What each part counts, in DES-0005's words. Shown in the callout. */
export const GATE_MEANING: Readonly<Record<GateKey, string>> = {
  requirements: 'the acceptance criteria of the requirements this feature implements, each ticked with evidence',
  tasks: "the feature's tasks, each done",
  reviews: 'the independent reviews the rules require, normally two, approved and recorded',
  automated: 'the tests with a command, which the machine runs, each with a result recorded',
  acceptance: 'the manual checks a person runs, each with a pass in the release ledger',
};

/** Each part's colour: the cockpit's colour for what it counts. */
export const GATE_COLOUR: Readonly<Record<GateKey, string>> = {
  requirements: TYPE_COLOUR.requirement,
  tasks: TYPE_COLOUR.task,
  reviews: TYPE_COLOUR.design,
  automated: TYPE_COLOUR.test,
  // The cockpit's release colour: these passes live in the release ledger.
  acceptance: 'hsl(165 35% 58%)',
};

/** The arch spans from 100 degrees left of the top to 100 degrees right. */
const SPREAD = (100 / 180) * Math.PI;
const CELLS_MAX = 40;

function callout(lamp: GateLamp): string {
  const word = GATE_WORD[lamp.key];
  const meaning = GATE_MEANING[lamp.key];
  if (lampEmpty(lamp)) return `${word}: nothing to check. This part counts ${meaning}.`;
  if (!lamp.known) return `${word}: not reported, so Deck cannot say. This part counts ${meaning}.${lamp.missing.length > 0 ? ` ${lamp.missing.slice(0, 3).join('; ')}` : ''}`;
  const missing = lamp.missing.length > 0 ? ` Still missing: ${lamp.missing.slice(0, 4).join('; ')}${lamp.missing.length > 4 ? `; and ${lamp.missing.length - 4} more` : ''}.` : '';
  return `${word}: ${lamp.done} of ${lamp.total}. This part counts ${meaning}.${missing}`;
}

/**
 * The arch for one feature, centred on (cx, cy) with inner radius `r`. `small`
 * draws it for S3's header: thinner, smaller words, the same marks.
 */
export function gateArch(data: AcceptData, cx: number, cy: number, r: number, options: { small?: boolean } = {}): { nodes: SceneNode[]; rows: ListRow[] } {
  const small = options.small === true;
  const thick = r * (small ? 0.2 : 0.17);
  const gap = small ? 0.05 : 0.04;
  const span = (2 * SPREAD - gap * (GATE_ORDER.length - 1)) / GATE_ORDER.length;
  const nodes: SceneNode[] = [];
  const rows: ListRow[] = [];
  const ready = gateReady(data);
  // The keystone: the whole arch lights when every part is done.
  nodes.push({ kind: 'mark', tag: 'path', attrs: { d: arc(cx, cy, r + thick + (small ? 4 : 7), -SPREAD, SPREAD), 'stroke-width': small ? 1 : 1.5 }, cls: ready ? 'ov-arc glow' : 'ov-arc ov-track', ...(ready ? { state: 'closed' as const } : {}), label: ready ? `${data.id}'s gate is complete: it can be accepted` : `${data.id}'s gate: what is still missing before it can be accepted` });
  GATE_ORDER.forEach((key, i) => {
    const lamp = data.lamps.find((l) => l.key === key);
    if (lamp === undefined) return;
    const a0 = -SPREAD + i * (span + gap);
    const a1 = a0 + span;
    const mid = (a0 + a1) / 2;
    const colour = GATE_COLOUR[key];
    const markId = `gate-${data.id}-${key}`;
    const label = callout(lamp);
    const empty = lampEmpty(lamp);
    const children: SceneNode[] = [];
    const total = Math.max(0, Math.min(5000, Math.floor(lamp.total)));
    // The segment's track: dashed when Deck cannot read it, faint when it holds nothing.
    children.push({
      kind: 'mark',
      tag: 'path',
      attrs: { d: annularSector(cx, cy, r, r + thick, a0, a1), fill: 'none', stroke: colour, 'stroke-width': 1, 'stroke-opacity': lamp.known ? 0.55 : 0.4, ...(lamp.known ? {} : { 'stroke-dasharray': '3 4' }), tabindex: 0, role: 'img' },
      ...(lamp.known && total > 0 ? { markId: `${markId}-total`, count: total } : {}),
      label,
    });
    if (lamp.known && total > 0) {
      if (total <= CELLS_MAX) {
        // One cell per item, filled when that item counts as done.
        const cellGap = Math.min(0.012, (span / total) * 0.18);
        const cell = (span - cellGap * (total - 1)) / total;
        for (let j = 0; j < total; j += 1) {
          const item = lamp.items?.[j];
          const complete = item?.complete ?? j < lamp.done;
          const c0 = a0 + j * (cell + cellGap);
          children.push({
            kind: 'mark',
            tag: 'path',
            attrs: { d: annularSector(cx, cy, r + 2, r + thick - 2, c0, c0 + cell), fill: complete ? colour : 'none', 'fill-opacity': complete ? 0.9 : 0, stroke: colour, 'stroke-width': 0.8, 'stroke-opacity': complete ? 0.9 : 0.35 },
            markId: `${markId}-item-${j}`,
            // A check's own result, in the cockpit release page's words and glyph, where there is one.
            label: item !== undefined ? `${GATE_WORD[key]}: ${item.label.includes(item.id) ? '' : `${item.id} `}${item.label} · ${item.result !== undefined ? `${RESULT_MARK[item.result].word} ${RESULT_MARK[item.result].glyph}` : complete ? 'done' : 'not yet'}` : label,
          });
        }
      } else {
        children.push({ kind: 'mark', tag: 'path', attrs: { d: annularSector(cx, cy, r + 2, r + thick - 2, a0, a0 + (span * lamp.done) / total), fill: colour, 'fill-opacity': 0.85, stroke: 'none' }, label });
      }
      // The done share as a line along the outside, the mark the count names.
      children.push({ kind: 'mark', tag: 'path', attrs: { d: arc(cx, cy, r + thick + 2, a0, a0 + Math.max(0.0001, (span * lamp.done) / total)), 'stroke-width': small ? 2 : 3, stroke: colour, fill: 'none', 'stroke-opacity': lamp.done > 0 ? 1 : 0 }, markId: `${markId}-done`, count: lamp.done, label });
    }
    // Its count just outside the arch, and its word beyond the count, set to the side
    // the segment faces, so the words never crowd inside the arch.
    const side = Math.sin(mid);
    const anchor: 'start' | 'middle' | 'end' = Math.abs(side) < 0.35 ? 'middle' : side > 0 ? 'start' : 'end';
    const size = small ? 10 : 17;
    const [nx, ny] = polar(cx, cy, r + thick + (small ? 12 : 22), mid);
    const [wx, wy] = polar(cx, cy, r + thick + (small ? 26 : 46), mid);
    if (lamp.known && total > 0) {
      children.push({ kind: 'text', x: nx - size * 0.35, y: ny + size * 0.35, text: String(lamp.done), rest: true, role: 'number', markRef: `${markId}-done`, size, anchor: 'end' });
      children.push({ kind: 'text', x: nx, y: ny + size * 0.35, text: '/', rest: true, role: 'label', size, anchor: 'middle', cls: 'ov-dim' });
      children.push({ kind: 'text', x: nx + size * 0.35, y: ny + size * 0.35, text: String(total), rest: true, role: 'number', markRef: `${markId}-total`, size, anchor: 'start' });
    }
    // A part with no count says why, on the line under its name, where nothing else stands.
    const [lx, ly] = lamp.known && total > 0 ? [wx, wy] : polar(cx, cy, r + thick + (small ? 14 : 26), mid);
    children.push({ kind: 'text', x: lx, y: ly + (small ? 3 : 5), text: GATE_WORD[key], rest: true, role: 'label', size: small ? 9 : 14, anchor, cls: 'ov-title' });
    if (!(lamp.known && total > 0)) {
      children.push({ kind: 'text', x: lx, y: ly + (small ? 14 : 24), text: empty ? 'nothing to check' : 'not reported', rest: true, role: 'label', size: small ? 8 : 12, anchor, cls: 'ov-dim' });
    }
    nodes.push({ kind: 'group', key: markId, label, children });
    rows.push({ id: `gate-${key}`, label, group: 'Evidence' });
  });
  return { nodes, rows };
}
