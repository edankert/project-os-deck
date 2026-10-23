/**
 * Inside one shell's frame (FEAT-0035, TASK-0206): xterm.js draws the shell's output and sends
 * back what is typed and the size that fits. The frame never reaches the shell itself; the
 * drawer, in Deck's page, does, and it is the only window it answers. The frame shares Deck's
 * origin, so it could reach the page; it runs this file and xterm.js and nothing else.
 */
interface XTerm {
  open(el: HTMLElement): void;
  write(data: string): void;
  onData(fn: (data: string) => void): void;
  loadAddon(addon: unknown): void;
  focus(): void;
  cols: number;
  rows: number;
  options: Record<string, unknown>;
}
declare const Terminal: new (options: Record<string, unknown>) => XTerm;
declare const FitAddon: { FitAddon: new () => { fit(): void } };

type FromDrawer = { kind: 'data'; data: string } | { kind: 'focus' } | { kind: 'ended'; code: number };

const term = new Terminal({
  fontFamily: '"SF Mono", Menlo, Consolas, monospace',
  fontSize: 13,
  cursorBlink: true,
  scrollback: 5000,
  theme: { background: '#06101a', foreground: '#d8eef6', cursor: '#7fe3ff', selectionBackground: '#2a5a78' },
});
const fit = new FitAddon.FitAddon();
term.loadAddon(fit);
term.open(document.getElementById('terminal')!);

const drawer = window.parent;
const say = (message: unknown): void => drawer.postMessage(message, location.origin);

let last = '';
const sizeUp = (): void => {
  fit.fit();
  const size = `${term.cols}x${term.rows}`;
  if (size === last) return;
  last = size;
  say({ kind: 'size', cols: term.cols, rows: term.rows });
};
new ResizeObserver(() => sizeUp()).observe(document.body);

term.onData((data) => say({ kind: 'input', data }));

window.addEventListener('message', (event: MessageEvent) => {
  // Only the drawer that holds this frame speaks to it.
  if (event.source !== drawer || event.origin !== location.origin) return;
  const m = event.data as FromDrawer;
  if (m.kind === 'data' && typeof m.data === 'string') term.write(m.data);
  else if (m.kind === 'focus') term.focus();
  else if (m.kind === 'ended') term.write(`\r\n\x1b[2m[the shell ended${m.code === 0 ? '' : ` with ${m.code}`}]\x1b[0m\r\n`);
});

sizeUp();
say({ kind: 'ready', cols: term.cols, rows: term.rows });
