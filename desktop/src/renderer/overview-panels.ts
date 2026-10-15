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
import { walkScene, type PanelNode, type PanelRow, type PanelSection, type Scene } from '../shared/overview-scene.js';

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
  li.append(square(row), el('span', 'ov-row-id', row.id), el('span', 'ov-row-title', row.title), el('span', 'ov-row-status', row.status || '—'));
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

function rowsPanel(panel: PanelNode & { body: { kind: 'rows' } }, reduced: boolean): HTMLElement {
  const box = el('div', `ov-panel ov-panel-rows${panel.body.tilt ? ' is-tilted' : ''}`);
  const plane = el('div', 'ov-plane');
  for (const section of panel.body.sections) {
    if (section.rows.length > 0) plane.appendChild(sectionElement(panel, section));
  }
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
    const box = panel.body.kind === 'rows' ? rowsPanel(panel as PanelNode & { body: { kind: 'rows' } }, options.reduced) : notePanel(panel as PanelNode & { body: { kind: 'note' } }, options.loader, options.follow ?? null);
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
