/** Shapes shared by the main process, the preload bridge and the renderer. */
/** What kind of workspace this is. */
export type WorkspaceKind = 'project-os' | 'vault';

export interface Workspace {
  /** Stable per machine: the first sixteen hex characters of the path's SHA-1. */
  id: string;
  root: string;
  name: string;
  kind: WorkspaceKind;
  /**
   * Whether a sidecar is answering for this workspace right now.
   *
   * The served host fills this in, because a page it serves cannot start a
   * sidecar: only the shell can. Without it the rail offers a workspace that
   * cannot open and the reason arrives as "the sidecar answered 503"
   * (ISS-0003). Absent in the shell's own listing, where every workspace can
   * be opened.
   */
  open?: boolean;
}

/**
 * The panel an address from before 2026-10-23 may name. Popped-out panels left
 * Deck with Spread (ADR-0010); the address grammar still reads one, so an old
 * address opens the overview and says that part is gone rather than failing.
 */
export type PanelType = string;

/**
 * Deck's shared state (`store-state.ts`): what the overview needs, and nothing
 * Spread or Glass kept (ADR-0010).
 */
export interface DeckState {
  /** The workspace open in Deck's window; a served page keeps its own. */
  workspaceId: string | null;
  /**
   * Who Deck says made a write.
   *
   * A setting rather than a literal: the cockpit hard-codes `user:edwin` in
   * four places in its renderer, and that name cannot be copied into a second
   * application without making it unusable by anybody else (TASK-0048). The
   * sidecar does not verify it, so this is a record of intent: it says who
   * claimed to act, not who was proven to.
   */
  actor: string;
  /** Rises on every accepted change; lets a subscriber drop a stale broadcast. */
  revision: number;
  /**
   * How many times each workspace's NOTES have changed, keyed by workspace id.
   *
   * A second number beside `revision`, because the two count different things:
   * `revision` counts changes to what Deck is doing, and this counts changes to
   * what Deck is looking at (TASK-0039). Not persisted: the index is rebuilt
   * from disk at every start.
   */
  indexRevisions: Record<string, number>;
}

/** What a host can do. The renderer asks rather than testing for Electron. */
export interface Capabilities {
  /** Read and write the system clipboard through the main process. */
  clipboard: boolean;
  /** Add or remove a workspace. */
  manageWorkspaces: boolean;
  /** State held in the main process and broadcast to every window. */
  sharedStore: boolean;
  /** Start, answer and stop Deck's own agent sessions (FEAT-0032). Never on a served page (RISK-0015). */
  agents: boolean;
  /** Plain shells in the drawer (FEAT-0035): the shell only, never a served page. */
  shells: boolean;
  /**
   * Change a note, through the shell's loopback call to the sidecar.
   *
   * False on the served page, and the verbs are then ABSENT rather than
   * disabled (TASK-0022). A control that is greyed out is a promise that it
   * could work.
   */
  write: boolean;
}

export interface DeckAddress {
  workspaceId: string;
  viewId: string;
  /**
   * A desk, a note in a view, a popped-out panel and a surface: what an address
   * from Spread and Glass carried. Still read, so such an address opens the
   * overview and says that part is not in this Deck (ADR-0010). A note is also
   * what a phase or a ticket screen names (`?page=ticket&note=TASK-0001`).
   */
  desk: string | null;
  note: string | null;
  panel: PanelType | null;
  surface: string | null;
  /** A whole screen that is not a view of notes: the acceptance checks, a release. */
  page: string | null;
  /** An ordered list of steps a person is working through. */
  flow: string | null;
  /** Where in that flow they are. Refused without a `flow`, which it names nothing without. */
  step: string | null;
  /** The overview's colouring: `state` for DES-0004's state colours; absent for the cockpit's type colours (TASK-0145). */
  colour: string | null;
  /** The ticket selected on the towers, on the wheel or a phase brought close (TASK-0182). */
  select: string | null;
  /** How the wheel's ring is grouped: `feature`, or absent for by phase (TASK-0185). */
  group: string | null;
  /** The agent session open in the pane, on the wheel (FEAT-0033, TASK-0199). */
  session: string | null;
}
