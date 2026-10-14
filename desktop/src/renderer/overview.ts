/**
 * The overview layer: where Deck draws the seven screens of PHASE-0005.
 *
 * A screen is a page (`?page=wheel`, `phase`, `ticket`, `rephase`) or a flow
 * (`?flow=design`, `test-run`, `accept`) on the current view's address. Each
 * one registers a function that returns a `Scene` (`shared/overview-scene.ts`);
 * this module draws the scene as SVG and owns everything a person does on it:
 *
 * - a click on a mark with an address goes there, and a click on a ticket's
 *   mark opens the ticket screen;
 * - pointing at a mark shows its words in a callout, so the screen carries
 *   almost none at rest;
 * - Tab reaches every control, Enter follows it, Escape goes back, and L opens
 *   the list twin, which holds the same things as rows;
 * - moving from one screen to the next animates every ticket that is on both
 *   from where it was to where it is now, unless the person asked for less
 *   motion.
 *
 * Writes are not made here. A flow's `onAction` asks the shell for them, and
 * the shell sends them through `write-client.ts` (ADR-0003).
 */
import { addressFor, formatAddress } from '../shared/address.js';
import { sceneToSvg, type AddressParts, type Scene, type ScreenContext } from '../shared/overview-scene.js';
import type { OverviewModel } from '../shared/overview-types.js';
import type { DeckAddress } from '../shared/types.js';

/** What a screen is given to draw itself. */
export interface ScreenInput {
  model: OverviewModel;
  address: DeckAddress;
  ctx: ScreenContext;
  /** Per-workspace memory a screen may keep for the session (S4's accepted groups). */
  memory: Map<string, unknown>;
  /** Whether this window may ask for a write: false on the served host. */
  canWrite: boolean;
}

export interface ScreenDefinition {
  scene(input: ScreenInput): Scene | Promise<Scene>;
  /** A control was used. Return true to redraw the screen afterwards. */
  onAction?(action: string, input: ScreenInput): Promise<boolean> | boolean;
}

export interface OverviewHostApi {
  workspaceId(): string | null;
  viewId(): string | null;
  canWrite(): boolean;
  say(message: string, error?: boolean): void;
  /** Leave the overview for an ordinary address (no page, no flow). */
  leaveTo(address: string): Promise<void>;
}

const pages = new Map<string, ScreenDefinition>();
const flows = new Map<string, ScreenDefinition>();

/** A screen registers itself here, the way a page or a flow registers its name in `vocabularies.ts`. */
export function registerScreen(kind: 'page' | 'flow', id: string, definition: ScreenDefinition): void {
  (kind === 'page' ? pages : flows).set(id, definition);
}

let api: OverviewHostApi | null = null;
let area: HTMLElement | null = null;
let stage: HTMLElement | null = null;
let callout: HTMLElement | null = null;
let listPanel: HTMLElement | null = null;
let current: { address: DeckAddress; scene: Scene; definition: ScreenDefinition } | null = null;
const models = new Map<string, { model: OverviewModel; at: number }>();
const memories = new Map<string, Map<string, unknown>>();
let drawing = 0;

const reducedMotion = (): boolean =>
  (globalThis as { __deckReducedMotion?: boolean }).__deckReducedMotion === true ||
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

export function initOverview(host: OverviewHostApi): void {
  api = host;
  area = document.getElementById('overview-area');
  if (area === null) throw new Error('the page has no #overview-area');
  area.replaceChildren();
  stage = document.createElement('div');
  stage.className = 'ov-stage';
  callout = document.createElement('div');
  callout.className = 'ov-callout';
  callout.hidden = true;
  callout.setAttribute('role', 'status');
  listPanel = document.createElement('nav');
  listPanel.className = 'ov-list';
  listPanel.hidden = true;
  listPanel.setAttribute('aria-label', 'This screen as a list');
  const listToggle = document.createElement('button');
  listToggle.type = 'button';
  listToggle.className = 'ov-list-toggle';
  listToggle.title = 'This screen as a list (L)';
  listToggle.setAttribute('aria-label', 'This screen as a list');
  listToggle.textContent = '☰';
  listToggle.addEventListener('click', () => toggleList());
  area.append(stage, callout, listPanel, listToggle);

  stage.addEventListener('click', (event) => void onClick(event));
  stage.addEventListener('pointerover', (event) => onPoint(event));
  stage.addEventListener('pointermove', (event) => moveCallout(event));
  stage.addEventListener('pointerleave', () => hideCallout());
  stage.addEventListener('focusin', (event) => onFocus(event));
  stage.addEventListener('focusout', () => hideCallout());
  area.addEventListener('keydown', (event) => void onKey(event));
  (globalThis as { __deckOverview?: unknown }).__deckOverview = { current: () => current?.scene ?? null, models };
}

export function isOverviewShown(): boolean {
  return area !== null && !area.hidden && current !== null;
}

export function hideOverview(): void {
  if (area === null) return;
  area.hidden = true;
  document.body.dataset['overview'] = '';
  current = null;
  hideCallout();
}

/** The address of what the overview shows, for Copy address. */
export function overviewAddress(): string | null {
  return current === null ? null : current.scene.address;
}

/** Whether an address is the overview's: it names a page or a flow this layer draws. */
export function isOverviewAddress(address: DeckAddress): boolean {
  return (address.page !== null && pages.has(address.page)) || (address.flow !== null && flows.has(address.flow));
}

export function contextFor(workspaceId: string, viewId: string): ScreenContext {
  return {
    workspaceId,
    viewId,
    address: (parts: AddressParts) =>
      formatAddress(
        addressFor(workspaceId, viewId, {
          note: parts.note ?? null,
          page: parts.page ?? null,
          flow: parts.flow ?? null,
          step: parts.step ?? null,
        }),
      ),
  };
}

/** The workspace's model, from Deck's host, kept until the index changes it. */
export async function modelFor(workspaceId: string, fresh = false): Promise<OverviewModel> {
  const cached = models.get(workspaceId);
  if (!fresh && cached !== undefined && Date.now() - cached.at < 5000) return cached.model;
  const response = await fetch(`/deck/overview/${encodeURIComponent(workspaceId)}`);
  if (!response.ok) throw new Error(`the overview could not be read (${response.status})`);
  const model = (await response.json()) as OverviewModel;
  models.set(workspaceId, { model, at: Date.now() });
  return model;
}

function memoryFor(workspaceId: string): Map<string, unknown> {
  let memory = memories.get(workspaceId);
  if (memory === undefined) {
    memory = new Map();
    memories.set(workspaceId, memory);
  }
  return memory;
}

/** Draw the screen an address names. Throws when nothing draws it. */
export async function showOverview(address: DeckAddress): Promise<void> {
  if (api === null || area === null || stage === null) throw new Error('the overview layer is not ready');
  const definition = address.page !== null ? pages.get(address.page) : address.flow !== null ? flows.get(address.flow) : undefined;
  if (definition === undefined) throw new Error(`nothing draws ${address.page ?? address.flow ?? 'that address'}`);
  const ticket = ++drawing;
  const model = await modelFor(address.workspaceId);
  const input: ScreenInput = {
    model,
    address,
    ctx: contextFor(address.workspaceId, address.viewId),
    memory: memoryFor(address.workspaceId),
    canWrite: api.canWrite(),
  };
  const scene = await definition.scene(input);
  // A slower draw that a newer one overtook is dropped, not painted over it.
  if (ticket !== drawing) return;
  paint(scene);
  current = { address, scene, definition };
  area.hidden = false;
  document.body.dataset['overview'] = scene.screen;
  document.title = `Deck — ${scene.title}`;
}

/** Draw the current screen again, from a model read afresh. */
export async function refreshOverview(): Promise<void> {
  if (current === null) return;
  models.delete(current.address.workspaceId);
  await showOverview(current.address);
}

function paint(scene: Scene): void {
  if (stage === null) return;
  const before = positions();
  stage.innerHTML = sceneToSvg(scene);
  const svg = stage.querySelector('svg');
  svg?.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  animateFrom(before);
  drawList(scene);
}

/** Where each ticket's mark is on screen now, so the next screen can grow out of it. */
function positions(): Map<string, DOMRect> {
  const out = new Map<string, DOMRect>();
  if (stage === null) return out;
  for (const element of Array.from(stage.querySelectorAll<SVGGraphicsElement>('[data-ticket]'))) {
    const id = element.dataset['ticket'];
    if (id !== undefined && !out.has(id)) out.set(id, element.getBoundingClientRect());
  }
  return out;
}

function animateFrom(before: Map<string, DOMRect>): void {
  if (stage === null || before.size === 0 || reducedMotion()) return;
  const marks = Array.from(stage.querySelectorAll<SVGGraphicsElement>('[data-ticket]'));
  // Past a few hundred moving marks a frame costs more than the motion tells.
  let moved = 0;
  for (const element of marks) {
    const id = element.dataset['ticket'];
    const from = id === undefined ? undefined : before.get(id);
    if (from === undefined) {
      element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
      continue;
    }
    if (moved >= 400) continue;
    const to = element.getBoundingClientRect();
    if (to.width === 0 && to.height === 0) continue;
    const dx = from.x + from.width / 2 - (to.x + to.width / 2);
    const dy = from.y + from.height / 2 - (to.y + to.height / 2);
    element.style.transformBox = 'fill-box';
    element.style.transformOrigin = 'center';
    element.animate(
      [{ transform: `translate(${dx}px, ${dy}px)`, opacity: 0.6 }, { transform: 'translate(0, 0)', opacity: 1 }],
      { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' },
    );
    moved += 1;
  }
}

function drawList(scene: Scene): void {
  if (listPanel === null) return;
  listPanel.replaceChildren();
  const title = document.createElement('h2');
  title.textContent = scene.title;
  listPanel.appendChild(title);
  let group: string | null = null;
  let ul: HTMLUListElement | null = null;
  for (const row of scene.list) {
    if (row.group !== group || ul === null) {
      group = row.group;
      const heading = document.createElement('h3');
      heading.textContent = row.group;
      ul = document.createElement('ul');
      listPanel.append(heading, ul);
    }
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = row.label;
    button.dataset['id'] = row.id;
    if (row.state !== undefined) button.dataset['state'] = row.state;
    if (row.target !== undefined) button.addEventListener('click', () => void go(row.target!));
    else if (row.action !== undefined) button.addEventListener('click', () => void act(row.action!));
    else button.disabled = true;
    li.appendChild(button);
    ul.appendChild(li);
  }
}

function toggleList(force?: boolean): void {
  if (listPanel === null) return;
  listPanel.hidden = force === undefined ? !listPanel.hidden : !force;
  if (!listPanel.hidden) listPanel.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
}

/** Follow an address: another overview screen, or out of the overview. */
export async function go(raw: string): Promise<void> {
  if (api === null) return;
  const { parseAddress } = await import('../shared/address.js');
  const address = parseAddress(raw);
  hideCallout();
  if (isOverviewAddress(address)) await showOverview(address);
  else {
    hideOverview();
    await api.leaveTo(raw);
  }
}

async function act(action: string): Promise<void> {
  if (current === null || api === null) return;
  const { definition, address } = current;
  if (definition.onAction === undefined) return;
  try {
    const input: ScreenInput = {
      model: await modelFor(address.workspaceId),
      address,
      ctx: contextFor(address.workspaceId, address.viewId),
      memory: memoryFor(address.workspaceId),
      canWrite: api.canWrite(),
    };
    const redraw = await definition.onAction(action, input);
    if (redraw) await showOverview(address);
  } catch (err) {
    api.say(err instanceof Error ? err.message : String(err), true);
  }
}

async function onClick(event: MouseEvent): Promise<void> {
  const target = event.target as Element | null;
  if (target === null || current === null) return;
  const control = target.closest('[data-action]');
  if (control !== null) {
    await act(control.getAttribute('data-action')!);
    return;
  }
  const ticket = target.closest('[data-ticket]');
  const link = target.closest('[data-target]');
  // A ticket's own mark opens the ticket, unless the mark itself carries an address.
  if (ticket !== null && ticket.getAttribute('data-target') === null && !(ticket.classList.contains('ov-hit') && link !== null)) {
    const id = ticket.getAttribute('data-ticket')!;
    if (current.scene.list.some((row) => row.id === id && row.target !== undefined)) {
      const row = current.scene.list.find((r) => r.id === id)!;
      await go(row.target!);
      return;
    }
  }
  if (link !== null) await go(link.getAttribute('data-target')!);
}

function labelOf(element: Element | null): string | null {
  const labelled = element?.closest('[data-label]');
  return labelled?.getAttribute('data-label') ?? null;
}

function onPoint(event: PointerEvent): void {
  const label = labelOf(event.target as Element | null);
  if (label === null) {
    hideCallout();
    return;
  }
  showCallout(label, event.clientX, event.clientY);
}

function onFocus(event: FocusEvent): void {
  const element = event.target as Element | null;
  const label = labelOf(element);
  if (label === null || element === null) return;
  const box = element.getBoundingClientRect();
  showCallout(label, box.right, box.top);
}

function showCallout(text: string, x: number, y: number): void {
  if (callout === null || area === null) return;
  callout.textContent = text;
  callout.hidden = false;
  placeCallout(x, y);
}

function moveCallout(event: PointerEvent): void {
  if (callout === null || callout.hidden) return;
  placeCallout(event.clientX, event.clientY);
}

function placeCallout(x: number, y: number): void {
  if (callout === null || area === null) return;
  const box = area.getBoundingClientRect();
  const left = Math.min(x - box.left + 18, box.width - callout.offsetWidth - 12);
  const top = Math.min(y - box.top + 18, box.height - callout.offsetHeight - 12);
  callout.style.left = `${Math.max(8, left)}px`;
  callout.style.top = `${Math.max(8, top)}px`;
}

function hideCallout(): void {
  if (callout !== null) callout.hidden = true;
}

async function onKey(event: KeyboardEvent): Promise<void> {
  if (current === null) return;
  const element = event.target as Element | null;
  if ((event.key === 'Enter' || event.key === ' ') && element !== null && stage?.contains(element)) {
    const action = element.getAttribute('data-action');
    const target = element.getAttribute('data-target');
    if (action !== null || target !== null) {
      event.preventDefault();
      if (action !== null) await act(action);
      else await go(target!);
    }
    return;
  }
  if (event.key === 'Escape') {
    if (listPanel !== null && !listPanel.hidden) {
      toggleList(false);
      return;
    }
    const back = current.scene.list.find((row) => row.id === 'back');
    if (back?.target !== undefined) {
      event.preventDefault();
      await go(back.target);
    }
    return;
  }
  if ((event.key === 'l' || event.key === 'L') && !(element instanceof HTMLInputElement)) {
    event.preventDefault();
    toggleList();
  }
}
