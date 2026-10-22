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
import { ACCESS_WORD, EFFORTS, MODELS, composerOf, paneOf, type PaneItem, type PaneModel } from '../shared/agent-pane.js';

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

  get openId(): string | null {
    return this.session?.id ?? null;
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

  close(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.session = null;
    this.records = [];
    this.composerShape = '';
    this.element.hidden = true;
    this.options.closed();
  }

  /** The pane as laid out now, for the window run and the suite. */
  model(): PaneModel | null {
    return this.session === null ? null : paneOf(this.session, this.records);
  }

  private draw(toEnd = false): void {
    if (this.session === null) return;
    const m = paneOf(this.session, this.records);
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
          const approve = el('button', 'ag-approve', 'Approve');
          const deny = el('button', 'ag-deny', 'Deny');
          approve.type = deny.type = 'button';
          approve.addEventListener('click', () => void this.answer(r.id, true));
          deny.addEventListener('click', () => void this.answer(r.id, false));
          const acts = el('div', 'ag-ask-acts');
          acts.append(approve, deny);
          box.appendChild(acts);
        } else box.appendChild(el('div', 'ag-ask-outcome', r.outcome === 'approved' ? 'Approved' : `Denied${r.message ? `: ${r.message}` : ''}`));
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
    this.composer.replaceChildren(area, row, acts);
  }

  private async send(fallback?: string): Promise<void> {
    if (this.session === null) return;
    const text = this.draft.trim() === '' ? fallback ?? '' : this.draft;
    if (text.trim() === '') return;
    this.draft = '';
    const res = (await this.options.agents.send(this.session.id, text)) as { ok?: boolean; error?: string };
    if (res?.ok !== true) this.options.say(res?.error ?? 'the prompt was not sent', true);
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
