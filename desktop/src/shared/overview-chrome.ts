/**
 * The pieces every overview screen but the wheel carries: a way back, and a
 * heading that names what the screen is about in as few words as it can.
 */
import { annularSector, arc, polar, TAU } from './overview-geometry.js';
import type { AddressParts, ListRow, SceneNode, ScreenContext } from './overview-scene.js';

/**
 * The way back: a small wheel drawn as a control, top left. It has no word on
 * it; pointing at it says where it goes.
 */
export function backControl(ctx: ScreenContext, parts: AddressParts, label: string): { node: SceneNode; row: ListRow } {
  const cx = 52;
  const cy = 52;
  const children: SceneNode[] = [
    { kind: 'mark', tag: 'circle', attrs: { cx, cy, r: 26 }, cls: 'ov-hit', label },
  ];
  // Six coloured sectors: a picture of the wheel, not a word for it.
  const states = ['closed', 'progress', 'open', 'owed', 'closed', 'open'] as const;
  states.forEach((state, i) => {
    const a0 = (i * TAU) / states.length + 0.06;
    const a1 = ((i + 1) * TAU) / states.length - 0.06;
    children.push({ kind: 'mark', tag: 'path', attrs: { d: annularSector(cx, cy, 9, 20, a0, a1) }, state, cls: 'ov-faint' });
  });
  children.push({ kind: 'mark', tag: 'circle', attrs: { cx, cy, r: 25 }, cls: 'ov-glass' });
  const target = ctx.address(parts);
  return {
    node: { kind: 'group', key: 'back', target, label, children },
    row: { id: 'back', label, group: 'Go to', target },
  };
}

/** The screen's heading: an id in small type above a name. */
export function heading(id: string, name: string, x = 100, y = 46): SceneNode[] {
  const out: SceneNode[] = [{ kind: 'text', x, y: y + 24, text: name, rest: true, role: 'name', size: 22, cls: 'ov-title' }];
  if (id !== '') out.unshift({ kind: 'text', x, y, text: id, rest: true, role: 'id', size: 13, cls: 'ov-dim' });
  return out;
}

/** The first `n` words of a sentence, for a heading that must stay short. */
export function words(text: string, n: number): string {
  const parts = text.split(/\s+/).filter(Boolean);
  return parts.length <= n ? parts.join(' ') : `${parts.slice(0, n).join(' ')}…`;
}

/**
 * The instrument's frame: four corner brackets. Decoration with no words, so
 * every screen reads as one instrument.
 */
export function frame(width: number, height: number): SceneNode[] {
  const m = 14;
  const l = 34;
  const corners: Array<[number, number, number, number]> = [
    [m, m, 1, 1],
    [width - m, m, -1, 1],
    [m, height - m, 1, -1],
    [width - m, height - m, -1, -1],
  ];
  return corners.map(([x, y, sx, sy]) => ({
    kind: 'mark' as const,
    tag: 'path' as const,
    attrs: { d: `M${x} ${y + sy * l}V${y}H${x + sx * l}`, 'stroke-width': 1.5 },
    cls: 'ov-wire ov-frame',
  }));
}

/**
 * A bezel round a circular instrument: a ring of tick marks, every fifth one
 * longer, and a dashed scan ring that turns slowly unless less motion is asked for.
 */
export function bezel(cx: number, cy: number, r: number, ticks = 120): SceneNode[] {
  const parts: string[] = [];
  for (let i = 0; i < ticks; i++) {
    const a = (i * TAU) / ticks;
    const [x0, y0] = polar(cx, cy, r, a);
    const [x1, y1] = polar(cx, cy, r + (i % 5 === 0 ? 9 : 4), a);
    parts.push(`M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`);
  }
  return [
    { kind: 'mark', tag: 'path', attrs: { d: parts.join('') }, cls: 'ov-wire ov-bezel' },
    { kind: 'mark', tag: 'path', attrs: { d: arc(cx, cy, r + 16, 0, TAU), 'stroke-dasharray': '2 14 40 14', 'stroke-width': 1.2 }, cls: 'ov-wire ov-scan' },
  ];
}
