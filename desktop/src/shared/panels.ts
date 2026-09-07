/**
 * What a popped-out window can carry.
 *
 * Three panels, named once here. A pop-out used to be the same view again with
 * no navigation, which is why this phase's second exit criterion was written
 * down as the duplicate that existed rather than the status window that was
 * wanted (TASK-0026).
 *
 * The vocabulary is closed on purpose. The address grammar refuses a panel it
 * does not know, the same way it refuses a view it cannot read: a window that
 * quietly carries something other than what its address names is the silent
 * fallback this project already paid for once.
 */
import type { PanelType } from './types.js';

export const PANEL_TYPES: readonly PanelType[] = ['needs-you', 'note', 'desk'] as const;

export const PANEL_LABELS: Record<PanelType, string> = {
  'needs-you': 'What needs you',
  note: 'The focused note',
  desk: 'The desk',
};

export function isPanelType(value: unknown): value is PanelType {
  return typeof value === 'string' && (PANEL_TYPES as readonly string[]).includes(value);
}

/** A panel read from somewhere untrusted: an address, a query string, a saved window. */
export function panelOrNull(value: unknown): PanelType | null {
  return isPanelType(value) ? value : null;
}
