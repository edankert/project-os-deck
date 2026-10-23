/**
 * A real pointer and a real keyboard for a scripted walk (`drive.ts`).
 *
 * Every pointer goes through `sendInputEvent`, which the browser hit-tests the
 * way it hit-tests a person's pointer. DES-0002 lost two revisions to a
 * synthetic click that never hit-tested. Moved here from the Glass smoke checks
 * when they left with Glass on 2026-10-23 (ADR-0010).
 */
import { execFileSync } from 'node:child_process';
import type { BrowserWindow } from 'electron';

export type Step = { type: 'down' | 'move' | 'up'; x: number; y: number; wait?: number; alt?: boolean; /** The middle button turns and pans the overview (TASK-0156). */ button?: 'left' | 'middle'; shift?: boolean };

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A real pointer, sent to the window the way the operating system sends one.
 *
 * **The button has to be SAID to be down.** A mouse reports its held button
 * on every event, and Electron's `sendInputEvent` reports none unless the
 * event carries `leftButtonDown`: the press arrived with `buttons` at 0, so
 * the browser refused `setPointerCapture` without a word and every drag of a
 * card or a pane went to whatever was under the pointer. The field's own turn
 * still worked, because it never needed the capture, which is what made the
 * cause hard to see.
 */
const buttonDown = new WeakMap<BrowserWindow, boolean>();
const buttonHeld = new WeakMap<BrowserWindow, 'left' | 'middle'>();

export async function pointer(win: BrowserWindow, steps: Step[]): Promise<void> {
  // Remembered per window across calls: a drag sent in two calls is one drag,
  // and a move sent without the button between them is a release.
  let down = buttonDown.get(win) === true;
  let held = buttonHeld.get(win) ?? 'left';
  for (const step of steps) {
    const modifiers: Array<'alt' | 'shift' | 'leftButtonDown' | 'middleButtonDown'> = [...(step.alt === true ? ['alt' as const] : []), ...(step.shift === true ? ['shift' as const] : [])];
    const x = Math.round(step.x);
    const y = Math.round(step.y);
    if (step.type === 'down') {
      down = true;
      held = step.button ?? 'left';
      win.webContents.sendInputEvent({ type: 'mouseDown', x, y, button: held, clickCount: 1, modifiers: [...modifiers, held === 'middle' ? 'middleButtonDown' : 'leftButtonDown'] });
    } else if (step.type === 'up') {
      down = false;
      win.webContents.sendInputEvent({ type: 'mouseUp', x, y, button: held, clickCount: 1, modifiers });
    } else {
      win.webContents.sendInputEvent({ type: 'mouseMove', x, y, modifiers: down ? [...modifiers, held === 'middle' ? 'middleButtonDown' : 'leftButtonDown'] : modifiers });
    }
    buttonDown.set(win, down);
    buttonHeld.set(win, held);
    await delay(step.wait ?? 16);
  }
}

export function click(at: { x: number; y: number }, alt = false): Step[] {
  return [
    { type: 'move', ...at, alt },
    { type: 'down', ...at, alt },
    { type: 'up', ...at, alt, wait: 60 },
  ];
}

/** A drag from one point to another in `count` moves. */
export function drag(from: { x: number; y: number }, to: { x: number; y: number }, count = 10, wait = 16, how: { button?: 'left' | 'middle'; shift?: boolean } = {}): Step[] {
  const steps: Step[] = [{ type: 'move', ...from, ...how }, { type: 'down', ...from, ...how }];
  for (let i = 1; i <= count; i += 1) {
    steps.push({ type: 'move', x: from.x + ((to.x - from.x) * i) / count, y: from.y + ((to.y - from.y) * i) / count, wait, ...how });
  }
  steps.push({ type: 'up', ...to, wait: 60, ...how });
  return steps;
}

export function press(win: BrowserWindow, key: string, modifiers: Array<'alt' | 'shift' | 'meta'> = []): void {
  win.webContents.sendInputEvent({ type: 'keyDown', keyCode: key, modifiers });
  // A button is pressed by the key's character, not by the key: Enter needs its `\r`.
  if (key.length === 1) win.webContents.sendInputEvent({ type: 'char', keyCode: key, modifiers });
  else if (key === 'Return') win.webContents.sendInputEvent({ type: 'char', keyCode: '\r', modifiers });
  win.webContents.sendInputEvent({ type: 'keyUp', keyCode: key, modifiers });
}

/** `git status --porcelain` in a workspace, or null when it is not a repository. */
export function gitStatus(root: string): string | null {
  try {
    return execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf-8' });
  } catch {
    return null;
  }
}
