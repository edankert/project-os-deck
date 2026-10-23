/**
 * The session pane in Deck (FEAT-0033, TASK-0197): one session drawn on the right of the
 * overview, turn by turn, as `shared/agent-pane.ts` lays it out (DES-0006, the way T3 Code
 * draws a conversation).
 *
 * New records stream in as the main process reports them; a reader who has scrolled up
 * stays where they are. Agent text is always set as text, never as HTML. The pane exists
 * only in the shell: on a served page `Host.agents()` is null and nothing here is made
 * (RISK-0015).
 */
import type { AgentBridge } from './host-bridge.js';
import type { ConversationRecord, SessionRecord } from '../shared/agent-types.js';
import { ACCESS_WORD, ANSWER_WORD, AGENT_GLYPH, AGENT_WORD, EFFORTS, MODELS, STATE_WORD, composerOf, paneOf, type PaneItem, type PaneModel } from '../shared/agent-pane.js';
import type { AgentSummary } from '../shared/agent-marks.js';
import { hasShells, openShell } from './shell-drawer.js';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls !== '') e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const time = (iso: string): string => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export interface AgentPaneOptions {
  agents: AgentBridge;
  /** Where the pane is laid: the overview's own area. */
  parent: HTMLElement;
  say(message: string, error?: boolean): void;
  /** The pane closed: the overview forgets the open session. */
  closed(): void;
}

export class AgentPane {
  readonly element: HTMLElement;
  private session: SessionRecord | null = null;
  private records: ConversationRecord[] = [];
  private unsubscribe: (() => void) | null = null;
  private readonly body: HTMLElement;
  private readonly composer: HTMLElement;

  constructor(private readonly options: AgentPaneOptions) {
    this.element = el('aside', 'ag-pane');
    this.element.hidden = true;
    this.element.setAttribute('aria-label', 'Agent session');
    this.body = el('div', 'ag-body');
    this.composer = el('div', 'ag-composer');
    this.element.append(this.body, this.composer);
    options.parent.appendChild(this.element);
  }

  /** A cockpit session open to read: what the cockpit records, with nothing to send (TASK-0199). */
  private cockpitId: string | null = null;
  /** The tickets the open session moved, from the cockpit's record of it (TASK-0209). */
  private moved: string[] = [];

  /** The tickets the open session moved, as the overview last read them; drawn again only when they change. */
  setMoved(tickets: readonly string[]): void {
    if (JSON.stringify(tickets) === JSON.stringify(this.moved)) return;
    this.moved = [...tickets];
    this.draw();
  }

  /** What the composer held for the last session: never carried to the next (review, round one). */
  private forget(): void {
    this.draft = '';
    this.stopArmed = false;
    this.composerShape = '';
    this.moved = [];
  }

  get openId(): string | null {
    return this.session?.id ?? this.cockpitId;
  }

  /**
   * A session the cockpit runs, opened to read. Its conversation lives in the cockpit's terminal,
   * so the pane shows only what the sidecar records: who, how it stands, and the tickets it changed.
   */
  openCockpit(s: AgentSummary): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.session = null;
    this.records = [];
    this.forget();
    this.cockpitId = s.id;
    const word = AGENT_WORD[s.agent];
    const box = el('header', 'ag-head');
    const title = el('div', 'ag-title');
    title.append(el('span', `ag-glyph ag-${s.agent}`, AGENT_GLYPH[s.agent]), el('strong', '', `${word} · ${s.id.slice(0, 8)}`), el('span', `ag-state ag-st-${s.state}`, STATE_WORD[s.state]));
    const close = el('button', 'ag-close', '×');
    close.type = 'button';
    close.title = 'Close the session pane (Escape)';
    close.addEventListener('click', () => this.close());
    title.appendChild(close);
    box.append(title, el('div', 'ag-facts', [`a cockpit session`, s.last === '' ? '' : `last active ${time(s.last)}`].filter(Boolean).join(' · ')));
    const tickets = el('ul', 'ag-plan');
    for (const t of s.tickets) tickets.appendChild(el('li', '', t));
    this.body.replaceChildren(box, ...(s.tickets.length > 0 ? [el('div', 'ag-note', 'The tickets it changed, the first where it stands:'), tickets] : [el('div', 'ag-note', 'It has changed no ticket on this workspace.')]),
      el('div', 'ag-note', `This session runs in the cockpit's terminal. Deck shows what the cockpit records, and cannot send to it.`));
    this.composer.replaceChildren();
    this.element.hidden = false;
  }

  /** Open a session: its record, its conversation, and every change to it from now on. */
  async open(id: string): Promise<boolean> {
    const list = (await this.options.agents.list()) as SessionRecord[];
    const session = list.find((s) => s.id === id);
    if (session === undefined) {
      this.options.say(`no session ${id.slice(0, 8)} in Deck`, true);
      return false;
    }
    this.unsubscribe?.();
    this.cockpitId = null;
    if (this.session?.id !== session.id) this.forget();
    this.session = session;
    this.records = (await this.options.agents.conversation(id)) as ConversationRecord[];
    this.unsubscribe = this.options.agents.subscribe((raw) => {
      const change = raw as { sessionId: string; change: { kind: 'record'; record: ConversationRecord } | { kind: 'session'; session: SessionRecord } };
      if (this.session === null || change.sessionId !== this.session.id) return;
      if (change.change.kind === 'record') this.records.push(change.change.record);
      else this.session = change.change.session;
      this.draw();
    });
    this.element.hidden = false;
    this.draw(true);
    return true;
  }

  /** Close the pane; `tell` false when the overview closed it itself, by going to an address without a session. */
  close(tell = true): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.session = null;
    this.cockpitId = null;
    this.records = [];
    this.forget();
    this.element.hidden = true;
    if (tell) this.options.closed();
  }

  /** The pane as laid out now, for the window run and the suite. */
  model(): PaneModel | null {
    return this.session === null ? null : paneOf(this.session, this.records, this.moved);
  }

  private draw(toEnd = false): void {
    if (this.session === null) return;
    const m = paneOf(this.session, this.records, this.moved);
    // A reader at the end follows new records; one who scrolled up stays where they are.
    const atEnd = toEnd || this.body.scrollHeight - this.body.scrollTop - this.body.clientHeight < 24;
    const keep = this.body.scrollTop;
    this.body.replaceChildren(this.head(m), ...m.turns.map((t) => this.turn(t)), ...(m.waiting !== null ? [el('div', 'ag-waiting', m.waiting)] : []));
    this.body.scrollTop = atEnd ? this.body.scrollHeight : keep;
    this.drawComposer(m);
  }

  private head(m: PaneModel): HTMLElement {
    const h = m.head;
    const box = el('header', 'ag-head');
    const title = el('div', 'ag-title');
    title.append(el('span', `ag-glyph ag-${h.agent}`, h.glyph), el('strong', '', `${h.word} · ${h.shortId}`), el('span', `ag-state ag-st-${h.state}`, h.stateWord));
    const close = el('button', 'ag-close', '×');
    close.type = 'button';
    close.title = 'Close the session pane (Escape)';
    close.addEventListener('click', () => this.close());
    title.appendChild(close);
    const facts = el('div', 'ag-facts', [h.ticket ?? 'no ticket', h.where, h.model, h.effort, h.access, `started ${time(h.created)}`, `${m.minutes} min`].filter(Boolean).join(' · '));
    box.append(title, facts);
    // Context and usage, as two bars, once the agent has reported them; never a cost.
    for (const bar of [m.context, m.limit]) {
      if (bar === null) continue;
      const row = el('div', `ag-bar${bar.percent >= 80 ? ' is-high' : ''}`);
      row.setAttribute('role', 'meter');
      row.setAttribute('aria-valuemin', '0');
      row.setAttribute('aria-valuemax', '100');
      row.setAttribute('aria-valuenow', String(bar.percent));
      row.setAttribute('aria-label', bar.words);
      const fill = el('span', 'ag-bar-fill');
      fill.style.width = `${bar.percent}%`;
      const track = el('span', 'ag-bar-track');
      track.appendChild(fill);
      row.append(track, el('span', 'ag-bar-words', bar.words));
      box.appendChild(row);
    }
    if (m.moved.length > 0) box.appendChild(el('div', 'ag-moved', `Moved ${m.moved.join(', ')}`));
    return box;
  }

  private turn(t: PaneModel['turns'][number]): HTMLElement {
    const box = el('section', 'ag-turn');
    if (t.prompt !== null) {
      const bubble = el('div', 'ag-prompt', t.prompt);
      if (t.at) bubble.title = time(t.at);
      box.appendChild(bubble);
    }
    for (const item of t.items) box.appendChild(this.item(item));
    return box;
  }

  private item(item: PaneItem): HTMLElement {
    switch (item.kind) {
      case 'text':
        return el('div', 'ag-text', item.text);
      case 'note':
        return el('div', 'ag-note', item.text);
      case 'steps': {
        const row = el('div', 'ag-steps');
        for (const c of item.chips) {
          const chip = el('span', `ag-chip${c.failed > 0 ? ' has-failed' : ''}${c.running > 0 ? ' is-running' : ''}`, `${c.name} ${c.count}`);
          chip.title = `${c.count} ${c.name}${c.failed > 0 ? `, ${c.failed} failed or declined` : ''}${c.running > 0 ? `, ${c.running} running` : ''}`;
          row.appendChild(chip);
        }
        return row;
      }
      case 'edits': {
        const list = el('div', 'ag-edits');
        for (const f of item.files) {
          const d = el('details', 'ag-edit');
          const s = el('summary', '');
          s.append(el('span', 'ag-path', f.path), el('span', 'ag-plus', `+${f.added}`), el('span', 'ag-minus', `−${f.removed}`));
          d.append(s, el('pre', 'ag-diff', f.diff));
          list.appendChild(d);
        }
        return list;
      }
      case 'plan': {
        const ul = el('ul', 'ag-plan');
        for (const s of item.steps) ul.appendChild(el('li', s.done ? 'is-done' : '', s.text));
        return ul;
      }
      case 'permission': {
        const r = item.request;
        const box = el('div', `ag-ask ag-ask-${r.outcome}`);
        box.append(el('div', 'ag-ask-what', `${r.tool}: ${r.summary}`));
        if (r.outcome === 'open') {
          const approve = el('button', 'ag-approve', ANSWER_WORD.allow);
          const deny = el('button', 'ag-deny', ANSWER_WORD.deny);
          approve.type = deny.type = 'button';
          approve.addEventListener('click', () => void this.answer(r.id, true));
          deny.addEventListener('click', () => void this.answer(r.id, false));
          const acts = el('div', 'ag-ask-acts');
          acts.append(approve, deny);
          box.appendChild(acts);
        } else box.appendChild(el('div', 'ag-ask-outcome', r.outcome === 'approved' ? `${ANSWER_WORD.allow}d` : `Denied${r.message ? `: ${r.message}` : ''}`));
        return box;
      }
    }
  }

  private async answer(permission: string, allow: boolean): Promise<void> {
    if (this.session === null) return;
    const res = (await this.options.agents.answer(this.session.id, permission, allow ? { allow: true } : { allow: false, message: 'Denied in Deck.' })) as { ok?: boolean };
    if (res?.ok !== true) this.options.say('that request was already answered, or the session has ended', true);
  }

  private draft = '';
  private stopArmed = false;
  private composerShape = '';

  /**
   * The box to answer in (TASK-0198): the prompt, the session's model, effort and access level,
   * and Send, or Interrupt while it works; Resume for a session that is not running; Stop, which
   * asks once more before it ends the session. The model, effort and access level are chosen when
   * a session starts (Work on this) and shown here. No access level skips permissions.
   */
  protected drawComposer(_m: PaneModel): void {
    const s = this.session;
    if (s === null) return;
    // Made again only when what it offers changes, so a record arriving never takes the cursor from the box.
    const shape = JSON.stringify([s.id, s.state, s.model, s.effort, s.access, this.stopArmed]);
    if (shape === this.composerShape) return;
    this.composerShape = shape;
    const can = composerOf(s);
    const area = el('textarea', 'ag-input');
    area.placeholder = can.send ? `Answer ${s.agent === 'codex' ? 'Codex' : 'Claude'}…` : s.state === 'working' ? 'It is working; interrupt it to answer.' : 'Resume to carry on.';
    area.value = this.draft;
    area.rows = 3;
    area.addEventListener('input', () => { this.draft = area.value; });
    area.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void this.send();
      }
    });
    const choice = (label: string, options: Array<{ value: string; word: string }>, value: string): HTMLElement => {
      const select = el('select', 'ag-choice');
      select.disabled = true;
      select.title = `${label}: chosen when the session started`;
      select.setAttribute('aria-label', label);
      for (const o of options) {
        const opt = el('option', '', o.word);
        opt.value = o.value;
        opt.selected = o.value === value;
        select.appendChild(opt);
      }
      return select;
    };
    const models = MODELS[s.agent].some((m) => m.id === s.model) ? MODELS[s.agent] : [...MODELS[s.agent], { id: s.model, word: s.model }];
    const row = el('div', 'ag-row');
    row.append(
      choice('Model', models.map((m) => ({ value: m.id, word: m.word })), s.model),
      choice('Effort', EFFORTS[s.agent].map((e) => ({ value: e, word: e })), s.effort),
      choice('Access', (['ask', 'edits'] as const).map((a) => ({ value: a, word: ACCESS_WORD[a] })), s.access),
    );
    const acts = el('div', 'ag-acts');
    const button = (text: string, cls: string, run: () => void, enabled = true): void => {
      const b = el('button', cls, text);
      b.type = 'button';
      b.disabled = !enabled;
      b.addEventListener('click', run);
      acts.appendChild(b);
    };
    if (can.interrupt) button('Interrupt', 'ag-interrupt', () => void this.options.agents.interrupt(s.id));
    else button('Send', 'ag-send', () => void this.send(), can.send);
    if (can.resume) button('Resume', 'ag-resume', () => void this.send(this.draft.trim() === '' ? 'Carry on.' : undefined));
    if (can.stop) button(this.stopArmed ? 'Stop? Press again' : 'Stop', `ag-stop${this.stopArmed ? ' is-armed' : ''}`, () => void this.stop());
    // A plain shell in the session's own folder, its worktree when it has one (FEAT-0035); absent with no drawer.
    if (hasShells()) button('Open its shell', 'ag-shell', () => { openShell({ sessionId: s.id }); });
    this.composer.replaceChildren(area, row, acts);
  }

  private async send(fallback?: string): Promise<void> {
    if (this.session === null) return;
    const text = this.draft.trim() === '' ? fallback ?? '' : this.draft;
    if (text.trim() === '') return;
    const id = this.session.id;
    const typed = this.draft;
    this.draft = '';
    const res = (await this.options.agents.send(id, text).catch((err: unknown) => ({ ok: false, error: err instanceof Error ? err.message : String(err) }))) as { ok?: boolean; error?: string };
    if (res?.ok === true) return;
    // A prompt that did not go is given back, in the box, with why (review, round one).
    if (this.session?.id === id && this.draft === '') {
      this.draft = typed;
      this.composerShape = '';
      this.draw();
    }
    this.options.say(res?.error ?? 'the prompt was not sent', true);
  }

  private async stop(): Promise<void> {
    if (this.session === null) return;
    if (!this.stopArmed) {
      this.stopArmed = true;
      this.draw();
      return;
    }
    this.stopArmed = false;
    await this.options.agents.stop(this.session.id);
  }
}
