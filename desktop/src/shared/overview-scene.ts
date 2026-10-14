/**
 * A screen of the overview, described as data before it is drawn (PHASE-0005).
 *
 * **Every overview screen is a pure function from the model to a `Scene`.**
 * The renderer turns a scene into SVG and wires the pointer and the keyboard;
 * the plate script turns the same scene into the pictures DES-0005 shows; and
 * the screen checks (FEAT-0026) read the scene in a node test, with no window.
 * That is what lets the look's rules in PHASE-0005 be checked by an agent:
 * "at most 60 words at rest" is a count over `TextNode`s with `rest: true`,
 * "every number is also a mark" is a `markRef` that resolves, and "a list
 * twin" is `scene.list` holding the same ticket ids the marks draw.
 *
 * This file is the second seam between the two lanes, beside
 * `overview-types.ts`. The drawing lane owns it; a change is agreed in
 * FEAT-0026's "Questions between the lanes" first.
 */
import type { State } from './overview-types.js';

/** The seven screens of DES-0005. */
export type ScreenKind = 'wheel' | 'phase' | 'ticket' | 'rephase' | 'design' | 'test-run' | 'accept';

export type MarkTag = 'path' | 'circle' | 'rect' | 'polygon' | 'line' | 'ellipse';

/** Something drawn that is not text: a wedge, a bead, a lamp, a line. */
export interface MarkNode {
  kind: 'mark';
  tag: MarkTag;
  /** SVG geometry attributes: `d`, `cx`, `r`, `points` and so on. */
  attrs: Record<string, string | number>;
  /** The ticket this mark draws, when it draws one. The list twin must hold it. */
  ticket?: string;
  /** Colours the mark by state. */
  state?: State;
  /** Extra classes, from `OVERVIEW_CSS`. */
  cls?: string;
  /** Needs a person: the mark glows. */
  glow?: boolean;
  /** What a person reads when they point at it. Not text at rest. */
  label?: string;
  /** An address to go to on click (`deck://...`). Makes the mark focusable. */
  target?: string;
  /** A verb key for a control (`accept`, `decline`, `pass`, `fail` ...). Makes the mark focusable. */
  action?: string;
  /** The id a number's `markRef` names. */
  markId?: string;
  /** How many things this mark draws, when a number names it. */
  count?: number;
}

/** Text. `rest: false` text is shown only on hover or focus, and is not counted. */
export interface TextNode {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  rest: boolean;
  /**
   * `id` text is not counted as words; a `number` must name its mark. A `name`
   * (a phase's or a ticket's title) is counted as words but never read as a
   * count: the 800 in "Schwinn 800IC" counts nothing.
   */
  role: 'id' | 'label' | 'name' | 'number' | 'control';
  /** For a `number`: the `markId` of the mark drawing the same count. */
  markRef?: string;
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
  cls?: string;
}

/** A picture: a design's plate, a before-and-after capture. */
export interface ImageNode {
  kind: 'image';
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  cls?: string;
}

export interface GroupNode {
  kind: 'group';
  children: SceneNode[];
  transform?: string;
  cls?: string;
  /** Stable across screens, so the renderer can animate a group from one screen to the next. */
  key?: string;
  label?: string;
  target?: string;
}

export type SceneNode = MarkNode | TextNode | ImageNode | GroupNode;

/** One row of the list twin: the same thing a mark draws, as a row a keyboard and a screen reader can reach. */
export interface ListRow {
  /** A ticket id, or the `markId` of a control or aggregate. */
  id: string;
  label: string;
  group: string;
  state?: State;
  target?: string;
  action?: string;
}

export interface Scene {
  screen: ScreenKind;
  /** The address that restores this screen. */
  address: string;
  width: number;
  height: number;
  /** For the window title and `aria-label`; not counted as words on screen. */
  title: string;
  nodes: SceneNode[];
  list: ListRow[];
}

/** Every node in a scene, depth first. */
export function* walkScene(nodes: SceneNode[]): Generator<SceneNode> {
  for (const node of nodes) {
    yield node;
    if (node.kind === 'group') yield* walkScene(node.children);
  }
}

/**
 * The palette: the six state colours, tuned for the dark field, and the
 * instrument colours of the Glass look. Literal values rather than CSS
 * variables, so a plate rendered outside a browser draws the same colours.
 */
export const PALETTE = {
  ink: 'hsl(195 60% 88%)',
  dim: 'hsl(205 25% 58%)',
  line: 'hsl(190 90% 60%)',
  closed: 'hsl(160 62% 46%)',
  progress: 'hsl(205 92% 62%)',
  failed: 'hsl(355 88% 62%)',
  owed: 'hsl(275 78% 70%)',
  open: 'hsl(38 96% 58%)',
  dropped: 'hsl(220 12% 32%)',
} as const;

const STATES = ['closed', 'progress', 'failed', 'owed', 'open', 'dropped'] as const;

/** The look, written once for the renderer and for the plates. */
export const OVERVIEW_CSS = `
.ov { font-family: "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif; }
.ov text { fill: ${PALETTE.ink}; }
.ov text.ov-dim { fill: ${PALETTE.dim}; }
.ov .ov-id { font-family: "SF Mono", Menlo, monospace; letter-spacing: 0.04em; }
.ov .ov-num { font-family: "SF Mono", Menlo, monospace; font-weight: 600; }
.ov .ov-title { font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
${STATES.map((s) => `.ov .st-${s} { fill: ${PALETTE[s]}; }`).join('\n')}
.ov .ov-track { fill: hsla(210, 60%, 50%, 0.07); stroke: hsla(195, 80%, 60%, 0.16); stroke-width: 1; }
.ov .ov-glass { fill: hsla(205, 60%, 40%, 0.14); stroke: hsla(190, 90%, 65%, 0.5); stroke-width: 1; }
.ov .ov-faint { opacity: 0.35; }
.ov .ov-ghost { opacity: 0.12; }
.ov .ov-hit { fill: transparent; stroke: none; }
.ov .ov-hover { display: none; }
.ov .ov-wire { fill: none; stroke: hsla(190, 90%, 65%, 0.35); stroke-width: 1; }
.ov .ov-frame { stroke: hsla(190, 90%, 65%, 0.55); }
.ov .ov-bezel { stroke: hsla(190, 90%, 65%, 0.22); }
.ov .ov-scan { stroke: hsla(190, 90%, 70%, 0.35); }
.ov .ov-arc { fill: none; stroke-linecap: round; }
.ov .ov-arc.ov-track { stroke: hsla(195, 80%, 60%, 0.16); fill: none; }
${STATES.map((s) => `.ov .ov-wire.st-${s}, .ov .ov-arc.st-${s} { fill: none; stroke: ${PALETTE[s]}; }`).join('\n')}
.ov .ov-control { fill: hsla(190, 90%, 55%, 0.14); stroke: ${PALETTE.line}; stroke-width: 1.5; }
.ov .ov-control.ov-go { fill: hsla(160, 62%, 46%, 0.22); stroke: ${PALETTE.closed}; }
.ov .ov-control.ov-stop { fill: hsla(355, 88%, 62%, 0.16); stroke: ${PALETTE.failed}; }
.ov .ov-control.ov-off { opacity: 0.3; }
.ov .glow { filter: url(#ov-glow); }
.ov [data-target], .ov [data-action] { cursor: pointer; }
.ov [data-target]:focus, .ov [data-action]:focus { outline: none; }
.ov [data-target]:focus > .ov-hit, .ov [data-action]:focus { stroke: #fff; stroke-width: 2; }
`;

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeXml = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

function attr(name: string, value: string | number | undefined): string {
  return value === undefined ? '' : ` ${name}="${escapeXml(String(value))}"`;
}

function markSvg(node: MarkNode): string {
  const classes = [node.state ? `st-${node.state}` : '', node.cls ?? '', node.glow ? 'glow' : ''].filter(Boolean).join(' ');
  const geometry = Object.entries(node.attrs)
    .map(([k, v]) => attr(k, v))
    .join('');
  const focusable = node.target !== undefined || node.action !== undefined;
  const extra =
    attr('class', classes || undefined) +
    attr('data-ticket', node.ticket) +
    attr('data-target', node.target) +
    attr('data-action', node.action) +
    attr('data-mark', node.markId) +
    attr('data-label', node.label) +
    (focusable
      ? ` tabindex="0" role="button"${attr('aria-label', node.label ?? node.ticket ?? node.action)}`
      : node.ticket !== undefined
        ? // Reachable from the keyboard by the arrows, not by Tab: a wheel of 2,747
          // tab stops is no route at all. Tab reaches the groups; arrows the tickets.
          ` tabindex="-1" role="img"${attr('aria-label', node.label ?? node.ticket)}`
        : '');
  const title = node.label ? `<title>${escapeXml(node.label)}</title>` : '';
  return title ? `<${node.tag}${geometry}${extra}>${title}</${node.tag}>` : `<${node.tag}${geometry}${extra}/>`;
}

function textSvg(node: TextNode): string {
  const roleClass = node.role === 'id' ? 'ov-id' : node.role === 'number' ? 'ov-num' : '';
  const classes = [roleClass, node.cls ?? '', node.rest ? '' : 'ov-hover'].filter(Boolean).join(' ');
  return (
    `<text${attr('x', round(node.x))}${attr('y', round(node.y))}${attr('font-size', node.size ?? 13)}` +
    `${attr('text-anchor', node.anchor ?? 'start')}${attr('class', classes || undefined)}` +
    `${attr('data-role', node.role)}${attr('data-mark-ref', node.markRef)}>${escapeXml(node.text)}</text>`
  );
}

function nodeSvg(node: SceneNode): string {
  switch (node.kind) {
    case 'mark':
      return markSvg(node);
    case 'text':
      return textSvg(node);
    case 'image':
      return (
        `<image${attr('href', node.href)}${attr('x', round(node.x))}${attr('y', round(node.y))}` +
        `${attr('width', round(node.w))}${attr('height', round(node.h))}${attr('class', node.cls)}` +
        ` preserveAspectRatio="xMidYMid meet"><title>${escapeXml(node.label)}</title></image>`
      );
    case 'group': {
      const focusable = node.target !== undefined;
      return (
        `<g${attr('transform', node.transform)}${attr('class', node.cls)}${attr('data-key', node.key)}` +
        `${attr('data-target', node.target)}${attr('data-label', node.label)}` +
        `${focusable ? ` tabindex="0" role="button"${attr('aria-label', node.label)}` : ''}>` +
        `${node.children.map(nodeSvg).join('')}</g>`
      );
    }
  }
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** The shared definitions every scene's SVG carries: the glow and the field's light. */
export const OVERVIEW_DEFS =
  '<defs>' +
  '<filter id="ov-glow" x="-50%" y="-50%" width="200%" height="200%">' +
  '<feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
  '<radialGradient id="ov-field" cx="50%" cy="45%" r="75%">' +
  '<stop offset="0%" stop-color="#0c1a2b"/><stop offset="60%" stop-color="#060c16"/><stop offset="100%" stop-color="#02040a"/></radialGradient>' +
  '<pattern id="ov-grid" width="40" height="40" patternUnits="userSpaceOnUse">' +
  '<path d="M40 0H0V40" fill="none" stroke="hsla(195,80%,60%,0.05)" stroke-width="1"/></pattern>' +
  '</defs>';

/**
 * A scene as an SVG document.
 *
 * `standalone` adds the stylesheet and the XML namespace, for a plate or a
 * prototype page; the renderer passes false and carries `OVERVIEW_CSS` in its
 * own stylesheet.
 */
export function sceneToSvg(scene: Scene, options: { standalone?: boolean } = {}): string {
  const style = options.standalone ? `<style>${OVERVIEW_CSS}</style>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="ov ov-${scene.screen}" viewBox="0 0 ${scene.width} ${scene.height}"` +
    ` width="${scene.width}" height="${scene.height}" role="img"${attr('aria-label', scene.title)}${attr('data-address', scene.address)}>` +
    style +
    OVERVIEW_DEFS +
    `<rect width="${scene.width}" height="${scene.height}" fill="url(#ov-field)"/>` +
    `<rect width="${scene.width}" height="${scene.height}" fill="url(#ov-grid)"/>` +
    scene.nodes.map(nodeSvg).join('') +
    '</svg>'
  );
}

/** What a screen needs to know about where it is drawn: the workspace, the view, and how to write an address. */
export interface ScreenContext {
  workspaceId: string;
  viewId: string;
  /** The address of another screen, written by the address grammar. */
  address(parts: AddressParts): string;
}

export interface AddressParts {
  page?: string | null;
  flow?: string | null;
  note?: string | null;
  step?: string | null;
}

/**
 * A context that writes addresses the way `formatAddress` does, without the
 * vocabulary check: for the plate script and for a node test that has not
 * registered the page kinds. The key order is the grammar's (`note` before
 * `page`), so a scene's address round-trips through `parseAddress`.
 */
export function plainContext(workspaceId: string, viewId: string): ScreenContext {
  return {
    workspaceId,
    viewId,
    address(parts) {
      const query: string[] = [];
      for (const key of ['note', 'page', 'flow', 'step'] as const) {
        const value = parts[key];
        if (value !== undefined && value !== null) query.push(`${key}=${encodeURIComponent(value)}`);
      }
      return `deck://${workspaceId}/${viewId}${query.length > 0 ? `?${query.join('&')}` : ''}`;
    },
  };
}
