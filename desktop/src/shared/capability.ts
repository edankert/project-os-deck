/**
 * Capability sets, one per host. The renderer asks which set it is running
 * under; it never tests for `window.require` or reads a user agent, because
 * both of those are wrong the first time either changes.
 */
import type { Capabilities } from './types.js';

export const SHELL_CAPABILITIES: Capabilities = {
  popOutWindows: true,
  clipboard: true,
  manageWorkspaces: true,
  sharedStore: true,
};

/** Everything the served host can honestly offer, which is reading. */
export const SERVED_CAPABILITIES: Capabilities = {
  popOutWindows: false,
  clipboard: false,
  manageWorkspaces: false,
  sharedStore: false,
};

/**
 * Read a capability from an untrusted object: an older or newer host may send
 * a set this renderer does not know, and an unknown name is ignored rather
 * than treated as permission.
 */
export function can(caps: Partial<Capabilities> | null | undefined, name: keyof Capabilities): boolean {
  return caps?.[name] === true;
}

export function normaliseCapabilities(value: unknown): Capabilities {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    popOutWindows: source['popOutWindows'] === true,
    clipboard: source['clipboard'] === true,
    manageWorkspaces: source['manageWorkspaces'] === true,
    sharedStore: source['sharedStore'] === true,
  };
}
