/**
 * Work on this (FEAT-0033, TASK-0200; DES-0006): the dialog a ticket's card opens to start
 * a Claude or Codex session on it. It offers the agent, its model and effort, the access
 * level (Ask before acting by default; none skips permissions, RISK-0013), and this
 * checkout or a new worktree (this checkout by default). The first prompt is the ticket's
 * own words, which the person can change before Start.
 *
 * Only the shell opens it: the card shows Work on this only on a screen given agents.
 */
import type { AgentBridge } from './host-bridge.js';
import { ACCESS_WORD, AGENT_WORD, EFFORTS, MODELS } from '../shared/agent-pane.js';
import { startDefaults } from '../shared/agent-marks.js';
import type { AgentKind } from '../shared/agent-types.js';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls !== '') e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export interface WorkOnOptions {
  parent: HTMLElement;
  agents: AgentBridge;
  workspaceId: string;
  ticket: { id: string; title: string; needsYou?: boolean; needs?: { say: string } };
  say(message: string, error?: boolean): void;
  /** The session started: the overview opens it in the pane. */
  started(sessionId: string): void;
}

/** The dialog, open over the overview; it removes itself on Start, Cancel or Escape. */
export function openWorkOn(o: WorkOnOptions): HTMLElement {
  const d = startDefaults(o.ticket);
  const back = el('div', 'ag-dialog-back');
  const form = el('form', 'ag-dialog');
  form.setAttribute('aria-label', `Work on ${o.ticket.id}`);
  form.appendChild(el('h2', 'ag-dialog-title', `Work on ${o.ticket.id}`));
  form.appendChild(el('div', 'ag-facts', o.ticket.title));

  const field = (label: string, control: HTMLElement): HTMLElement => {
    const row = el('label', 'ag-field');
    row.append(el('span', 'ag-field-label', label), control);
    return row;
  };
  const select = (name: string, options: Array<{ value: string; word: string }>, value: string): HTMLSelectElement => {
    const s = el('select', 'ag-choice');
    s.name = name;
    for (const x of options) {
      const opt = el('option', '', x.word);
      opt.value = x.value;
      opt.selected = x.value === value;
      s.appendChild(opt);
    }
    return s;
  };
  const agent = select('agent', (['claude', 'codex'] as const).map((a) => ({ value: a, word: AGENT_WORD[a] })), d.agent);
  const model = select('model', MODELS.claude.map((m) => ({ value: m.id, word: m.word })), d.model);
  const effort = select('effort', EFFORTS.claude.map((e) => ({ value: e, word: e })), d.effort);
  const access = select('access', (['ask', 'edits'] as const).map((a) => ({ value: a, word: ACCESS_WORD[a] })), d.access);
  const place = select('place', [{ value: 'checkout', word: 'This checkout' }, { value: 'worktree', word: 'A new worktree, on its own branch' }], d.place);
  // Each agent has its own models and efforts: changing the agent offers its lists, at their first.
  agent.addEventListener('change', () => {
    const a = agent.value as AgentKind;
    model.replaceChildren(...MODELS[a].map((m, i) => Object.assign(el('option', '', m.word), { value: m.id, selected: i === 0 })));
    effort.replaceChildren(...EFFORTS[a].map((e, i) => Object.assign(el('option', '', e), { value: e, selected: i === 0 })));
  });
  const prompt = el('textarea', 'ag-input');
  prompt.name = 'prompt';
  prompt.rows = 4;
  prompt.value = d.prompt;
  const row = el('div', 'ag-row');
  row.append(field('Agent', agent), field('Model', model), field('Effort', effort));
  const row2 = el('div', 'ag-row');
  row2.append(field('Access', access), field('Where', place));
  form.append(row, row2, field('First prompt', prompt));

  const acts = el('div', 'ag-acts');
  const start = el('button', 'ag-send', 'Start');
  start.type = 'submit';
  const cancel = el('button', '', 'Cancel');
  cancel.type = 'button';
  acts.append(start, cancel);
  form.appendChild(acts);
  back.appendChild(form);

  const close = (): void => {
    back.remove();
    document.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', onKey, true);
  cancel.addEventListener('click', close);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (prompt.value.trim() === '') {
      o.say('the first prompt is empty', true);
      return;
    }
    start.disabled = true;
    void (async () => {
      const res = (await o.agents.start({ workspaceId: o.workspaceId, ticket: o.ticket.id, agent: agent.value, model: model.value, effort: effort.value, access: access.value, place: place.value, prompt: prompt.value })) as { ok?: boolean; error?: string; session?: { id: string; state: string } };
      if (res?.ok !== true || res.session === undefined) {
        start.disabled = false;
        o.say(res?.error ?? 'the session did not start', true);
        return;
      }
      close();
      if (res.session.state === 'failed') o.say(`the session on ${o.ticket.id} failed to start; its pane says why`, true);
      o.started(res.session.id);
    })();
  });
  o.parent.appendChild(back);
  prompt.focus();
  return back;
}
