/** Diagnostic replay of the frozen native trace through the production Glass renderer. */
import type { GlassField } from './glass.js';
import type { Slot } from '../shared/slots.js';
import { WHEEL_RATE } from '../shared/zoom.js';

export interface FixtureTraceAction {
  at_ms: number;
  action: string;
  key?: string;
  x?: number;
  y?: number;
  factor?: number;
  lines?: number;
}

export interface FixtureTrace {
  schema_version: number;
  duration_ms: number;
  expected_actions: number;
  actions: FixtureTraceAction[];
}

export interface FixtureTraceResult {
  method: string;
  actions_expected: number;
  actions_delivered: number;
  delivered_actions: FixtureTraceAction[];
  action_errors: string[];
  action_lateness_ms: number[];
  frames: Array<{ atMs: number; intervalMs: number; workMs: number; focused: boolean; visible: boolean;
    cards: number; tiles: number }>;
  checkpoints: Array<{ atMs: number; visibleIds: string[]; cardTextChars: number; readerChars: number;
    readerArticle: boolean; readerKey: string | null; selected: number; placed: number;
    yaw: number; zoom: number; zoomDx: number; zoomDy: number;
    focusKey: string | null; letGoVisible: boolean; reaching: string | null;
    visual: VisualCheckpoint | null }>;
  focus_lost: boolean;
  visibility_lost: boolean;
}

type ScreenRect = { x: number; y: number; width: number; height: number };
type VisibleText = { id: string; title: string; mark: string; face: string; owed: string; more: string };
export interface VisualCheckpoint {
  window: ScreenRect;
  field: ScreenRect;
  navigator: ScreenRect;
  reader: ScreenRect;
  cards: Array<{ key: string; band: string; detail: string; rect: ScreenRect; reached: boolean; text: VisibleText }>;
  tiles: Array<{ key: string; band: 'deep'; detail: 'tile'; rect: ScreenRect; text: string }>;
  panes: Array<{ key: string; rect: ScreenRect; bodyViewport: ScreenRect; scrollTop: number;
    scrollHeight: number; bodyText: string; bodyLayout: { fontFamily: string; fontSize: string;
      lineHeight: string; contentWidth: number; clientWidth: number; offsetWidth: number;
      paddingLeft: string; paddingRight: string } | null;
    tools: Array<{ id: string; rect: ScreenRect; text: string; label: string; pressed: boolean | null }>;
    links: Array<{ text: string; href: string }> }>;
  navigatorRows: Array<{ key: string; band: string; rect: ScreenRect; text: string }>;
  chrome: Array<{ id: string; rect: ScreenRect; text: string; selected?: boolean }>;
  readerArticleText: string | null;
  readerLinks: Array<{ text: string; href: string }>;
}

export interface OsFixtureObservation {
  method: 'trusted DOM events observed in the production fixture window';
  visual_input_stride: number;
  events: Array<{ atMs: number; type: string; target: string; x: number | null; y: number | null;
    deltaX: number | null; deltaY: number | null; deltaMode: number | null;
    key: string | null; code: string | null; shift: boolean | null; buttons: number | null }>;
  frames: Array<{ atMs: number; intervalMs: number; workMs: number; focused: boolean; visible: boolean }>;
  checkpoints: Array<{ atMs: number; frameAtMs: number; yaw: number; zoom: number; zoomDx: number; zoomDy: number;
    focusKey: string | null; reaching: string | null; reachedNeighbours: string[];
    selected: number; placed: number;
    readerKeys: string[]; inputIndices: number[]; frameIndex: number;
    trigger: 'periodic' | 'input-frame' | 'animation-frame';
    visual: VisualCheckpoint | null }>;
  focus_lost: boolean;
  visibility_lost: boolean;
  finalSlots: Array<Slot & { key: string }> | null;
}

const round = (value: number): number => Math.round(value * 100) / 100;
const rect = (box: DOMRect | ScreenRect): ScreenRect => ({ x: round(box.x), y: round(box.y),
  width: round(box.width), height: round(box.height) });
const intersects = (a: ScreenRect, b: ScreenRect): boolean => a.x < b.x + b.width
  && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const visibleText = (element: Element, selector: string): string => {
  const child = element.querySelector<HTMLElement>(selector);
  if (child === null || getComputedStyle(child).display === 'none'
    || getComputedStyle(child).visibility === 'hidden') return '';
  return child.textContent?.trim() ?? '';
};

/** Capture what the production renderer actually put inside the browser viewport. */
export function visualCheckpoint(glass: GlassField): VisualCheckpoint {
  const field = rect(requireElement('field').getBoundingClientRect());
  const navigator = rect(requireElement('navigator').getBoundingClientRect());
  const reader = rect(requireElement('reader').getBoundingClientRect());
  const window = { x: 0, y: 0, width: innerWidth, height: innerHeight };
  const cards = Array.from(document.querySelectorAll<HTMLElement>('#field-cards .field-card'))
    .filter((element) => element.getAttribute('aria-hidden') !== 'true' && !element.classList.contains('leaving'))
    .map((element) => ({ element, box: rect(element.getBoundingClientRect()) }))
    .filter(({ box }) => intersects(box, field) && intersects(box, window))
    .map(({ element, box }) => ({ key: element.dataset['noteId'] ?? '', band: element.dataset['band'] ?? '',
      detail: element.dataset['detail'] ?? '', rect: box, reached: element.classList.contains('reached'),
      text: { id: visibleText(element, '.fc-id'), title: visibleText(element, '.fc-title'),
        mark: visibleText(element, '.fc-mark'), face: visibleText(element, '.fc-face'),
        owed: visibleText(element, '.fc-owed'), more: visibleText(element, '.fc-more') } }));
  const tiles = glass.bandState().tiles.map((tile) => ({ key: tile.id, band: 'deep' as const,
    detail: 'tile' as const,
    rect: rect({ x: field.x + tile.x - tile.w / 2, y: field.y + tile.y - tile.h / 2,
      width: tile.w, height: tile.h }), text: tile.w >= 26 ? (glass.entryFor(tile.id)?.card.noteId ?? '') : '' }))
    .filter((tile) => intersects(tile.rect, field) && intersects(tile.rect, window));
  const navigatorRows = Array.from(document.querySelectorAll<HTMLElement>('#nav-list .nav-group, #nav-list .nav-row'))
    .map((element, index) => ({ element, index, box: rect(element.getBoundingClientRect()) }))
    .filter(({ box }) => intersects(box, navigator) && intersects(box, window))
    .map(({ element, index, box }) => ({ key: element.classList.contains('nav-group')
      ? `group:${index}:${element.textContent?.trim() ?? ''}` : element.dataset['noteId'] ?? '',
      band: element.classList.contains('nav-group') ? 'group' : element.dataset['band'] ?? '',
      rect: box, text: element.textContent?.trim() ?? '' }));
  const panes = Array.from(document.querySelectorAll<HTMLElement>('#field-panes .pane'))
    .map((element) => ({ element, box: rect(element.getBoundingClientRect()) }))
    .filter(({ box }) => intersects(box, field) && intersects(box, window))
    .map(({ element, box }) => {
      const body = element.querySelector<HTMLElement>('.pane-note');
      const bodyContainer = element.querySelector<HTMLElement>('.pane-body');
      const bodyViewport = bodyContainer === null ? { x: 0, y: 0, width: 0, height: 0 }
        : rect(bodyContainer.getBoundingClientRect());
      const bodyVisible = body !== null && bodyViewport.width > 0 && bodyViewport.height > 0
        && intersects(bodyViewport, field);
      const bodyStyle = body === null ? null : getComputedStyle(body);
      const containerStyle = bodyContainer === null ? null : getComputedStyle(bodyContainer);
      const tools = Array.from(element.querySelectorAll<HTMLButtonElement>('.pane-tools button'))
        .filter((button) => getComputedStyle(button).display !== 'none')
        .map((button) => ({ id: button.classList.item(0) ?? '', rect: rect(button.getBoundingClientRect()),
          text: button.textContent?.trim() ?? '', label: button.getAttribute('aria-label') ?? '',
          pressed: button.hasAttribute('aria-pressed') ? button.getAttribute('aria-pressed') === 'true' : null }));
      return { key: element.dataset['noteId'] ?? '', rect: box, bodyViewport,
        scrollTop: bodyContainer?.scrollTop ?? 0, scrollHeight: bodyContainer?.scrollHeight ?? 0,
        bodyText: bodyVisible ? (body?.textContent ?? '') : '',
        bodyLayout: body === null || bodyContainer === null || bodyStyle === null || containerStyle === null
          ? null : { fontFamily: bodyStyle.fontFamily, fontSize: bodyStyle.fontSize,
            lineHeight: bodyStyle.lineHeight, contentWidth: body.getBoundingClientRect().width,
            clientWidth: bodyContainer.clientWidth, offsetWidth: bodyContainer.offsetWidth,
            paddingLeft: containerStyle.paddingLeft, paddingRight: containerStyle.paddingRight },
        tools,
        links: !bodyVisible || body === null ? [] : Array.from(body.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .map((link) => ({ text: link.textContent?.trim() ?? '', href: link.getAttribute('href') ?? '' })) };
    });
  const chrome = ['rail', '.nav-bar', '.field-bar', 'compass', 'field-ring', 'field-panes', 'status']
    .map((id) => ({ id, element: id.startsWith('.') ? document.querySelector<HTMLElement>(id) : document.getElementById(id) }))
    .filter((item): item is { id: string; element: HTMLElement } => item.element !== null && !item.element.hidden)
    .map(({ id, element }) => ({ id, rect: rect(element.getBoundingClientRect()),
      text: id === 'field-panes' ? element.getAttribute('data-count') ?? '' : element.textContent?.trim() ?? '' }));
  const topBar = document.querySelector<HTMLElement>('header.bar');
  if (topBar !== null) {
    const visible = (element: HTMLElement): boolean => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden'
        && box.width > 0 && box.height > 0 && intersects(rect(box), window);
    };
    const add = (id: string, element: HTMLElement | null): void => {
      if (element === null || !visible(element)) return;
      const selected = element.getAttribute('aria-selected') ?? element.getAttribute('aria-checked');
      chrome.push({ id, rect: rect(element.getBoundingClientRect()), text: element.innerText.trim(),
        ...(selected === null ? {} : { selected: selected === 'true' }) });
    };
    add('bar', topBar);
    add('brand', topBar.querySelector<HTMLElement>('.brand'));
    add('switcher', topBar.querySelector<HTMLElement>('#switcher'));
    for (const [index, button] of Array.from(topBar.querySelectorAll<HTMLElement>('#switcher button')).entries()) {
      add(`switcher:${button.dataset['viewId'] ?? index}`, button);
    }
    add('surface-toggle', topBar.querySelector<HTMLElement>('#surface-toggle'));
    for (const [index, button] of Array.from(topBar.querySelectorAll<HTMLElement>('#surface-toggle button')).entries()) {
      add(`surface:${button.dataset['surface'] ?? index}`, button);
    }
    add('bar-right', topBar.querySelector<HTMLElement>('.bar-right'));
    for (const id of ['host-mark', 'follow', 'hide-notes', 'copy-address', 'open-address', 'pop-out']) {
      add(id, topBar.querySelector<HTMLElement>(`#${id}`));
    }
  }
  const addNavigatorChrome = (id: string, element: HTMLElement | null, text: string,
    selected?: boolean): void => {
    if (element === null || element.hidden) return;
    const style = getComputedStyle(element);
    const box = rect(element.getBoundingClientRect());
    if (style.display === 'none' || style.visibility === 'hidden' || box.width <= 0 || box.height <= 0
      || !intersects(box, window)) return;
    chrome.push({ id, rect: box, text, ...(selected === undefined ? {} : { selected }) });
  };
  for (const [index, button] of Array.from(document.querySelectorAll<HTMLElement>('#rail button')).entries()) {
    const prefix = button.querySelector('.kind') === null ? 'workspace-add' : `workspace:${index}`;
    addNavigatorChrome(prefix, button, button.innerText.trim(), button.getAttribute('aria-current') === 'true');
    if (prefix === 'workspace-add') continue;
    addNavigatorChrome(`${prefix}:name`, button.querySelector<HTMLElement>('span:not(.kind)'),
      button.querySelector<HTMLElement>('span:not(.kind)')?.innerText.trim() ?? '');
    addNavigatorChrome(`${prefix}:kind`, button.querySelector<HTMLElement>('.kind'),
      button.querySelector<HTMLElement>('.kind')?.innerText.trim() ?? '');
  }
  const search = document.querySelector<HTMLInputElement>('#search');
  addNavigatorChrome('search', search, search?.value || search?.placeholder || '');
  for (const id of ['status-filter', 'type-filter']) {
    const select = document.getElementById(id) as HTMLSelectElement | null;
    addNavigatorChrome(id, select, select?.selectedOptions[0]?.textContent?.trim() ?? '');
  }
  const navCount = document.getElementById('nav-count');
  addNavigatorChrome('nav-count', navCount, navCount?.innerText.trim() ?? '');
  const letGo = document.getElementById('let-go');
  addNavigatorChrome('let-go', letGo, letGo?.innerText.trim() ?? '');
  const article = requireElement('reader').querySelector('article');
  const visibleArticle = reader.width > 0 && reader.height > 0 ? article : null;
  return { window, field, navigator, reader, cards, tiles, panes, navigatorRows, chrome,
    readerArticleText: visibleArticle?.textContent ?? null,
    readerLinks: visibleArticle === null ? [] : Array.from(visibleArticle.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .map((link) => ({ text: link.textContent?.trim() ?? '', href: link.getAttribute('href') ?? '' })) };
}

const requireElement = (id: string): HTMLElement => {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`fixture trace needs #${id}`);
  return element;
};

/** Observe OS-delivered input without claiming it matched the semantic trace. */
export async function observeOsFixture(glass: GlassField, durationMs: number,
  captureVisual = false, visualInputStride = 1): Promise<OsFixtureObservation> {
  if (!Number.isInteger(durationMs) || durationMs < 1000 || durationMs > 300000) {
    throw new Error('OS observation duration must be 1,000–300,000 ms');
  }
  if (!Number.isInteger(visualInputStride) || visualInputStride < 1 || visualInputStride > 1000
    || (!captureVisual && visualInputStride !== 1)) {
    throw new Error('visual input stride needs visual capture and must be 1–1,000');
  }
  const events: OsFixtureObservation['events'] = [];
  const frames: OsFixtureObservation['frames'] = [];
  const checkpoints: OsFixtureObservation['checkpoints'] = [];
  let focusLost = false;
  let visibilityLost = false;
  const started = performance.now();
  let last = started;
  let nextCheckpoint = 0;
  let animationUntil = -Infinity;
  const pendingInputIndices: number[] = [];
  const observe = (event: Event): void => {
    if (!event.isTrusted) return;
    const pointer = event instanceof MouseEvent ? event : null;
    const wheel = event instanceof WheelEvent ? event : null;
    const key = event instanceof KeyboardEvent ? event : null;
    const element = event.target instanceof Element ? event.target : null;
    events.push({ atMs: round(performance.now() - started), type: event.type,
      target: element?.id || element?.className?.toString().slice(0, 80) || element?.tagName || '',
      x: pointer?.clientX ?? null, y: pointer?.clientY ?? null,
      deltaX: wheel?.deltaX ?? null, deltaY: wheel?.deltaY ?? null,
      deltaMode: wheel?.deltaMode ?? null, key: key?.key ?? null, code: key?.code ?? null,
      shift: pointer?.shiftKey ?? key?.shiftKey ?? null, buttons: pointer?.buttons ?? null });
    pendingInputIndices.push(events.length - 1);
    if (captureVisual && key?.type === 'keydown' && ['Equal', 'Minus', 'Digit0', 'NumpadAdd',
      'NumpadSubtract', 'Numpad0'].includes(key.code)) animationUntil = performance.now() - started + 200;
  };
  const types = ['pointermove', 'pointerdown', 'pointerup', 'wheel', 'keydown', 'keyup'];
  for (const type of types) document.addEventListener(type, observe, { capture: true, passive: true });
  (window as Window & { __deckOsReady?: boolean }).__deckOsReady = true;
  try {
    await new Promise<void>((resolve) => {
      const step = (now: number): void => {
        const atMs = now - started;
        const began = performance.now();
        const focused = document.hasFocus();
        const visible = document.visibilityState === 'visible';
        if (!focused) focusLost = true;
        if (!visible) visibilityLost = true;
        const periodicCheckpoint = atMs >= nextCheckpoint;
        const animationCheckpoint = captureVisual && atMs <= animationUntil;
        if (periodicCheckpoint || pendingInputIndices.length > 0 || animationCheckpoint) {
          const inputIndices = pendingInputIndices.splice(0);
          const sampledInput = inputIndices.some((index) => index % visualInputStride === 0);
          const visual = captureVisual && (periodicCheckpoint || animationCheckpoint || sampledInput)
            ? visualCheckpoint(glass) : null;
          const bands = glass.bandState();
          const zoom = glass.zoom();
          // The rAF timestamp can predate an input delivered before this callback.
          // Timestamp the observed state after reading it so an input-frame
          // checkpoint cannot appear to occur before its own trusted receipt.
          checkpoints.push({ atMs: round(performance.now() - started), frameAtMs: round(atMs),
            yaw: glass.model.yaw, zoom: zoom.scale,
            zoomDx: zoom.dx, zoomDy: zoom.dy, focusKey: glass.focusState().noteId,
            reaching: glass.reaching()?.noteId ?? null,
            reachedNeighbours: glass.reaching()?.neighbours ?? [], selected: bands.dealt,
            placed: Object.values(bands.counts).reduce((sum, count) => sum + count, 0),
            readerKeys: visual?.panes.map((pane) => pane.key) ?? [], inputIndices,
            frameIndex: frames.length, trigger: inputIndices.length ? 'input-frame'
              : animationCheckpoint ? 'animation-frame' : 'periodic',
            visual });
        }
        if (periodicCheckpoint) {
          nextCheckpoint += 1000;
        }
        frames.push({ atMs: round(atMs), intervalMs: round(now - last),
          workMs: round(performance.now() - began), focused, visible });
        last = now;
        if (atMs >= durationMs) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  } finally {
    for (const type of types) document.removeEventListener(type, observe, true);
    (window as Window & { __deckOsReady?: boolean }).__deckOsReady = false;
  }
  return { method: 'trusted DOM events observed in the production fixture window',
    visual_input_stride: visualInputStride, events, frames,
    checkpoints, focus_lost: focusLost, visibility_lost: visibilityLost,
    finalSlots: captureVisual ? Array.from(glass.model.current.slots,
      ([key, slot]) => ({ key, ...slot })) : null };
}

/**
 * This replay is diagnostic: it sends wheel actions through Glass's real DOM
 * handler, but named-note actions use the same public methods the app uses.
 * It is not an OS-delivered input latency measurement.
 */
export async function replayFixtureTrace(glass: GlassField, trace: FixtureTrace,
  outgoing: Record<string, string[]>, captureVisual = false): Promise<FixtureTraceResult> {
  if (trace.schema_version !== 1 || !Number.isInteger(trace.duration_ms) || trace.duration_ms < 1000
    || trace.actions.length !== trace.expected_actions) throw new Error('invalid fixture trace');
  let previous = -1;
  for (const action of trace.actions) {
    if (!Number.isInteger(action.at_ms) || action.at_ms < previous || action.at_ms >= trace.duration_ms) {
      throw new Error('fixture trace action times are not ordered inside the duration');
    }
    previous = action.at_ms;
  }
  const field = requireElement('field');
  const reader = requireElement('reader');
  const letGo = requireElement('let-go');
  const errors: string[] = [];
  const pending = new Set<Promise<void>>();
  let readerKey: string | null = null;
  let linkIndex = 0;
  const deliver = (action: FixtureTraceAction): void => {
    const key = action.key;
    const slot = key === undefined ? undefined : glass.model.current.slots.get(key);
    const entry = key === undefined ? undefined : glass.entryFor(key);
    const watch = (work: Promise<void>): void => {
      pending.add(work);
      void work.catch((error: unknown) => errors.push(`${action.action}: ${String(error)}`))
        .finally(() => pending.delete(work));
    };
    if (['locate', 'hover', 'select', 'pull', 'open'].includes(action.action) && (slot === undefined || entry === undefined)) {
      errors.push(`${action.action}: key ${String(key)} is not placed in production Glass`);
      return;
    }
    switch (action.action) {
      case 'locate':
        // Native's trace locate is an immediate camera move. A production
        // flight would still be moving when the next 17 ms action arrived.
        glass.model.face(slot!.theta);
        glass.render(false);
        break;
      case 'pan': {
        const dx = action.x ?? 0;
        field.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true,
          deltaX: dx, deltaY: 0, shiftKey: true }));
        break;
      }
      case 'zoom': {
        const factor = action.factor ?? 1;
        if (!(factor > 0) || !Number.isFinite(factor)) { errors.push('zoom: invalid factor'); break; }
        const box = field.getBoundingClientRect();
        field.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true,
          deltaY: -Math.log(factor) / WHEEL_RATE,
          clientX: box.left + (action.x ?? 0.5) * box.width,
          clientY: box.top + (action.y ?? 0.5) * box.height }));
        break;
      }
      case 'hover':
        glass.reachFor(key!);
        break;
      case 'select':
      case 'open':
        readerKey = key!;
        watch(glass.lift(entry!.card));
        break;
      case 'pull':
        watch(glass.pull(entry!));
        break;
      case 'reset_pulls':
        letGo.click();
        break;
      case 'scroll_reader': {
        const pane = Array.from(document.querySelectorAll<HTMLElement>('#field-panes .pane'))
          .find((element) => element.dataset['noteId'] === readerKey);
        const body = pane?.querySelector<HTMLElement>('.pane-body');
        const text = pane?.querySelector<HTMLElement>('.pane-note');
        if (body === undefined || body === null || text === undefined || text === null) {
          errors.push(`scroll_reader: visible pane for ${String(readerKey)} is not open`);
          break;
        }
        const lineHeight = Number.parseFloat(getComputedStyle(text).lineHeight);
        body.scrollTop += (action.lines ?? 1) * (Number.isFinite(lineHeight) ? lineHeight : 20);
        break;
      }
      case 'follow_link': {
        const keys = readerKey === null ? [] : (outgoing[readerKey] ?? []);
        const next = action.key ?? keys[linkIndex % keys.length];
        if (next === undefined) { errors.push(`follow_link: no outgoing note from ${readerKey}`); break; }
        if (!keys.includes(next)) { errors.push(`follow_link: ${next} is not linked from ${readerKey}`); break; }
        const linked = glass.entryFor(next);
        if (linked === undefined || !glass.model.current.slots.has(next)) {
          errors.push(`follow_link: ${next} is outside the placed population`);
          break;
        }
        linkIndex += 1;
        readerKey = next;
        watch(glass.lift(linked.card));
        break;
      }
      default:
        errors.push(`unsupported action: ${action.action}`);
    }
  };
  const frames: FixtureTraceResult['frames'] = [];
  const checkpoints: FixtureTraceResult['checkpoints'] = [];
  const lateness: number[] = [];
  const deliveredActions: FixtureTraceAction[] = [];
  let focusLost = false;
  let visibilityLost = false;
  let index = 0;
  let nextCheckpoint = 0;
  let last = performance.now();
  const start = last;
  await new Promise<void>((resolve) => {
    const step = (now: number): void => {
      const atMs = now - start;
      const intervalMs = now - last;
      last = now;
      const focused = document.hasFocus();
      const visible = document.visibilityState === 'visible';
      if (!focused) focusLost = true;
      if (!visible) visibilityLost = true;
      const began = performance.now();
      while (index < trace.actions.length && trace.actions[index]!.at_ms <= atMs) {
        const action = trace.actions[index]!;
        lateness.push(atMs - action.at_ms);
        deliveredActions.push(action);
        deliver(action);
        index += 1;
      }
      if (atMs >= nextCheckpoint) {
        const visibleIds = glass.drawnNotes();
        const cardTextChars = Array.from(document.querySelectorAll<HTMLElement>('#field-cards .field-card'))
          .reduce((sum, element) => sum + (element.textContent?.length ?? 0), 0);
        const bands = glass.bandState();
        checkpoints.push({ atMs, visibleIds, cardTextChars, readerChars: reader.textContent?.length ?? 0,
          readerArticle: reader.querySelector('article') !== null, readerKey,
          selected: bands.dealt, placed: Object.values(bands.counts).reduce((sum, count) => sum + count, 0),
          yaw: glass.model.yaw, zoom: glass.zoom().scale,
          zoomDx: glass.zoom().dx, zoomDy: glass.zoom().dy,
          focusKey: glass.focusState().noteId, letGoVisible: !letGo.hidden,
          reaching: glass.reaching()?.noteId ?? null,
          visual: captureVisual ? visualCheckpoint(glass) : null });
        nextCheckpoint += 1000;
      }
      const counts = glass.counts();
      frames.push({ atMs, intervalMs, workMs: performance.now() - began, focused, visible,
        cards: counts.cards, tiles: counts.tiles });
      if (atMs >= trace.duration_ms && index === trace.actions.length) { resolve(); return; }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  await Promise.allSettled([...pending]);
  return { method: 'Chromium rAF scheduling; DOM wheel events and direct named-note Glass methods; no OS input latency',
    actions_expected: trace.actions.length, actions_delivered: index, action_errors: errors,
    delivered_actions: deliveredActions,
    action_lateness_ms: lateness, frames, checkpoints, focus_lost: focusLost, visibility_lost: visibilityLost };
}
