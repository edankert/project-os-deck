/**
 * One directory, one spelling.
 *
 * macOS reaches a single directory through more than one path string: the
 * filesystem is case-insensitive, so `/Users/edwin/Dev` and `/Users/Edwin/Dev`
 * are the same directory, and symbolic links add more spellings still. Every
 * comparison Deck makes between two paths — is this the workspace that sidecar
 * is serving, is this workspace already in the book — has to be made on the
 * directory rather than on the text, or one directory is treated as two.
 *
 * That is not hypothetical. On 2026-09-08 Deck started a second sidecar on a
 * repository the cockpit was already serving, and left that repository's
 * `.cockpit/url` naming a port nobody was listening on, because the cockpit
 * had been launched with `/Users/edwin/...` and Deck held `/Users/Edwin/...`
 * (ISS-0023, and the reason RISK-0001 reopened).
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * The one spelling of this directory that the file system itself uses.
 *
 * `fs.realpathSync.native` calls the platform's `realpath`, which follows
 * every symbolic link AND returns the case that is on disk. A path that will
 * not resolve — it is gone, or unreadable — falls back to `path.resolve`,
 * which is what these comparisons did before and is never worse than it was.
 */
export function realDirectory(value: string): string {
  const resolved = path.resolve(value);
  try {
    return fs.realpathSync.native(resolved);
  } catch {
    return resolved;
  }
}

/** Whether two path strings name one directory on this machine. */
export function sameDirectory(a: string, b: string): boolean {
  return realDirectory(a) === realDirectory(b);
}
