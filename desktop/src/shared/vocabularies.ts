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
 * The orbit: the same field arranged by the whole link graph, where distance
 * is connectedness (FEAT-0001). A surface rather than a view, because it
 * draws the workspace's links rather than a view's groups, and a surface is
 * what the address already has a key for.
 */
surfaceKinds.register({ id: 'orbit', label: 'The link graph' });

/**
 * A page: a whole screen that is not a view of notes — the acceptance checks,
 * the release page, the publication board.
 *
 * PHASE-0005 registers its four overview pages at the shared scene boundary.
 */
export const pageKinds = new Vocabulary('page');
pageKinds.register({ id: 'wheel', label: 'The phase overview' });
pageKinds.register({ id: 'phase', label: 'A phase' });
pageKinds.register({ id: 'ticket', label: 'A ticket' });
pageKinds.register({ id: 'rephase', label: 'Tickets with no phase' });

/**
 * A flow: an ordered list of steps, each with a done-state read from the
 * record and a verb from the registry.
 *
 * PHASE-0005 registers the three acceptance flows named in its two-agent brief.
 */
export const flowKinds = new Vocabulary('flow');
flowKinds.register({ id: 'design', label: 'Design acceptance' });
flowKinds.register({ id: 'test-run', label: 'An acceptance test run' });
flowKinds.register({ id: 'accept', label: 'Ticket acceptance' });
