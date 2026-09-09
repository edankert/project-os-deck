/**
 * Whether a page is one Deck itself serves.
 *
 * A `BrowserWindow`'s preload runs on every document its `webContents` loads,
 * so the write channel follows the window wherever it goes unless something
 * stops it (ISS-0029). This is the question the main process asks before it
 * lets a window navigate, and it is here rather than beside the caller so it
 * can be driven without opening a window.
 *
 * **Compared by ORIGIN, never by prefix.** `http://127.0.0.1:7300.example.test`
 * starts with the host origin and is somebody else's machine.
 */
export function sameOriginAs(host: string, url: string): boolean {
  try {
    return new URL(url).origin === new URL(host).origin;
  } catch {
    // A `javascript:` URL, a `file:` URL or anything that will not parse is
    // not the page Deck serves.
    return false;
  }
}

/** What a window should do when a page tries to take it somewhere. */
export type Navigation = 'follow' | 'open-outside' | 'refuse';

/**
 * Where a link in a Deck window may lead.
 *
 * Three answers, and the third is the one that was missing. A page Deck serves
 * is FOLLOWED. An ordinary web page is OPENED OUTSIDE, in the person's own
 * browser, because refusing it silently would make a link in a note look
 * broken. Anything else is REFUSED — `file:`, `javascript:`, a custom scheme —
 * because handing one of those to the operating system's opener is not what
 * "open a link in the browser" means, and the guard used to hand it over
 * (ISS-0032).
 *
 * A decision rather than a side effect, so it can be driven without opening a
 * window: the previous version was checked by searching the built file for
 * three strings, which survives inverting the condition it claims to protect.
 */
export function navigationFor(host: string, url: string): Navigation {
  if (sameOriginAs(host, url)) return 'follow';
  let scheme: string;
  try {
    scheme = new URL(url).protocol;
  } catch {
    return 'refuse';
  }
  return scheme === 'http:' || scheme === 'https:' ? 'open-outside' : 'refuse';
}
