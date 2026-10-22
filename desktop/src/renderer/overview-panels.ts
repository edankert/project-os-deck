/**
 * A scene's panels, built as HTML over the picture (TASK-0147, TASK-0148).
 *
 * A panel is data in the scene (`PanelNode`): ticket rows in sections, or a
 * note. Here it becomes HTML laid over the SVG at the scene's own coordinates,
 * so the rows read as the cockpit's list does, and a tilted panel stands on a
 * real 3D plane: rows near the front full size, rows at the back smaller, and
 * the plane leaning a little toward the pointer. Nothing moves for a person who
 * asked for less motion.
 *
 * A row is pressed like any mark: it carries `data-target`, `data-ticket` and
 * `data-label`, so the overview's own click, callout and arrow-key handling
 * reach it. A folded section opens and closes here, and stays as it was left
 * for the session.
 */
import { markWords } from '../shared/overview-marks.js';
import { walkScene, type PanelButton, type PanelCard, type PanelNeeds, type PanelNode, type PanelRow, type PanelSection, type PanelWeeks, type Scene } from '../shared/overview-scene.js';

/** Sections a person opened or closed, by panel and section key, for the session. */
const unfolded = new Map<string, boolean>();

/** Asks Deck for a note's rendered text, as the reader shows it. */
export type NoteLoader = (noteId: string) => Promise<string>;

/** Follows a link inside a note's text: the path after `/docs/`, as Glass's reader reads it. */
export type LinkFollower = (rel: string) => Promise<void>;

/** Where the sidecar's rendered links to other notes start (as in `glass.ts`). */
const NOTE_LINK_PREFIX = '/docs/';

export interface PanelLayer {
  element: HTMLElement;
  /** Lay the panels over the picture again: after a resize or a redraw. */
  place(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (cls !== '') element.className = cls;
  if (text !== undefined) element.textContent = text;
  return element;
}

/** The cockpit's square, as the cockpit draws it: a span its stylesheet fills by type and state. */
export function square(row: Pick<PanelRow, 'type' | 'fill' | 'needsYou'>, small = false): HTMLElement {
  const sq = el('span', `ov-sq ty-${row.type}${small ? ' ov-sq-small' : ''}`);
  sq.dataset['fill'] = row.fill;
  if (row.needsYou) sq.dataset['attn'] = '';
  sq.setAttribute('aria-hidden', 'true');
  return sq;
}

function rowElement(row: PanelRow): HTMLElement {
  const li = el('li', 'ov-row');
  li.dataset['ticket'] = row.id;
  if (row.target !== undefined) li.dataset['target'] = row.target;
  li.dataset['label'] = markWords(row);
  li.tabIndex = -1;
  li.setAttribute('role', 'button');
  li.setAttribute('aria-label', markWords(row));
  li.append(square(row), el('span', 'ov-row-id', row.id), el('span', 'ov-row-title', row.title));
  // A board's row says who has it, or when it was finished, and how it stands (TASK-0183).
  if (row.aside !== undefined) li.append(el('span', 'ov-row-aside', row.aside));
  if (row.tag !== undefined) {
    li.dataset['tag'] = row.tag;
    li.classList.add('has-aside');
  }
  li.append(el('span', 'ov-row-status', row.status || '—'));
  // What needs you says what to do, under its title (TASK-0158).
  if (row.note !== undefined) li.append(el('span', 'ov-row-note', row.note));
  return li;
}

function sectionElement(panel: PanelNode, section: PanelSection): HTMLElement {
  const memory = `${panel.key}/${section.key}`;
  const open = unfolded.get(memory) ?? !section.folded;
  const box = el('section', `ov-sec${open ? '' : ' is-folded'}`);
  box.dataset['section'] = section.key;
  // Tab reaches the section; the arrows then step along its rows.
  box.dataset['key'] = memory;
  box.tabIndex = 0;
  box.setAttribute('aria-label', `${section.title}: ${section.rows.length} tickets`);
  const head = el('button', 'ov-sec-head');
  head.type = 'button';
  head.append(el('span', 'ov-sec-title', section.title), el('span', 'ov-sec-count', String(section.rows.length)));
  head.setAttribute('aria-expanded', String(open));
  const strip = el('div', 'ov-strip');
  for (const row of section.rows) strip.appendChild(square(row, true));
  const list = el('ul', 'ov-rows');
  for (const row of section.rows) list.appendChild(rowElement(row));
  head.addEventListener('click', (event) => {
    event.stopPropagation();
    const nowOpen = box.classList.toggle('is-folded') === false;
    head.setAttribute('aria-expanded', String(nowOpen));
    unfolded.set(memory, nowOpen);
  });
  box.append(head, strip, list);
  return box;
}

/** A panel's button: it carries its address or its action, so the overview's own click handling follows it. */
function buttonElement(b: PanelButton): HTMLElement {
  const button = el('button', 'ov-panel-button', b.text);
  button.type = 'button';
  button.title = b.label;
  button.setAttribute('aria-label', b.label);
  button.dataset['label'] = b.label;
  if (b.target !== undefined) button.dataset['target'] = b.target;
  if (b.action !== undefined) button.dataset['action'] = b.action;
  return button;
}

/** A selected ticket's card (TASK-0182). */
function cardPanel(panel: PanelNode & { body: PanelCard }): HTMLElement {
  const c = panel.body;
  const box = el('div', 'ov-panel ov-panel-card');
  const head = el('div', 'ov-card-head');
  head.append(square(c.row), el('span', 'ov-row-id', c.row.id), el('span', 'ov-card-state', `${c.row.status || '—'} · ${c.state}`));
  const title = el('div', 'ov-card-title', c.row.title);
  const facts = el('dl', 'ov-card-facts');
  for (const f of c.facts) facts.append(el('dt', '', f.key), el('dd', '', f.value));
  box.append(head, title, facts);
  if (c.say !== undefined) box.appendChild(el('div', 'ov-card-say', c.say));
  const counts = el('div', 'ov-card-counts');
  for (const n of c.counts) {
    const item = el('span', 'ov-card-count');
    item.title = `${n.n} ${n.type}${n.n === 1 ? '' : 's'}`;
    item.append(square({ type: n.type, fill: 'delivered', needsYou: false }, true), document.createTextNode(String(n.n)));
    counts.appendChild(item);
  }
  if (c.counts.length > 0) box.appendChild(counts);
  const acts = el('div', 'ov-card-acts');
  for (const b of c.buttons) acts.appendChild(buttonElement(b));
  box.appendChild(acts);
  return box;
}

/** A control that lights tickets on the towers when pressed, as a search does (TASK-0184). */
function lighter(tag: 'button', cls: string, ids: readonly string[], label: string): HTMLElement {
  const b = el(tag, cls);
  b.type = 'button';
  b.dataset['light'] = ids.join(' ');
  b.dataset['lightLabel'] = label;
  b.dataset['label'] = label;
  b.setAttribute('aria-label', label);
  return b;
}

/** What needs you (TASK-0184): the count, the bar split by reason, the reasons' words, the first three rows. */
function needsPanel(panel: PanelNode & { body: PanelNeeds }): HTMLElement {
  const n = panel.body;
  const box = el('div', 'ov-panel ov-panel-needs');
  box.append(el('div', 'ov-needs-title', 'Needs you'), el('div', 'ov-needs-big', String(n.total)));
  if (n.total === 0) {
    box.appendChild(el('div', 'ov-board-foot', 'Nothing is waiting on you.'));
    return box;
  }
  const bar = el('div', 'ov-needs-bar');
  const keys = el('div', 'ov-needs-keys');
  for (const part of n.parts) {
    const words = `${part.ids.length} ${part.word}`;
    const segment = lighter('button', 'ov-needs-part', part.ids, `${words}: light them on the towers`);
    segment.style.flex = String(part.ids.length);
    segment.style.background = part.colour;
    bar.appendChild(segment);
    const key = lighter('button', 'ov-needs-key', part.ids, `${words}: light them on the towers`);
    const dot = el('i', '');
    dot.style.background = part.colour;
    key.append(dot, document.createTextNode(words));
    keys.appendChild(key);
  }
  const list = el('ul', 'ov-rows');
  for (const r of n.rows) list.appendChild(rowElement(r));
  box.append(bar, keys, list);
  return box;
}

/** The year as weeks (TASK-0184): four rows of thirteen squares, each lighting the tickets closed that week. */
function weeksPanel(panel: PanelNode & { body: PanelWeeks }): HTMLElement {
  const w = panel.body;
  const box = el('div', 'ov-panel ov-panel-weeks');
  const total = w.weeks.reduce((n, ids) => n + ids.length, 0);
  const most = Math.max(1, ...w.weeks.map((ids) => ids.length));
  const busiest = w.weeks.reduce((b, ids, i) => (ids.length > w.weeks[b]!.length ? i : b), 0);
  const head = el('div', 'ov-board-head');
  head.append(el('span', 'ov-board-title', w.year), el('span', 'ov-board-count', `${total} closed · busiest week ${busiest + 1}`));
  const grid = el('div', 'ov-weeks-grid');
  const DAY = 86400000;
  for (let q = 0; q < 4; q += 1) {
    grid.appendChild(el('span', 'ov-weeks-q', `Q${q + 1}`));
    for (let k = 0; k < 13; k += 1) {
      const i = q * 13 + k;
      const ids = w.weeks[i]!;
      const from = new Date(Date.parse(`${w.year}-01-01`) + i * 7 * DAY).toISOString().slice(5, 10);
      const square = lighter('button', `ov-week${i === w.now ? ' is-now' : ''}${w.now >= 0 && i > w.now ? ' is-later' : ''}`, ids, `Week ${i + 1}, from ${from}: ${ids.length} closed`);
      square.style.setProperty('--f', ids.length === 0 ? '0' : (0.25 + (0.75 * ids.length) / most).toFixed(2));
      grid.appendChild(square);
    }
  }
  box.append(head, grid);
  if (w.undated.length > 0) {
    const foot = lighter('button', 'ov-weeks-undated', w.undated, `${w.undated.length} closed with no date: light them on the towers`);
    foot.textContent = `${w.undated.length} closed with no date`;
    box.appendChild(foot);
  }
  return box;
}

function rowsPanel(panel: PanelNode & { body: { kind: 'rows' } }, reduced: boolean): HTMLElement {
  const box = el('div', `ov-panel ov-panel-rows${panel.body.tilt ? ' is-tilted' : ''}`);
  const plane = el('div', 'ov-plane');
  // A selected ticket's pane: its way back, then its first paragraph, then its rows (TASK-0182).
  if ((panel.body.buttons ?? []).length > 0) {
    const acts = el('div', 'ov-card-acts');
    for (const b of panel.body.buttons!) acts.appendChild(buttonElement(b));
    plane.appendChild(acts);
  }
  if (panel.body.lead !== undefined) plane.appendChild(el('p', 'ov-pane-lead', panel.body.lead));
  // The selected ticket's own pictures, through Deck's host (TASK-0186).
  const pictures = panel.body.pictures;
  if (pictures !== undefined) {
    const strip = el('div', 'ov-pane-pictures');
    for (const p of pictures.shown) {
      const fig = el('figure', 'ov-pane-picture');
      const img = el('img', '');
      img.src = p.href;
      img.alt = p.label;
      img.title = p.label;
      img.loading = 'lazy';
      fig.appendChild(img);
      strip.appendChild(fig);
    }
    plane.appendChild(strip);
    if (pictures.total > pictures.shown.length) plane.appendChild(el('div', 'ov-board-foot', `${pictures.shown.length} of its ${pictures.total} pictures, the newest`));
  }
  // A board's heading, with its done count as a bar (TASK-0183).
  const heading = panel.body.heading;
  if (heading !== undefined) {
    const h = el('div', 'ov-board-head');
    h.appendChild(el('span', 'ov-board-title', heading.text));
    if (heading.of !== undefined && heading.done !== undefined) {
      h.appendChild(el('span', 'ov-board-count', `${heading.done} of ${heading.of} tasks done`));
      const bar = el('div', 'ov-board-bar');
      const fill = el('div', 'ov-board-fill');
      fill.style.width = `${heading.of === 0 ? 0 : Math.round((100 * heading.done) / heading.of)}%`;
      bar.appendChild(fill);
      h.appendChild(bar);
    }
    plane.appendChild(h);
  }
  for (const section of panel.body.sections) {
    if (section.rows.length > 0) plane.appendChild(sectionElement(panel, section));
  }
  if (panel.body.foot !== undefined) plane.appendChild(el('div', 'ov-board-foot', panel.body.foot));
  box.appendChild(plane);
  if (panel.body.tilt && !reduced) {
    // The plane leans a little toward the pointer: depth you can feel, not a spin.
    box.addEventListener('pointermove', (event) => {
      const r = box.getBoundingClientRect();
      const dx = (event.clientX - r.left) / r.width - 0.5;
      const dy = (event.clientY - r.top) / r.height - 0.5;
      plane.style.transform = `rotateX(${(22 - dy * 5).toFixed(2)}deg) rotateY(${(dx * 7).toFixed(2)}deg)`;
    });
    box.addEventListener('pointerleave', () => {
      plane.style.transform = '';
    });
  }
  return box;
}

function notePanel(panel: PanelNode & { body: { kind: 'note' } }, loader: NoteLoader | null, follow: LinkFollower | null): HTMLElement {
  const box = el('div', 'ov-panel ov-panel-note');
  const article = el('article', 'ov-note');
  box.appendChild(article);
  // A link to another note opens that note, as it does in Glass's reader, rather than
  // sending the window to a path the host does not serve. A link out of the workspace
  // is left to the window, which opens it in the person's own browser.
  article.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement).closest('a');
    const href = link?.getAttribute('href') ?? '';
    if (link === null || !href.startsWith(NOTE_LINK_PREFIX)) return;
    event.preventDefault();
    event.stopPropagation();
    let rel: string;
    try {
      rel = decodeURIComponent(href.slice(NOTE_LINK_PREFIX.length).split('#')[0] ?? '');
    } catch {
      return;
    }
    if (follow !== null && rel !== '') void follow(rel);
  });
  const plain = (): void => {
    article.replaceChildren();
    for (const para of panel.body.text.split(/\n\s*\n/)) if (para.trim() !== '') article.appendChild(el('p', '', para.trim()));
  };
  if (loader === null) {
    plain();
    return box;
  }
  article.appendChild(el('p', 'ov-note-wait', 'reading the note…'));
  loader(panel.body.id)
    .then((html) => {
      // The same HTML the reader shows, from the workspace's sidecar.
      article.innerHTML = html;
    })
    .catch((err: unknown) => {
      if (panel.body.text.trim() !== '') plain();
      else article.replaceChildren(el('p', 'ov-note-wait', `the note's text could not be read: ${err instanceof Error ? err.message : String(err)}`));
    });
  return box;
}

/** Build every panel a scene holds, over the stage's picture. Null when it holds none. */
export function buildPanels(scene: Scene, stage: HTMLElement, options: { reduced: boolean; loader: NoteLoader | null; follow?: LinkFollower | null }): PanelLayer | null {
  const panels = [...walkScene(scene.nodes)].filter((n): n is PanelNode => n.kind === 'panel');
  if (panels.length === 0) return null;
  const layer = el('div', 'ov ov-panels');
  layer.style.width = `${scene.width}px`;
  layer.style.height = `${scene.height}px`;
  for (const panel of panels) {
    const box = panel.body.kind === 'rows' ? rowsPanel(panel as PanelNode & { body: { kind: 'rows' } }, options.reduced)
      : panel.body.kind === 'card' ? cardPanel(panel as PanelNode & { body: PanelCard })
        : panel.body.kind === 'needs' ? needsPanel(panel as PanelNode & { body: PanelNeeds })
          : panel.body.kind === 'weeks' ? weeksPanel(panel as PanelNode & { body: PanelWeeks })
            : notePanel(panel as PanelNode & { body: { kind: 'note' } }, options.loader, options.follow ?? null);
    box.dataset['panel'] = panel.key;
    box.setAttribute('aria-label', panel.label);
    box.style.left = `${panel.x}px`;
    box.style.top = `${panel.y}px`;
    box.style.width = `${panel.w}px`;
    box.style.height = `${panel.h}px`;
    layer.appendChild(box);
  }
  stage.appendChild(layer);
  // The picture is scaled to fit the stage and centred (`preserveAspectRatio`
  // meet); the layer is given the same scale and offset, so a panel stands
  // exactly where the scene put it.
  const place = (): void => {
    // The layout size, not the drawn one: the camera may have turned or zoomed the board.
    const box = { width: stage.clientWidth, height: stage.clientHeight };
    const k = Math.min(box.width / scene.width, box.height / scene.height);
    const ox = (box.width - scene.width * k) / 2;
    const oy = (box.height - scene.height * k) / 2;
    layer.style.transform = `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) scale(${k.toFixed(4)})`;
  };
  place();
  return { element: layer, place };
}
