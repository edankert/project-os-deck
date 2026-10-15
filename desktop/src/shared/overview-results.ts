/** Release checks are results, not tickets. Words and glyphs come from the
 * cockpit's release-test.ts RT_LABELS and renderer.ts MARK_GLYPH/MARK_CLASS;
 * colours are renderer.css acc-mark-* (TASK-0149, 2026-10-15).
 */
import type { CheckResult } from './overview-flows.js';
import type { GroupNode, MarkNode, SceneNode } from './overview-scene.js';
import { FIELD } from './overview-marks.js';

export const RESULT_MARK = {
  pass: { word: 'Pass', glyph: '[x]', colour: '#3fb950', cls: 'done' },
  fail: { word: 'Fail', glyph: '[!]', colour: '#f85149', cls: 'important' },
  partial: { word: 'Partial', glyph: '[/]', colour: '#58a6ff', cls: 'incomplete' },
  question: { word: 'Question', glyph: '[?]', colour: '#d29922', cls: 'question' },
  blocked: { word: 'Blocked', glyph: '[■]', colour: '#f85149', cls: 'important' },
  na: { word: 'N/A', glyph: '[–]', colour: '#8b949e', cls: 'canceled' },
  excused: { word: 'Excused', glyph: '[·]', colour: '#8b949e', cls: 'canceled' },
  'not-run': { word: 'To-do', glyph: '[ ]', colour: '#8b949e', cls: 'todo' },
  rerun: { word: 'Needs re-run', glyph: '[↻]', colour: '#8b949e', cls: 'rerun' },
  unknown: { word: 'Unrecognised result', glyph: '[?]', colour: '#f85149', cls: 'unknown' },
} as const;

/** A bead with the cockpit's result symbol; no ticket fill or attention dot. */
export function resultMark(result: CheckResult, x: number, y: number, radius: number, options: Pick<MarkNode, 'action' | 'label' | 'glow'> = {}): GroupNode {
  const mark = RESULT_MARK[result];
  const children: SceneNode[] = [{ kind: 'mark', tag: 'circle', attrs: { cx: x, cy: y, r: radius, fill: FIELD, stroke: mark.colour, 'stroke-width': Math.max(.7, radius * .15), 'data-result': result }, cls: `acc-mark-${mark.cls}`, ...options }];
  const paths: Partial<Record<CheckResult, string>> = {
    pass: 'M-2.5 -2.5L2.5 2.5M-2.5 2.5L2.5 -2.5', partial: 'M-2.5 3L2.5 -3',
    fail: 'M0 -3V1M0 2.5V3', na: 'M-3 0H3',
    question: 'M-2 -2C-2 -4 2 -4 2 -2C2 0 0 0 0 1M0 2.5V3',
    unknown: 'M-2 -2C-2 -4 2 -4 2 -2C2 0 0 0 0 1M0 2.5V3',
    rerun: 'M2.5 -1.5A3 3 0 1 0 2.5 1.5M.5 -1.5H2.5V-3.5',
  };
  const symbol: SceneNode[] = [];
  if (paths[result]) symbol.push({ kind: 'mark', tag: 'path', attrs: { d: paths[result]!, fill: 'none', stroke: mark.colour, 'stroke-width': 1.2, 'stroke-linecap': 'round', 'pointer-events': 'none' } });
  if (result === 'blocked') symbol.push({ kind: 'mark', tag: 'rect', attrs: { x: -2.5, y: -2.5, width: 5, height: 5, fill: mark.colour, 'pointer-events': 'none' } });
  if (result === 'excused') symbol.push({ kind: 'mark', tag: 'circle', attrs: { cx: 0, cy: 0, r: 1.2, fill: mark.colour, 'pointer-events': 'none' } });
  children.push({ kind: 'group', transform: `translate(${x} ${y}) scale(${radius / 5})`, children: symbol });
  return { kind: 'group', children };
}
