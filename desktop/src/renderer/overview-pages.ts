/**
 * The drawing lane's four screens, registered with the overview layer
 * (PHASE-0005, FEAT-0027 and FEAT-0028): the wheel, a phase, a ticket and
 * re-phasing. Each is a scene function from `shared/`; this file only says
 * which address draws which, and what S4's control does.
 */
import { phaseScene } from '../shared/overview-phase.js';
import { rephaseScene } from '../shared/overview-rephase.js';
import { ticketScene } from '../shared/overview-ticket.js';
import { wheelScene } from '../shared/overview-wheel.js';
import { registerScreen } from './overview.js';

/** S4's accepted groups, kept for the session only: accepting writes nothing. */
const ACCEPTED = 'rephase-accepted';

registerScreen('page', 'wheel', { scene: ({ model, ctx }) => wheelScene(model, ctx) });

registerScreen('page', 'phase', {
  scene: ({ model, ctx, address }) => {
    if (address.note === null) throw new Error('a phase screen names its phase: ?page=phase&note=PHASE-…');
    return phaseScene(model, address.note, ctx);
  },
});

registerScreen('page', 'ticket', {
  scene: ({ model, ctx, address }) => {
    if (address.note === null) throw new Error('a ticket screen names its ticket: ?page=ticket&note=…');
    return ticketScene(model, address.note, ctx);
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
