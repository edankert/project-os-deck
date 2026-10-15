/**
 * The cockpit's ticket marks, drawn on every overview screen (TASK-0145).
 *
 * Edwin, 2026-10-15: "use the same colours for the different tickets
 * throughout (same as in the cockpit) and use the same way to show the status
 * as is used in the overview page". So a ticket's colour says its type, in the
 * cockpit's own type colours, and how full its mark is drawn says its state,
 * in the cockpit's DES-0004 marks:
 *
 * - filled: done;
 * - hollow: not started;
 * - inverted and pulsing: in progress;
 * - inverted and still: complete, not proven;
 * - solid with a slit: resolved, nothing delivered;
 * - hollow with a strike: parked;
 * - a red corner dot, whatever the type: needs you.
 *
 * `cockpitSquare` draws exactly the cockpit's square. `paintOf` gives any
 * other shape (a wedge, a glyph) the same colour and fill, as near as a shape
 * that is not a square can carry them. The wheel can still be drawn in DES-0004's
 * state colours, for Edwin to compare (`ScreenContext.colouring`).
 */
import type { GroupNode, MarkNode, PanelNode, ScreenContext, SceneNode } from './overview-scene.js';
import { FILL_WORD, type Fill, type NoteType, type Ticket } from './overview-types.js';

/** The cockpit's type colours, from its dark theme (project-os-cockpit `static/cockpit.css`). */
export const TYPE_COLOUR: Readonly<Record<NoteType, string>> = {
  feature: 'hsl(210 50% 65%)',
  task: 'hsl(140 35% 60%)',
  requirement: 'hsl(270 35% 68%)',
  issue: 'hsl(5 50% 65%)',
  risk: 'hsl(25 50% 60%)',
  adr: 'hsl(190 40% 60%)',
  test: 'hsl(100 35% 58%)',
  // The cockpit draws a design's icon in its reference colour (`.doc-design-icon`).
  design: 'hsl(205 20% 68%)',
};

/** The cockpit's word for each type, singular, for a row or a callout. */
export const TYPE_WORD: Readonly<Record<NoteType, string>> = {
  feature: 'feature',
  task: 'task',
  requirement: 'requirement',
  issue: 'issue',
  risk: 'risk',
  adr: 'decision',
  design: 'design',
  test: 'test',
};

export const NOTE_TYPES = Object.keys(TYPE_COLOUR) as NoteType[];
export const FILLS = Object.keys(FILL_WORD) as Fill[];

/** The cockpit's "needs you" dot: `--status-blocked`, dark theme. */
export const NEEDS_YOU = 'hsl(5 50% 65%)';

/** The field behind every mark, so a slit or an inset reads as a cut. */
export const FIELD = 'hsl(214 55% 7%)';

/** What a ticket's mark says when pointed at, in the cockpit's words. */
export function markWords(t: Pick<Ticket, 'id' | 'title' | 'status' | 'type' | 'fill' | 'needsYou'>): string {
  const marks = [t.fill === 'open' || t.fill === 'delivered' ? null : FILL_WORD[t.fill], t.needsYou ? 'needs you' : null].filter(Boolean);
  return `${t.id} ${t.title} (${t.status || '—'})${marks.length > 0 ? ` — ${marks.join(', ')}` : ''}`;
}

/** A ticket as a line of a list: its type, title, status and marks, in the cockpit's words. */
export function rowWords(t: Pick<Ticket, 'type' | 'title' | 'status' | 'fill' | 'needsYou'>): string {
  const marks = [t.fill === 'open' || t.fill === 'delivered' ? null : FILL_WORD[t.fill], t.needsYou ? 'needs you' : null].filter(Boolean);
  return `${t.title} — ${TYPE_WORD[t.type]}, ${t.status || '—'}${marks.length > 0 ? `, ${marks.join(', ')}` : ''}`;
}

/**
 * The colour and fill of a wedge or a glyph that draws one ticket.
 *
 * In the type colouring the mark takes `type`, `fill` and `needsYou`; in the
 * state colouring it takes DES-0004's `state`, as the overview was first built.
 */
export function paintOf(t: Ticket, ctx: Pick<ScreenContext, 'colouring'>): Pick<MarkNode, 'state' | 'type' | 'fill' | 'needsYou'> {
  if (ctx.colouring === 'state') return { state: t.state };
  return { type: t.type, fill: t.fill, needsYou: t.needsYou };
}

/**
 * The cockpit's square, at (x, y) with side `size`.
 *
 * A group of plain SVG shapes, so a plate rendered outside a browser draws it
 * the same: the body in the type colour, an inset ring in the field's colour for
 * in progress and not proven, a slit or a strike on the diagonal, and the dot
 * outside the top right corner with a ring of the field's colour round it.
 */
export function cockpitSquare(
  t: Pick<Ticket, 'id' | 'type' | 'fill' | 'needsYou'>,
  x: number,
  y: number,
  size: number,
  options: { label?: string; target?: string; key?: string; ticket?: boolean } = {},
): GroupNode {
  const s = size;
  const half = s / 2;
  const line = Math.max(1, s * 0.17);
  const filled = t.fill !== 'open' && t.fill !== 'deferred';
  const children: SceneNode[] = [
    {
      kind: 'mark',
      tag: 'rect',
      attrs: { x: x - half + line / 2, y: y - half + line / 2, width: s - line, height: s - line, rx: s * 0.2, 'stroke-width': line },
      cls: `ty-${t.type} sq${filled ? ' sq-solid' : ''}`,
      ...(options.ticket === false ? {} : { ticket: t.id }),
      label: options.label,
    },
  ];
  if (t.fill === 'doing') {
    // Motion is all that separates in progress from "complete, not proven", so a person
    // who asked for less motion gets the cockpit's static outline instead (its
    // renderer.css, `.ov-phase-sq[data-state="doing"]` under reduced motion).
    const ring = line * 1.4;
    children.push({ kind: 'mark', tag: 'rect', attrs: { x: x - half - ring, y: y - half - ring, width: s + 2 * ring, height: s + 2 * ring, rx: s * 0.28, 'stroke-width': line * 0.8 }, cls: `ty-${t.type} sq-ring` });
  }
  if (t.fill === 'doing' || t.fill === 'unproven') {
    const inset = line * 1.6;
    children.push({ kind: 'mark', tag: 'rect', attrs: { x: x - half + inset, y: y - half + inset, width: s - 2 * inset, height: s - 2 * inset, rx: s * 0.1, 'stroke-width': line * 0.9 }, cls: 'sq-cut' });
  }
  if (t.fill === 'dropped' || t.fill === 'deferred') {
    children.push({
      kind: 'mark',
      tag: 'line',
      attrs: { x1: x - half + line, y1: y + half - line, x2: x + half - line, y2: y - half + line, 'stroke-width': Math.max(1, s * 0.13) },
      cls: t.fill === 'dropped' ? 'sq-cut' : `ty-${t.type} sq-strike`,
    });
  }
  if (t.needsYou) {
    children.push({ kind: 'mark', tag: 'circle', attrs: { cx: x + half, cy: y - half, r: Math.max(2, s * 0.24), 'stroke-width': Math.max(1, s * 0.1) }, cls: 'sq-dot' });
  }
  return {
    kind: 'group',
    cls: t.fill === 'doing' ? 'ov-doing' : undefined,
    key: options.key,
    target: options.target,
    label: options.label,
    children,
  };
}

/** The CSS for the marks, for `OVERVIEW_CSS`. Literal colours, so a plate draws the same. */
export function marksCss(): string {
  return [
    ...NOTE_TYPES.map((type) => `.ov .ty-${type} { color: ${TYPE_COLOUR[type]}; }`),
    // A wedge or a glyph in the type colouring: colour from the type, fill from the state.
    '.ov .fl-delivered { fill: currentColor; stroke: currentColor; stroke-width: 0.6; }',
    '.ov .fl-open { fill: currentColor; fill-opacity: 0.1; stroke: currentColor; stroke-width: 1.3; }',
    '.ov .fl-unproven { fill: currentColor; fill-opacity: 0.42; stroke: currentColor; stroke-width: 1.3; }',
    '.ov .fl-doing { fill: currentColor; fill-opacity: 0.42; stroke: currentColor; stroke-width: 1.3; }',
    '.ov .fl-dropped { fill: currentColor; fill-opacity: 0.22; stroke: currentColor; stroke-width: 1; stroke-dasharray: 4 3; }',
    '.ov .fl-deferred { fill: none; stroke: currentColor; stroke-width: 1.2; stroke-dasharray: 2 3; }',
    `.ov .ov-needs { stroke: ${NEEDS_YOU}; stroke-width: 2.2; stroke-opacity: 1; stroke-dasharray: none; }`,
    // The square.
    '.ov .sq { fill: none; stroke: currentColor; }',
    '.ov .sq.sq-solid { fill: currentColor; }',
    `.ov .sq-cut { fill: none; stroke: ${FIELD}; }`,
    '.ov .sq-strike { stroke: currentColor; }',
    `.ov .sq-dot { fill: ${NEEDS_YOU}; stroke: ${FIELD}; }`,
    `.ov .ov-badge { fill: ${NEEDS_YOU}; }`,
    // In progress pulses, as the cockpit's does; still, it keeps an outline so it is not
    // mistaken for "complete, not proven" by anyone who asked for less motion.
    '@keyframes ov-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }',
    '@media (prefers-reduced-motion: no-preference) { .ov .ov-doing, .ov .fl-doing { animation: ov-blink 1.6s ease-in-out infinite; } }',
    '.ov .sq-ring { fill: none; stroke: currentColor; display: none; }',
    '@media (prefers-reduced-motion: reduce) { .ov .fl-doing { stroke-width: 2.6; } .ov .sq-ring { display: inline; } }',
  ].join('\n');
}

/** The rows a panel holds, for a check or a list twin. */
export function panelTickets(panel: PanelNode): string[] {
  if (panel.body.kind !== 'rows') return [];
  return panel.body.sections.flatMap((s) => s.rows.map((r) => r.id));
}
