/**
 * The cockpit's digest for "since you last looked" (FEAT-0034, TASK-0203), read through the
 * host from `/api/cockpit/digest`, which the sidecar gives to any caller. Kept per workspace,
 * read again every minute and after Caught up; the overview draws again when it changes.
 */
import { digestOf, type Digest } from '../shared/overview-cockpit.js';

const EVERY_MS = 60_000;

let read: ((workspaceId: string, sidecarPath: string) => Promise<unknown>) | null = null;
let redraw: () => void = () => undefined;
const digests = new Map<string, Digest | null | undefined>();
const shapes = new Map<string, string>();

export function initDigest(reader: (workspaceId: string, sidecarPath: string) => Promise<unknown>, onChange: () => void): void {
  if (read !== null) return;
  read = reader;
  redraw = onChange;
  setInterval(() => {
    for (const workspaceId of digests.keys()) void reloadDigest(workspaceId);
  }, EVERY_MS);
}

/** The digest: undefined until it is read, null when the sidecar gives none. */
export function digestFor(workspaceId: string): Digest | null | undefined {
  if (read === null) return undefined;
  if (!digests.has(workspaceId)) {
    digests.set(workspaceId, undefined);
    void reloadDigest(workspaceId);
  }
  return digests.get(workspaceId);
}

export async function reloadDigest(workspaceId: string): Promise<void> {
  if (read === null) return;
  let digest: Digest | null;
  try {
    digest = digestOf(await read(workspaceId, '/api/cockpit/digest'));
  } catch {
    digest = null;
  }
  digests.set(workspaceId, digest);
  const shape = JSON.stringify(digest);
  if (shapes.get(workspaceId) === shape) return;
  shapes.set(workspaceId, shape);
  redraw();
}
