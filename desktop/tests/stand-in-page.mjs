// A stand-in page, for the suites that drive a BUILT renderer module.
//
// The renderer's modules are written for a browser, and the suites run in
// node. Most of what a renderer module decides is in `src/shared/` and is
// tested there. What is left is which listener is attached when, and where
// the keyboard is afterwards: a drag that Escape was meant to end, and a row
// that was asked whether it exists and not whether it took the keyboard. Both
// passed every suite while they were wrong, because no suite loaded the code.
//
// This is not a browser. It lays nothing out and draws nothing. It keeps the
// listeners an element was given, sends them the events a test fires, and
// remembers which element has the keyboard. A check that needs layout, paint
// or real focus order belongs to a scripted walk (`desktop/demos/`).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { desktopRoot } from './helpers.mjs';

export class El {
  constructor(name = '') {
    this.name = name;
    this.listeners = [];
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.hidden = false;
    this.tabIndex = -1;
    /** False stands for an element that is not on screen: it cannot take the keyboard. */
    this.focusable = true;
    this.style = { setProperty() {}, removeProperty() {} };
    const classes = new Set();
    this.classList = {
      add: (c) => void classes.add(c),
      remove: (c) => void classes.delete(c),
      toggle: (c, on) => void (on ? classes.add(c) : classes.delete(c)),
      contains: (c) => classes.has(c),
    };
  }

  addEventListener(type, fn, capture = false) {
    this.listeners.push({ type, fn, capture: capture === true });
  }

  removeEventListener(type, fn, capture = false) {
    this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === fn && l.capture === (capture === true)));
  }

  /**
   * Send an event to this element's own listeners, the capturing ones first,
   * as a browser does for the listeners of one element. A listener that stops
   * the event keeps it from the ones after its phase. The event is answered,
   * so a test can ask whether it was used.
   */
  fire(type, init = {}) {
    const event = {
      type,
      target: this,
      currentTarget: this,
      button: 0,
      pointerId: 1,
      defaultPrevented: false,
      stopped: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.stopped = true;
      },
      ...init,
    };
    for (const capture of [true, false]) {
      if (event.stopped) break;
      for (const l of [...this.listeners]) if (l.type === type && l.capture === capture) l.fn(event);
    }
    return event;
  }

  focus() {
    if (this.focusable) globalThis.document.activeElement = this;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  append(...children) {
    this.children.push(...children);
  }

  insertBefore(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = children;
  }

  contains(other) {
    return other === this || this.children.some((c) => c instanceof El && c.contains(other));
  }

  closest() {
    return null;
  }

  querySelector() {
    return null;
  }

  setPointerCapture() {}

  scrollIntoView() {}

  getBoundingClientRect() {
    return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
  }
}

/** Put a stand-in page in place of the browser's globals, and answer its document. */
export function standInPage() {
  const document = new El('document');
  document.activeElement = null;
  document.createElement = (tag) => new El(tag);
  globalThis.HTMLElement = El;
  globalThis.Node = El;
  globalThis.document = document;
  globalThis.requestAnimationFrame = () => 0;
  return document;
}

let copied = null;

/**
 * Load a built renderer module, by its path under `dist/web`.
 *
 * The web build is ES modules in a directory whose package says nothing of
 * modules, which a browser does not mind and node may. So the build is copied
 * once to a directory that says it, and loaded from there.
 */
export async function loadWeb(relative) {
  if (copied === null) {
    copied = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-web-'));
    const dir = copied;
    process.on('exit', () => fs.rmSync(dir, { recursive: true, force: true }));
    for (const part of ['renderer', 'shared']) fs.cpSync(path.join(desktopRoot, 'dist', 'web', part), path.join(dir, part), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), '{"type":"module"}\n');
  }
  return import(pathToFileURL(path.join(copied, relative)).href);
}
