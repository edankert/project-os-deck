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
import { cockpitSquare } from './overview-marks.js';
import type { PanelNode, PanelRow, SceneNode } from './overview-scene.js';

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
    cockpitSquare(row, x + 12 * s + size / 2, y + (ROW * s) / 2 - ROW * s * 0.5 - 1.5 * s, size, { ticket: false }),
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
  const room = (needed: number): boolean => (tilt ? cursor - needed > y + 6 : cursor + needed < y + h - 6);
  const advance = (by: number): number => {
    const at = tilt ? cursor - by : cursor;
    cursor = tilt ? cursor - by : cursor + by;
    return at;
  };
  for (const section of panel.body.sections) {
    if (section.rows.length === 0) continue;
    const blocks: Array<{ height: number; draw: (top: number, s: number) => SceneNode[] }> = [];
    blocks.push({
      height: HEAD,
      draw: (top, s) => [{ kind: 'text', x: widthAt(top).left, y: top + HEAD * s * 0.6, text: `${section.title} · ${section.rows.length}`, rest: true, role: 'label', size: 11 * s, cls: 'ov-dim ov-title' }],
    });
    if (section.folded) {
      // The strip: one small mark per row, wrapped, then the count.
      const strip = 7;
      const perLine = Math.max(1, Math.floor((w * (1 - TILT.narrow)) / (strip * 1.6)));
      const lines = Math.min(4, Math.ceil(section.rows.length / perLine));
      blocks.push({
        height: lines * strip * 1.7 + 6,
        draw: (top, s) => {
          const { left } = widthAt(top);
          const nodes: SceneNode[] = [];
          section.rows.slice(0, lines * perLine).forEach((row, i) => {
            const cx = left + 6 + (i % perLine) * strip * 1.6 * s;
            const cy = top + 6 + Math.floor(i / perLine) * strip * 1.7 * s;
            nodes.push(cockpitSquare(row, cx, cy, strip * s, { ticket: false }));
          });
          return nodes;
        },
      });
    } else {
      for (const row of section.rows) {
        blocks.push({ height: ROW, draw: (top, s) => { const { left, width } = widthAt(top); return rowNodes(row, left, top + (ROW * s) / 2, width, s); } });
      }
    }
    // Nearest first: on a tilted plane the header goes above its rows, so it is drawn last.
    const ordered = tilt ? [...blocks.slice(1), blocks[0]!] : blocks;
    let drawn = 0;
    for (const block of ordered) {
      const s = scaleAt(cursor);
      if (!room(block.height * s + HEAD * s)) break;
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
  for (const raw of plainLines(panel.body.text)) {
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

/** A panel's flat drawing, as scene nodes for `sceneToSvg`. Not part of `scene.nodes`, so never counted. */
export function panelSvgNodes(panel: PanelNode): SceneNode[] {
  return panel.body.kind === 'rows' ? rowsPanel(panel as PanelNode & { body: { kind: 'rows' } }) : notePanel(panel as PanelNode & { body: { kind: 'note' } });
}
