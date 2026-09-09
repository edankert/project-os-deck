/** Shapes shared by the main process, the preload bridge and the renderer. */

/** What kind of workspace this is. The view provider is chosen by it. */
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

/** Where a view's contents come from. The renderer never names a sidecar route. */
export type ViewSource =
  | { kind: 'nav'; mode: string }
  | { kind: 'stats' };

export interface DeckView {
  id: string;
  label: string;
  source: ViewSource;
}

/** How much of something is finished, when the payload says. */
export interface Progress {
  done: number;
  total: number;
  stale: number;
}

export interface CardModel {
  noteId: string;
  title: string;
  noteType: string;
  status: string;
  /** Docs-root-relative path, when the payload carried one. */
  rel: string | null;
  /** The sidecar's own one-line description, where it sends one. */
  subtitle: string | null;
  /** Whether a person owes this note something, and what. */
  owed: boolean;
  owedVerb: string | null;
  /** The group this card was drawn from, which is how an issue knows its severity. */
  groupKey: string;
  severity: string | null;
  /** A test's last walk, and whether that walk has gone stale. */
  lastVerified: string | null;
  stale: boolean;
  /** Finished out of total, for anything that holds other notes. */
  progress: Progress | null;
  /** The notes this one holds: a feature's tasks, a surface's tests. */
  children: CardModel[];
}

/** One heading in a view, with the cards under it. */
export interface CardGroup {
  key: string;
  label: string;
  /** The sidecar's mark for a group a person has to act on. */
  needsHuman: boolean;
  /** Finished work, folded away until somebody asks for it. */
  suppressed: boolean;
  cards: CardModel[];
}

export interface DeskCard {
  noteId: string;
  x: number;
  y: number;
}

export interface Desk {
  name: string;
  workspaceId: string;
  cards: DeskCard[];
}

/**
 * What a popped-out window carries. One thing, named in its address.
 *
 * A string rather than a union of three, because the kinds come from a
 * registry each phase adds to (`shared/panels.ts`, TASK-0052). The guarantee
 * is unchanged and is enforced where it belongs: the address grammar refuses a
 * panel nothing has registered, so an address still cannot name something Deck
 * cannot draw.
 */
export type PanelType = string;

export interface Filters {
  statuses: string[];
  types: string[];
}

export interface DeckState {
  workspaceId: string | null;
  viewId: string | null;
  deskName: string | null;
  noteId: string | null;
  /** Keyed `<workspaceId>:<desk name>`, so two workspaces may both have a "triage". */
  desks: Record<string, Desk>;
  /**
   * What is on the desk right now, keyed by workspace id.
   *
   * The desk is a chosen subset rather than everything the view holds, so it
   * has to be written down somewhere. It lives here rather than being read
   * back off the DOM, which is what made a saved desk worth nothing before
   * (TASK-0024).
   */
  deskCards: Record<string, DeskCard[]>;
  /** What the navigator is narrowed to. Shared, so a second window narrows with it. */
  query: string;
  filters: Filters;
  /** Group key to whether it is folded. Absent means the group's own default. */
  folds: Record<string, boolean>;
  /** Rises on every accepted change; lets a subscriber drop a stale broadcast. */
  revision: number;
  /**
   * How many times each workspace's NOTES have changed, keyed by workspace id.
   *
   * A second number beside `revision`, not the same one, and the reason is
   * worth stating: `revision` counts changes to what Deck is doing — a card
   * moved, a view chosen — and this counts changes to what Deck is looking at.
   * A window that redrew because somebody dragged a card has not gone stale.
   * Two revisions that mean different things must not share a name
   * (TASK-0039).
   *
   * Monotonic per workspace within a run, and NOT persisted: the index is
   * rebuilt from disk at every start, so a number carried over from the last
   * run would be a number this run's index could not honour.
   */
  indexRevisions: Record<string, number>;
  /**
   * Where a person is in a flow. RESERVED by TASK-0052; nothing writes it and
   * nothing reads it, and `normaliseState` does not read it back off disk
   * either, because nothing could have put it there honestly.
   *
   * A flow's steps and their done-states are read from the record, so this
   * cursor is the only piece of a flow that is not already somewhere else —
   * which is why the slot is worth reserving before a flow is designed.
   * `docs/ARCHITECTURE.md`, "Flows", carries the concept in words.
   */
  flowCursor: FlowCursor | null;
}

/** What a host can do. The renderer asks rather than testing for Electron. */
export interface Capabilities {
  /** Open a panel in its own operating-system window. */
  popOutWindows: boolean;
  /** Read and write the system clipboard through the main process. */
  clipboard: boolean;
  /** Add or remove a workspace. */
  manageWorkspaces: boolean;
  /** State held in the main process and broadcast to every window. */
  sharedStore: boolean;
}

export type WindowRole = 'focus' | 'satellite';

export interface DeckAddress {
  workspaceId: string;
  viewId: string;
  desk: string | null;
  note: string | null;
  panel: PanelType | null;
  /** Which surface draws the view: the list, cards on a desk, or the field. */
  surface: string | null;
  /** A whole screen that is not a view of notes: the acceptance checks, a release. */
  page: string | null;
  /** An ordered list of steps a person is working through. */
  flow: string | null;
  /** Where in that flow they are. Refused without a `flow`, which it names nothing without. */
  step: string | null;
}

/**
 * Where a person is in a flow.
 *
 * RESERVED by TASK-0052 and written by nothing. A flow is an ordered list of
 * steps whose done-state is read from the record and whose verb comes from the
 * registry, so the only state outside the record is this cursor —
 * `docs/ARCHITECTURE.md`, "Flows", carries the concept. Edwin said on
 * 2026-09-08 that he does not yet know what flows should look like and wants
 * them considered now and fleshed out over time, so the slot exists and
 * nothing fills it. The acceptance runner's position, which the cockpit loses
 * when its window closes, is what it is for.
 */
export interface FlowCursor {
  flow: string;
  step: string;
}
