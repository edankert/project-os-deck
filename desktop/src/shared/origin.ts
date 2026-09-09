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
