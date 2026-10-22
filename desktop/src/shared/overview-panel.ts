/**
 * A panel drawn flat, as SVG: what a plate shows where Deck shows HTML
 * (TASK-0147, TASK-0148).
 *
 * In Deck a panel is built as HTML over the picture, so its rows can tilt in
 * real depth, scroll and fold (`renderer/overview-panels.ts`). A plate is SVG
 * converted to an image with no browser, so it gets this version instead: the
 * same rows and the same marks, with the tilt drawn as rows that shrink and
 * narrow toward the back.
 */
import { cockpitSquare, markWords } from './overview-marks.js';
import type { PanelCard, PanelNode, PanelRow, SceneNode } from './overview-scene.js';

/** How much smaller and narrower the back of a tilted plane is than its front. */
export const TILT = { shrink: 0.42, narrow: 0.3 } as const;

const ROW = 30;
const HEAD = 26;

function clip(text: string, chars: number): string {
  if (chars <= 1) return '';
  return text.length <= chars ? text : `${text.slice(0, Math.max(1, chars - 1)).trimEnd()}…`;
}

function rowNodes(row: PanelRow, x: number, y: number, w: number, s: number): SceneNode[] {
  const size = 12 * s;
  const idSize = 12 * s;
  const titleSize = 13.5 * s;
  const statusSize = 11 * s;
  const idWidth = 84 * s;
  const statusWidth = Math.max(40, row.status.length * statusSize * 0.6 + 12 * s);
  const titleChars = Math.floor((w - size - idWidth - statusWidth - 24 * s) / (titleSize * 0.52));
  return [
    { kind: 'mark', tag: 'rect', attrs: { x, y: y - ROW * s * 0.5, width: w, height: ROW * s - 3 * s, rx: 5 * s }, cls: 'ov-row' },
    cockpitSquare(row, x + 12 * s + size / 2, y + (ROW * s) / 2 - ROW * s * 0.5 - 1.5 * s, size, { label: markWords(row), target: row.target }),
    { kind: 'text', x: x + 22 * s + size, y: y + idSize * 0.35, text: row.id, rest: true, role: 'id', size: idSize, cls: 'ov-dim' },
    { kind: 'text', x: x + 22 * s + size + idWidth, y: y + titleSize * 0.35, text: clip(row.title, titleChars), rest: true, role: 'name', size: titleSize },
    { kind: 'text', x: x + w - 10 * s, y: y + statusSize * 0.35, text: row.status, rest: true, role: 'label', size: statusSize, anchor: 'end', cls: 'ov-dim' },
  ];
}

function rowsPanel(panel: PanelNode & { body: { kind: 'rows' } }): SceneNode[] {
  const { x, y, w, h } = panel;
  const tilt = panel.body.tilt === true;
  const out: SceneNode[] = [];
  if (tilt) {
    const inset = (w * TILT.narrow) / 2;
    out.push({ kind: 'mark', tag: 'polygon', attrs: { points: `${x},${y + h} ${x + w},${y + h} ${x + w - inset},${y} ${x + inset},${y}` }, cls: 'ov-track' });
  } else {
    out.push({ kind: 'mark', tag: 'rect', attrs: { x, y, width: w, height: h, rx: 10 }, cls: 'ov-track' });
  }
  // Depth 0 is the front (the bottom of a tilted plane); a flat panel is all front.
  const scaleAt = (top: number): number => (tilt ? 1 - TILT.shrink * Math.min(1, Math.max(0, (y + h - top) / h)) : 1);
  const widthAt = (top: number): { left: number; width: number } => {
    if (!tilt) return { left: x + 12, width: w - 24 };
    const d = Math.min(1, Math.max(0, (y + h - top) / h));
    const inset = (w * TILT.narrow * d) / 2 + 14;
    return { left: x + inset, width: w - 2 * inset };
  };
  // A tilted plane fills from the bottom up, nearest section first; a flat one from the top down.
  let cursor = tilt ? y + h - 14 : y + 16;
  // A flat panel's buttons and paragraph come first (TASK-0182's pane).
  if (!tilt) {
    const buttons = panel.body.buttons ?? [];
    if (buttons.length > 0) {
      out.push({ kind: 'text', x: x + 16, y: cursor + 12, text: buttons.map((b) => b.text).join('   '), rest: true, role: 'control', size: 12, cls: 'ov-dim' });
      cursor += 26;
    }
    if (panel.body.lead !== undefined) {
      for (const line of wrap(panel.body.lead, Math.floor((w - 32) / 6.6)).slice(0, 8)) {
        out.push({ kind: 'text', x: x + 16, y: cursor + 12, text: line, rest: true, role: 'label', size: 12.5 });
        cursor += 18;
      }
      cursor += 10;
    }
  }
  const room = (needed: number): boolean => (tilt ? cursor - needed > y + 6 : cursor + needed < y + h - 6);
  const advance = (by: number): number => {
    const at = tilt ? cursor - by : cursor;
    cursor = tilt ? cursor - by : cursor + by;
    return at;
  };
  // What each later section needs at the least, its heading and its folded strip or a
  // first row, is kept free while an earlier one draws: a long open list must not push
  // the closed strip off the plate (Codex's review of TASK-0147).
  const live = panel.body.sections.filter((sec) => sec.rows.length > 0);
  // A folded section is one line, its heading beside its strip (TASK-0168: a phase with a dozen towers).
  const STRIP_AT = 230;
  const stripLines = (sec: (typeof live)[number]): number => Math.min(4, Math.ceil(sec.rows.length / Math.max(1, Math.floor((w - STRIP_AT - 24) / (7 * 1.6)))));
  const foldedHeight = (sec: (typeof live)[number]): number => Math.max(HEAD, stripLines(sec) * 7 * 1.7 + 6);
  const least = (sec: (typeof live)[number]): number => (sec.folded ? foldedHeight(sec) : HEAD + ROW) + 10;
  const reserveAfter = live.map((_, i) => live.slice(i + 1).reduce((n, sec) => n + least(sec), 0));
  for (const [index, section] of live.entries()) {
    const reserve = reserveAfter[index]! * (tilt ? 1 - TILT.shrink * 0.5 : 1);
    const blocks: Array<{ height: number; draw: (top: number, s: number) => SceneNode[] }> = [];
    const header = (top: number, s: number): SceneNode => ({ kind: 'text', x: widthAt(top).left, y: top + HEAD * s * 0.6, text: `${section.title} · ${section.rows.length}`, rest: true, role: 'label', size: 11 * s, cls: 'ov-dim ov-title' });
    if (section.folded) {
      // One line: the heading, and beside it the strip, one small mark per row, wrapped.
      const strip = 7;
      const perLine = Math.max(1, Math.floor((w - STRIP_AT - 24) / (strip * 1.6)));
      const lines = stripLines(section);
      blocks.push({
        height: foldedHeight(section),
        draw: (top, s) => {
          const { left } = widthAt(top);
          const nodes: SceneNode[] = [header(top, s)];
          section.rows.slice(0, lines * perLine).forEach((row, i) => {
            const cx = left + STRIP_AT * s + (i % perLine) * strip * 1.6 * s;
            const cy = top + 8 + Math.floor(i / perLine) * strip * 1.7 * s;
            nodes.push(cockpitSquare(row, cx, cy, strip * s, { label: markWords(row), target: row.target }));
          });
          return nodes;
        },
      });
    } else {
      blocks.push({ height: HEAD, draw: (top, s) => [header(top, s)] });
      for (const row of section.rows) {
        blocks.push({ height: ROW, draw: (top, s) => { const { left, width } = widthAt(top); return rowNodes(row, left, top + (ROW * s) / 2, width, s); } });
      }
    }
    // Nearest first: on a tilted plane the header goes above its rows, so it is drawn last.
    const ordered = tilt ? [...blocks.slice(1), blocks[0]!] : blocks;
    let drawn = 0;
    for (const block of ordered) {
      const s = scaleAt(cursor);
      if (!room(block.height * s + HEAD * s + reserve)) break;
      const top = advance(block.height * s);
      out.push(...block.draw(top, s));
      drawn += 1;
    }
    if (drawn < ordered.length && room(HEAD * scaleAt(cursor))) {
      const s = scaleAt(cursor);
      const top = advance(HEAD * s);
      out.push({ kind: 'text', x: widthAt(top).left, y: top + HEAD * s * 0.6, text: `${section.title} · ${section.rows.length}, more in Deck`, rest: true, role: 'label', size: 11 * s, cls: 'ov-dim' });
    }
    advance(10 * scaleAt(cursor));
  }
  return out;
}

/** A note's Markdown, as plain lines: headings and list marks kept short, links as their words. */
export function plainLines(markdown: string): string[] {
  return markdown
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_`]+/g, '')
        .replace(/^\s*#+\s*/, '')
        .replace(/^\s*[-*+]\s+/, '• ')
        .trimEnd(),
    );
}

function wrap(line: string, chars: number): string[] {
  if (line.length <= chars) return [line];
  const out: string[] = [];
  let rest = line;
  while (rest.length > chars) {
    const cut = rest.lastIndexOf(' ', chars);
    const at = cut > chars * 0.5 ? cut : chars;
    out.push(rest.slice(0, at));
    rest = rest.slice(at).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

function notePanel(panel: PanelNode & { body: { kind: 'note' } }): SceneNode[] {
  const { x, y, w, h } = panel;
  const size = 13;
  const lineHeight = 19;
  const chars = Math.floor((w - 40) / (size * 0.5));
  const out: SceneNode[] = [{ kind: 'mark', tag: 'rect', attrs: { x, y, width: w, height: h, rx: 10 }, cls: 'ov-track' }];
  let top = y + 30;
  let blank = false;
  const lines = plainLines(panel.body.text);
  // The note's own heading repeats the title the screen already shows.
  const first = lines.findIndex((l) => l.trim() !== '');
  if (first >= 0 && lines[first]!.trim() === panel.body.title.trim()) lines.splice(first, 1);
  for (const raw of lines) {
    if (raw.trim() === '') {
      if (!blank) top += lineHeight * 0.5;
      blank = true;
      continue;
    }
    blank = false;
    for (const line of wrap(raw, chars)) {
      if (top > y + h - 24) {
        out.push({ kind: 'text', x: x + 20, y: y + h - 12, text: '…', rest: true, role: 'label', size, cls: 'ov-dim' });
        return out;
      }
      out.push({ kind: 'text', x: x + 20, y: top, text: line, rest: true, role: 'label', size });
      top += lineHeight;
    }
  }
  return out;
}

/** A selected ticket's card, flat (TASK-0182): its square, id and title, its state, facts, what to do, counts and buttons. */
function cardPanel(panel: PanelNode & { body: PanelCard }): SceneNode[] {
  const { x, y, w, h } = panel;
  const c = panel.body;
  const out: SceneNode[] = [{ kind: 'mark', tag: 'rect', attrs: { x, y, width: w, height: h, rx: 10 }, cls: 'ov-track' }];
  out.push(cockpitSquare(c.row, x + 24, y + 26, 14, { label: markWords(c.row) }));
  out.push({ kind: 'text', x: x + 40, y: y + 31, text: c.row.id, rest: true, role: 'id', size: 13, cls: 'ov-dim' });
  let top = y + 54;
  for (const line of wrap(c.row.title, Math.floor((w - 32) / 8)).slice(0, 3)) {
    out.push({ kind: 'text', x: x + 16, y: top, text: line, rest: true, role: 'name', size: 15 });
    top += 20;
  }
  out.push({ kind: 'text', x: x + 16, y: top + 4, text: `${c.row.status} · ${c.state}`, rest: true, role: 'label', size: 12, cls: 'ov-dim' });
  top += 26;
  for (const f of c.facts) {
    out.push({ kind: 'text', x: x + 16, y: top, text: f.key, rest: true, role: 'label', size: 11.5, cls: 'ov-dim' });
    out.push({ kind: 'text', x: x + 90, y: top, text: clip(f.value, Math.floor((w - 106) / 6.4)), rest: true, role: 'label', size: 12 });
    top += 18;
  }
  if (c.say !== undefined) {
    out.push({ kind: 'text', x: x + 16, y: top + 4, text: clip(c.say, Math.floor((w - 32) / 6.4)), rest: true, role: 'label', size: 12, cls: 'ov-banner-text' });
    top += 24;
  }
  let cx = x + 16;
  for (const n of c.counts) {
    out.push(cockpitSquare({ id: `${c.row.id}-${n.type}`, type: n.type, fill: 'delivered', needsYou: false }, cx + 5, top + 2, 9, {}));
    out.push({ kind: 'text', x: cx + 14, y: top + 6, text: String(n.n), rest: true, role: 'label', size: 12 });
    cx += 22 + String(n.n).length * 7;
  }
  out.push({ kind: 'text', x: x + 16, y: y + h - 16, text: c.buttons.map((b) => b.text).join('   '), rest: true, role: 'control', size: 12, cls: 'ov-dim' });
  return out;
}

/** A panel's flat drawing, as scene nodes for `sceneToSvg`. Not part of `scene.nodes`, so never counted. */
export function panelSvgNodes(panel: PanelNode): SceneNode[] {
  if (panel.body.kind === 'card') return cardPanel(panel as PanelNode & { body: PanelCard });
  return panel.body.kind === 'rows' ? rowsPanel(panel as PanelNode & { body: { kind: 'rows' } }) : notePanel(panel as PanelNode & { body: { kind: 'note' } });
}

/**
 * The styles of a panel built as HTML in Deck, for `OVERVIEW_CSS`. The square
 * is the cockpit's `.ov-phase-sq` (its `renderer.css`, DES-0004), with the same
 * fills; its colour comes from the `ty-*` classes the marks share.
 */
export function panelCss(field: string, needsYou: string): string {
  return `
.ov-panels { position: absolute; left: 0; top: 0; transform-origin: 0 0; pointer-events: none; }
.ov-panel { position: absolute; pointer-events: auto; box-sizing: border-box; font: 13px/1.35 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif; color: hsl(195 60% 90%); }
.ov-panel-rows.is-tilted { perspective: 1500px; perspective-origin: 50% 0%; }
.ov-plane { height: 100%; box-sizing: border-box; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; padding: 18px 20px;
  background: linear-gradient(180deg, hsla(205, 60%, 30%, 0.05), hsla(205, 60%, 30%, 0.16)); border: 1px solid hsla(190, 90%, 65%, 0.22); border-radius: 12px;
  scrollbar-width: thin; scrollbar-color: hsla(190, 90%, 65%, 0.3) transparent; }
.ov-panel-rows.is-tilted .ov-plane { flex-direction: column-reverse; transform: rotateX(22deg); transform-origin: 50% 100%; transition: transform 240ms ease-out;
  box-shadow: 0 30px 60px -20px hsla(190, 90%, 50%, 0.18), inset 0 -1px 0 hsla(190, 90%, 65%, 0.4); }
.ov-sec { display: flex; flex-direction: column; gap: 4px; border-radius: 8px; outline: none; }
.ov-sec:focus-visible { box-shadow: 0 0 0 1px hsla(190, 90%, 65%, 0.7); }
.ov-sec-head { all: unset; display: flex; align-items: baseline; gap: 8px; cursor: pointer; padding: 2px 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: hsl(205 25% 62%); }
.ov-sec-head:hover, .ov-sec-head:focus-visible { color: hsl(190 90% 75%); }
.ov-sec-count { font-family: "SF Mono", Menlo, monospace; font-weight: 600; color: hsl(195 60% 85%); }
.ov-sec[data-section="needs-you"] .ov-sec-title { color: ${needsYou}; }
.ov-strip { display: none; flex-wrap: wrap; gap: 3px; padding: 4px; }
.ov-sec.is-folded .ov-strip { display: flex; }
.ov-sec.is-folded .ov-rows { display: none; }
.ov-rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.ov-row { display: grid; grid-template-columns: 14px 78px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 5px 10px; border-radius: 6px; cursor: pointer;
  background: hsla(205, 60%, 40%, 0.12); border: 1px solid hsla(190, 90%, 65%, 0.1); outline: none; }
.ov-sec[data-section="needs-you"] .ov-row { background: hsla(205, 60%, 40%, 0.2); border-color: hsla(5, 50%, 65%, 0.35); padding: 7px 10px; font-size: 14px; }
.ov-row:hover, .ov-row:focus { background: hsla(190, 90%, 55%, 0.18); border-color: hsla(190, 90%, 65%, 0.6); }
.ov-row-id { font: 12px "SF Mono", Menlo, monospace; color: hsl(205 25% 66%); letter-spacing: 0.02em; }
.ov-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ov-row-status { font-size: 11px; color: hsl(205 25% 62%); }
.ov-row-note { grid-column: 3 / 5; font-size: 12px; color: ${needsYou}; margin-top: -2px; }
.ov-sq { display: inline-block; position: relative; width: 11px; height: 11px; box-sizing: border-box; border-radius: 2px; border: 1.5px solid currentColor; background: transparent; flex: none; }
.ov-sq.ov-sq-small { width: 8px; height: 8px; border-width: 1.2px; border-radius: 1.5px; }
.ov-sq[data-fill="delivered"] { background: currentColor; }
.ov-sq[data-fill="dropped"] { background: linear-gradient(to top right, currentColor calc(50% - 1px), transparent calc(50% - 1px), transparent calc(50% + 1px), currentColor calc(50% + 1px)); }
.ov-sq[data-fill="deferred"] { background: linear-gradient(to top right, transparent calc(50% - 0.9px), currentColor calc(50% - 0.9px), currentColor calc(50% + 0.9px), transparent calc(50% + 0.9px)); }
.ov-sq[data-fill="unproven"], .ov-sq[data-fill="doing"] { background: currentColor; box-shadow: inset 0 0 0 1.5px ${field}; }
.ov-sq[data-attn]::after { content: ''; position: absolute; top: -3.5px; right: -3.5px; width: 5px; height: 5px; border-radius: 50%; background: ${needsYou}; border: 1px solid ${field}; }
@media (prefers-reduced-motion: no-preference) { .ov-sq[data-fill="doing"] { animation: ov-blink 1.6s ease-in-out infinite; } }
@media (prefers-reduced-motion: reduce) { .ov-sq[data-fill="doing"] { outline: 1.5px solid currentColor; outline-offset: 1.5px; } .ov-panel-rows.is-tilted .ov-plane { transition: none; } }
.ov-panel-note { overflow-y: auto; padding: 20px 26px; background: hsla(210, 50%, 9%, 0.82); border: 1px solid hsla(190, 90%, 65%, 0.25); border-radius: 12px;
  scrollbar-width: thin; scrollbar-color: hsla(190, 90%, 65%, 0.3) transparent; }
.ov-note { font-size: 14px; line-height: 1.55; color: hsl(195 30% 88%); }
.ov-note h1 { font-size: 19px; margin: 0 0 10px; } .ov-note h2 { font-size: 15px; margin: 18px 0 6px; color: hsl(190 90% 75%); } .ov-note h3 { font-size: 14px; margin: 14px 0 4px; }
.ov-note a { color: hsl(190 90% 70%); } .ov-note code { font: 12px "SF Mono", Menlo, monospace; background: hsla(205, 60%, 40%, 0.2); padding: 1px 4px; border-radius: 4px; }
.ov-note table { border-collapse: collapse; font-size: 12.5px; } .ov-note td, .ov-note th { border: 1px solid hsla(190, 90%, 65%, 0.2); padding: 3px 6px; }
.ov-note pre { overflow-x: auto; background: hsla(205, 60%, 20%, 0.4); padding: 8px; border-radius: 6px; }
.ov-note-wait { color: hsl(205 25% 62%); font-style: italic; }
/* A ticket selected on the towers (TASK-0182): its card, and its pane's way back and first paragraph. */
.ov-panel-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; background: hsla(210, 50%, 9%, 0.88); border: 1px solid hsla(190, 90%, 65%, 0.3); border-radius: 12px; }
.ov-card-head { display: flex; align-items: center; gap: 8px; }
.ov-card-state { margin-left: auto; font-size: 11.5px; color: hsl(205 25% 66%); }
.ov-card-title { font-size: 15px; font-weight: 600; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.ov-card-facts { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 2px 10px; margin: 0; font-size: 12px; }
.ov-card-facts dt { color: hsl(205 25% 62%); } .ov-card-facts dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ov-card-say { font-size: 12.5px; color: ${needsYou}; }
.ov-card-counts { display: flex; flex-wrap: wrap; gap: 10px; font: 12px "SF Mono", Menlo, monospace; }
.ov-card-count { display: inline-flex; align-items: center; gap: 4px; }
.ov-card-acts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
.ov-panel-button { all: unset; cursor: pointer; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: hsl(190 90% 80%); background: hsla(190, 90%, 55%, 0.12); border: 1px solid hsla(190, 90%, 65%, 0.4); }
.ov-panel-button:hover, .ov-panel-button:focus-visible { background: hsla(190, 90%, 55%, 0.25); }
.ov-pane-lead { margin: 0; font-size: 13.5px; line-height: 1.5; color: hsl(195 30% 88%); }
`;
}
