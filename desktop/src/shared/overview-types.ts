/**
 * The overview model: one list of a workspace's tickets, each with a type, a
 * state and a place (PHASE-0005, FEAT-0026).
 *
 * **This file is the seam between the two lanes of PHASE-0005.** The data lane
 * (Codex) computes an `OverviewModel` from Deck's index; the drawing lane
 * (Claude) draws every screen from one, and never from the index. The shape is
 * fixed in `docs/reference/overview-goal-two-agent-brief.md`. A change to it is
 * proposed in FEAT-0026's "Questions between the lanes" and agreed by both
 * lanes before either codes against it.
 *
 * The states, the five placement rules and the three kinds of phase are
 * DES-0004's ("Ticket types and states", "Where a ticket belongs", "Three
 * kinds of phase"). They are not restated here; the model's builder cites them.
 */

/** A ticket's state, as the overview draws it. DES-0004's six, in drawing order. */
export type State = 'closed' | 'progress' | 'failed' | 'owed' | 'open' | 'dropped';

/** The order a ring draws its wedges in: closed first, dropped last (DES-0004, plate 1). */
export const STATE_ORDER: readonly State[] = ['closed', 'progress', 'failed', 'owed', 'open', 'dropped'];

/** What a person reads when they point at a state. */
export const STATE_WORD: Readonly<Record<State, string>> = {
  closed: 'closed',
  progress: 'in progress',
  failed: 'failed',
  owed: 'to run again',
  open: 'open',
  dropped: 'dropped',
};

/**
 * A ticket's kind. `dec` is decisions and designs together, which DES-0004
 * draws as one project-wide ring.
 */
export type Kind = 'req' | 'feat' | 'task' | 'test' | 'iss' | 'dec' | 'risk';

/** The kinds a phase's sector draws, fewest tickets in the middle (DES-0004). */
export const PHASE_KINDS: readonly Kind[] = ['req', 'feat', 'task', 'test', 'iss'];

/** The kinds the core draws: project-wide first, then everything with no phase. */
export const CORE_KINDS: readonly Kind[] = ['dec', 'risk', 'req', 'feat', 'task', 'test', 'iss'];

export const KIND_WORD: Readonly<Record<Kind, string>> = {
  req: 'requirements',
  feat: 'features',
  task: 'tasks',
  test: 'tests',
  iss: 'issues',
  dec: 'decisions and designs',
  risk: 'risks',
};

export type Counts = Record<Kind, Record<State, number>>;

/**
 * The note's type as the cockpit names it. It picks the colour every screen
 * draws the ticket in, the same colour the cockpit uses (Edwin, 2026-10-15).
 * `kind: 'dec'` splits here into `adr` and `design`, because the cockpit
 * colours decisions and designs differently.
 */
export type NoteType = 'requirement' | 'feature' | 'task' | 'test' | 'issue' | 'adr' | 'design' | 'risk';

/**
 * How full a ticket's mark is drawn: the cockpit's DES-0004 marks, computed by
 * its sidecar's `_square_state` (project-os-cockpit `cockpit.py`). `open` is
 * the cockpit's "no state": defined and not started.
 */
export type Fill = 'open' | 'doing' | 'delivered' | 'unproven' | 'dropped' | 'deferred';

/** The cockpit's own words for each fill, for callouts and rows. */
export const FILL_WORD: Readonly<Record<Fill, string>> = {
  open: 'not started',
  doing: 'in progress',
  delivered: 'done',
  unproven: 'complete, not proven',
  dropped: 'resolved, nothing delivered',
  deferred: 'parked',
};

/** Why a ticket needs a person: the cockpit's `_needs_human` reasons. */
export type NeedReason = 'triage' | 'review' | 'failed' | 'ready' | 'waiting';

/**
 * What a ticket that needs you asks of you (Edwin, 2026-10-15: "the user needs to be
 * told what he needs to do"). `say` is the sentence the screens show. `action` is
 * where the person acts, as the parts of an overview address (the model does not
 * know the workspace's address; each screen writes it), or `verbs` when the
 * sidecar's own decide verbs are the action (triage, TASK-0160).
 */
export interface Needs {
  reason: NeedReason;
  say: string;
  action: { parts: { page?: string; flow?: string; note?: string; step?: string } } | { verbs: true };
  /** The first unfinished ticket a waiting ticket depends on. */
  waitingOn?: string;
}

export interface Ticket {
  /** "FEAT-0024". */
  id: string;
  kind: Kind;
  /** The cockpit's type word, which picks the colour (FEAT-0026, TASK-0144). */
  type: NoteType;
  /** DES-0004's six states: the counts and the wheel's state colouring read them. */
  state: State;
  /** The cockpit's fill (`_square_state`). */
  fill: Fill;
  /** The cockpit's dot: a person's action is outstanding (`_needs_human`). */
  needsYou: boolean;
  /** When `needsYou` is true: why, what to do, and where (TASK-0153). Absent otherwise. */
  needs?: Needs;
  /** The note's own status word, for the callout. */
  status: string;
  title: string;
  /** Where it is drawn, after DES-0004's five placement rules. Null is the core. */
  phase: string | null;
  placedBy: 'project-wide' | 'own' | 'member-list' | 'parent' | 'none';
  /** For a ticket with no phase: where DES-0004's re-phase rules would put it. */
  suggestion?: { phase: string; by: 'links' | 'dates' };
  /** Ids of the notes it links to, for the ticket screen (S3). */
  links: string[];
}

export interface ExitCriterion {
  text: string;
  ticked: boolean;
}

export interface Phase {
  /** "PHASE-0002". */
  id: string;
  /** "002" — what the wheel prints. */
  number: string;
  name: string;
  status: string;
  kind: 'open' | 'finished' | 'backlog';
  /** `prose` is true when the phase writes its exit criteria as prose, not boxes. */
  exit: { items: ExitCriterion[]; prose: boolean };
  counts: Counts;
  /** Ticket ids, in the order the wheel draws them. */
  tickets: string[];
}

export interface OverviewModel {
  /** The workspace's display name. */
  workspace: string;
  /** The commit the model was built at, when known. */
  head: string;
  /** Whether the source tree had uncommitted note or ledger changes. */
  dirty?: boolean;
  /** ISO date-time the model was built. */
  generated: string;
  /** Phases still to finish, in phase order: the wheel's sectors. */
  phases: Phase[];
  /** Finished phases: discs on the shelf. */
  shelf: Phase[];
  /** Backlog phases: the tray. */
  backlog: Phase[];
  /** Project-wide tickets and tickets with no phase. */
  core: { tickets: string[]; counts: Counts };
  tickets: Record<string, Ticket>;
}

/** An all-zero count table, for a builder or a test to fill. */
export function emptyCounts(): Counts {
  const out = {} as Counts;
  for (const kind of CORE_KINDS) {
    out[kind] = { closed: 0, progress: 0, failed: 0, owed: 0, open: 0, dropped: 0 };
  }
  return out;
}

/** Every phase the model knows, in the order a screen lists them. */
export function allPhases(model: OverviewModel): Phase[] {
  return [...model.phases, ...model.shelf, ...model.backlog];
}

export function phaseById(model: OverviewModel, id: string): Phase | null {
  return allPhases(model).find((p) => p.id === id) ?? null;
}
