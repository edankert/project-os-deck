/**
 * The drawing lane's four screens, registered with the overview layer
 * (PHASE-0005, FEAT-0027 and FEAT-0028): the wheel, a phase, a ticket and
 * re-phasing. Each is a scene function from `shared/`; this file only says
 * which address draws which, and what S4's control does.
 */
import { phaseScene } from '../shared/overview-phase.js';
import { rephaseScene } from '../shared/overview-rephase.js';
import { ticketScene, type TriageVerb } from '../shared/overview-ticket.js';
import { wheelScene } from '../shared/overview-wheel.js';
import { featureGate } from './overview-flows.js';
import { agentsFor } from './agent-state.js';
import { drawnMtime, drawnMtimeKey, noteMtime, registerScreen, type ScreenInput } from './overview.js';

const withAgents = (workspaceId: string, model: Parameters<typeof agentsFor>[1]): { agents?: ReturnType<typeof agentsFor> & object } => {
  const agents = agentsFor(workspaceId, model);
  return agents === undefined ? {} : { agents };
};

/** S4's accepted groups, kept for the session only: accepting writes nothing. */
const ACCEPTED = 'rephase-accepted';

// The agent sessions stand over their tickets in the shell; on a served page `agentsFor` gives none (FEAT-0033).
registerScreen('page', 'wheel', { scene: ({ model, ctx, address }) => wheelScene(model, ctx, { select: address.select, session: address.session, ...withAgents(ctx.workspaceId, model) }) });

registerScreen('page', 'phase', {
  scene: ({ model, ctx, address }) => {
    if (address.note === null) throw new Error('a phase screen names its phase: ?page=phase&note=PHASE-…');
    return phaseScene(model, address.note, ctx, { select: address.select, ...withAgents(ctx.workspaceId, model) });
  },
});

/** The sidecar's own verbs for a ticket, read live; none when it cannot be read. */
async function verbsFor(input: ScreenInput, id: string): Promise<TriageVerb[]> {
  try {
    const payload = (await input.read(`/api/notes/actions?id=${encodeURIComponent(id)}`)) as { actions?: Array<Record<string, unknown>> };
    return (payload.actions ?? [])
      .filter((a) => typeof a['verb'] === 'string' && typeof a['to'] === 'string' && (a['endpoint'] === '' || a['endpoint'] === undefined || a['endpoint'] === '/api/notes/transition'))
      .map((a) => ({ verb: String(a['verb']), to: String(a['to']), confirm: a['confirm'] === true, disabled: a['disabled'] === true, reason: typeof a['reason'] === 'string' ? a['reason'] : '' }));
  } catch {
    return [];
  }
}

registerScreen('page', 'ticket', {
  scene: async (input) => {
    const { model, ctx, address } = input;
    if (address.note === null) throw new Error('a ticket screen names its ticket: ?page=ticket&note=…');
    const t = model.tickets[address.note];
    // The note's time first, before anything the screen shows is read: the guard can then
    // only be older than what the person sees, never newer (the review of TASK-0160).
    const drawnAt = t?.needs !== undefined && 'verbs' in t.needs.action ? await noteMtime(input.ctx.workspaceId, address.note) : undefined;
    // A feature shows the same gate S7 does, from the sidecar's evidence; without the
    // sidecar, what the model knows, marked "not reported" (TASK-0148, TASK-0149).
    const gate = t?.kind === 'feat' ? await featureGate(input, address.note) : undefined;
    // A ticket at triage is decided here, with the sidecar's own verbs (TASK-0160).
    const verbs = t?.needs !== undefined && 'verbs' in t.needs.action ? await verbsFor(input, address.note) : undefined;
    // The note's time as this screen shows it: a decision made here is about this text.
    if (verbs !== undefined) input.memory.set(drawnMtimeKey(address.note), drawnAt);
    return ticketScene(model, address.note, ctx, { gate, verbs, canWrite: input.canWrite });
  },
  onAction: async (action, input) => {
    if (!action.startsWith('needs:') || input.address.note === null) return false;
    if (!input.canWrite) throw new Error('this host does not write');
    const id = input.address.note;
    // Read again: a stale button is not authority to decide.
    const verb = (await verbsFor(input, id)).find((v) => v.to === action.slice('needs:'.length));
    if (verb === undefined || verb.disabled) throw new Error(verb?.reason || `the sidecar no longer offers that for ${id}`);
    // The time the screen was drawn at, so the sidecar refuses a note edited since. Checked
    // before asking why, so nobody is asked for a reason Deck will not send.
    const mtime = drawnMtime(input.memory, id);
    let note: string | undefined;
    if (verb.confirm) {
      const why = await input.ask(`Why ${verb.verb.toLowerCase()} ${id}?`);
      if (why === null) return false;
      if (!why.trim()) throw new Error('a reason is required');
      note = why.trim();
    }
    const result = await input.write('transition', { id, to: verb.to, ...(note === undefined ? {} : { note }), mtime });
    if (!result.ok) throw new Error(result.error || 'the sidecar refused the action');
    return true;
  },
});

registerScreen('page', 'rephase', {
  scene: ({ model, ctx, memory }) => rephaseScene(model, ctx, (memory.get(ACCEPTED) as Set<string> | undefined) ?? new Set()),
  onAction: (action, { memory }) => {
    if (!action.startsWith('rephase:')) return false;
    const accepted = (memory.get(ACCEPTED) as Set<string> | undefined) ?? new Set<string>();
    accepted.add(action.slice('rephase:'.length));
    memory.set(ACCEPTED, accepted);
    return true;
  },
});
