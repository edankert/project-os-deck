/**
 * The geometry every overview screen shares: angles measured clockwise from
 * twelve o'clock, in radians, and paths written for SVG.
 */

export const TAU = Math.PI * 2;

/** A point at `angle` (0 at the top, clockwise) and `radius` from (cx, cy). */
export function polar(cx: number, cy: number, radius: number, angle: number): [number, number] {
  return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
}

const f = (n: number): string => (Math.round(n * 100) / 100).toString();

/** An annular sector: the shape of one wedge in a ring. */
export function annularSector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const sweep = a1 - a0;
  if (sweep >= TAU - 1e-6) {
    // A whole ring cannot be one arc; draw it as two halves.
    const mid = a0 + Math.PI;
    return `${annularSector(cx, cy, r0, r1, a0, mid)} ${annularSector(cx, cy, r0, r1, mid, a0 + TAU - 1e-4)}`;
  }
  const large = sweep > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  return (
    `M${f(x0)} ${f(y0)}A${f(r1)} ${f(r1)} 0 ${large} 1 ${f(x1)} ${f(y1)}` +
    `L${f(x2)} ${f(y2)}A${f(r0)} ${f(r0)} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`
  );
}

/** An open arc along one radius, for a progress stroke. */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const sweep = Math.min(a1 - a0, TAU - 1e-4);
  const large = sweep > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a0 + sweep);
  return `M${f(x0)} ${f(y0)}A${f(r)} ${f(r)} 0 ${large} 1 ${f(x1)} ${f(y1)}`;
}

/** A regular polygon's points, for a glyph or a web. */
export function polygon(cx: number, cy: number, r: number, sides: number, rotate = 0): string {
  const out: string[] = [];
  for (let i = 0; i < sides; i++) {
    const [x, y] = polar(cx, cy, r, rotate + (i * TAU) / sides);
    out.push(`${f(x)},${f(y)}`);
  }
  return out.join(' ');
}

/** The first `n` words of a name, so a label stays a label. */
export function shortName(name: string, words = 2): string {
  const parts = plainName(name).replace(/^The /, '').split(/\s+/).filter(Boolean);
  return parts.length <= words ? parts.join(' ') : `${parts.slice(0, words).join(' ')}…`;
}

/**
 * A ticket's glyph: its shape says its kind, so a field of them reads without
 * a word. Requirements are diamonds, features hexagons, tasks circles, tests
 * squares, issues triangles, decisions and designs pentagons, risks octagons.
 */
export function glyph(kind: string, cx: number, cy: number, size: number): { tag: 'circle' | 'polygon'; attrs: Record<string, string | number> } {
  switch (kind) {
    case 'req':
      return { tag: 'polygon', attrs: { points: polygon(cx, cy, size, 4) } };
    case 'feat':
      return { tag: 'polygon', attrs: { points: polygon(cx, cy, size, 6, Math.PI / 6) } };
    case 'test':
      return { tag: 'polygon', attrs: { points: polygon(cx, cy, size * 1.1, 4, Math.PI / 4) } };
    case 'iss':
      return { tag: 'polygon', attrs: { points: polygon(cx, cy + size * 0.15, size * 1.1, 3) } };
    case 'dec':
      return { tag: 'polygon', attrs: { points: polygon(cx, cy, size, 5) } };
    case 'risk':
      return { tag: 'polygon', attrs: { points: polygon(cx, cy, size, 8, Math.PI / 8) } };
    default:
      return { tag: 'circle', attrs: { cx, cy, r: size * 0.85 } };
  }
}

/**
 * Lay `count` items out on a grid inside a box, as large as they fit.
 * Returns each item's centre and the pitch used.
 */
export function gridFit(count: number, x: number, y: number, w: number, h: number, maxPitch: number, minPitch = 3): { points: Array<[number, number]>; pitch: number } {
  let pitch = maxPitch;
  while (pitch > minPitch && Math.floor(w / pitch) * Math.floor(h / pitch) < count) pitch -= 1;
  const cols = Math.max(1, Math.floor(w / pitch));
  const rows = Math.ceil(count / cols);
  const used = Math.min(cols, count) * pitch;
  const left = x + (w - used) / 2 + pitch / 2;
  const top = y + Math.max(0, (h - rows * pitch) / 2) + pitch / 2;
  const points: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) points.push([left + (i % cols) * pitch, top + Math.floor(i / cols) * pitch]);
  return { points, pitch };
}

/** A phase's name without a "Phase 21:" prefix, which the wheel already says with its number. */
export function plainName(name: string): string {
  return name.replace(/^Phase\s+\d+\s*[:\u2014-]\s*/i, '');
}
