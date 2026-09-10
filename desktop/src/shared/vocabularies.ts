/**
 * The three vocabularies the address grammar gained on 2026-09-08, beside the
 * panel kinds (TASK-0052).
 *
 * Every reachable Deck state has an address. That is what makes a pop-out
 * window, a pasted link and a tablet possible, and it stops being true the
 * moment a phase builds a state with no written form. Four such states are
 * arriving: a Glass surface, a page such as the acceptance checks, an editor
 * over a note, and a flow at a step. Adding the keys now is small; adding them
 * after windows, layouts and a command line have been built against a five-key
 * grammar is a retrofit.
 *
 * Each one starts with what Deck can actually draw today, which for two of
 * them is nothing. An empty vocabulary is not a gap: it is the guarantee doing
 * its job. `?page=release` is refused today and will parse the day something
 * draws a release page and registers it.
 */
import { Vocabulary } from './registry.js';

/**
 * Which surface draws the view: a list, cards on a desk, or the field.
 *
 * `list` and `spread` were the two Deck had. `glass` was registered by
 * PHASE-0002 on the day the field existed (TASK-0033), which is the same day
 * the description language started naming it in a view's `surfaces` section.
 * An address without a surface means Glass (ADR-0002), so the grammar never
 * writes `surface=glass` and always accepts it.
 */
export const surfaceKinds = new Vocabulary('surface');
surfaceKinds.register({ id: 'list', label: 'The list' });
surfaceKinds.register({ id: 'spread', label: 'Cards on a desk' });
surfaceKinds.register({ id: 'glass', label: 'The field' });

/**
 * A page: a whole screen that is not a view of notes — the acceptance checks,
 * the release page, the publication board.
 *
 * Empty, deliberately. Deck draws no page today; PHASE-0004 adopts them from
 * the cockpit a register row at a time, and each one registers itself here
 * when it is built.
 */
export const pageKinds = new Vocabulary('page');

/**
 * A flow: an ordered list of steps, each with a done-state read from the
 * record and a verb from the registry.
 *
 * Empty, deliberately, and it will stay empty for a while. Edwin said on
 * 2026-09-08 that he does not yet know what flows should look like and wants
 * them considered now and fleshed out over time. So the seam is reserved and
 * nothing is built: the concept is in `docs/ARCHITECTURE.md`, the cursor slot
 * is in the store, and this is where a flow will say its own name.
 */
export const flowKinds = new Vocabulary('flow');
