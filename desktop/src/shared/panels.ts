/**
 * What a popped-out window can carry.
 *
 * A pop-out used to be the same view again with no navigation, which is why
 * this phase's second exit criterion was written down as the duplicate that
 * existed rather than the status window that was wanted (TASK-0026).
 *
 * The vocabulary is CLOSED, and it is closed by a registry rather than by a
 * literal list (TASK-0052). The rule is unchanged: the address grammar refuses
 * a panel it does not know, the same way it refuses a view it cannot read,
 * because a window that quietly carries something other than what its address
 * names is the silent fallback this project already paid for once. What
 * changed is who closes it. A phase that builds a new kind of panel — a page,
 * an editor, a flow step — registers it beside what it built, and until it
 * does, no address can name it.
 */
import { Vocabulary } from './registry.js';
import type { PanelType } from './types.js';

/** The panel kinds this build can draw. Empty until something registers one. */
export const panelKinds = new Vocabulary('panel');

/**
 * The three panels Deck draws today, registered from here rather than from the
 * parser: this module is where they are named, and the renderer's stylesheet
 * and layout are what actually build them.
 *
 * Called by both hosts. The main process needs the vocabulary to validate the
 * address of a window it is asked to open; the renderer needs it to offer the
 * choice and to read its own address. Registering twice is a no-operation, so
 * neither has to care which ran first.
 */
export function registerDeckPanels(): void {
  panelKinds.register({ id: 'needs-you', label: 'What needs you' });
  panelKinds.register({ id: 'note', label: 'The focused note' });
  panelKinds.register({ id: 'desk', label: 'The desk' });
}

registerDeckPanels();

export function isPanelType(value: unknown): value is PanelType {
  return panelKinds.has(value);
}

/** A panel read from somewhere untrusted: an address, a query string, a saved window. */
export function panelOrNull(value: unknown): PanelType | null {
  return isPanelType(value) ? value : null;
}

/** What a person calls this panel, or the id itself if nothing named it. */
export function panelLabel(id: string): string {
  return panelKinds.label(id) ?? id;
}
