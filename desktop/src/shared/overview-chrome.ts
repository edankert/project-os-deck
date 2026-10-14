/**
 * The pieces every overview screen but the wheel carries: a way back, and a
 * heading that names what the screen is about in as few words as it can.
 */
import { annularSector, TAU } from './overview-geometry.js';
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
  const out: SceneNode[] = [{ kind: 'text', x, y: y + 24, text: name, rest: true, role: 'label', size: 22, cls: 'ov-title' }];
  if (id !== '') out.unshift({ kind: 'text', x, y, text: id, rest: true, role: 'id', size: 13, cls: 'ov-dim' });
  return out;
}

/** The first `n` words of a sentence, for a heading that must stay short. */
export function words(text: string, n: number): string {
  const parts = text.split(/\s+/).filter(Boolean);
  return parts.length <= n ? parts.join(' ') : `${parts.slice(0, n).join(' ')}…`;
}
