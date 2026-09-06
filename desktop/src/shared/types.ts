/** Shapes shared by the main process, the preload bridge and the renderer. */

/** What kind of workspace this is. The view provider is chosen by it. */
export type WorkspaceKind = 'project-os' | 'vault';

export interface Workspace {
  /** Stable per machine: the first sixteen hex characters of the path's SHA-1. */
  id: string;
  root: string;
  name: string;
  kind: WorkspaceKind;
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

export interface CardModel {
  noteId: string;
  title: string;
  noteType: string;
  status: string;
  /** Docs-root-relative path, when the payload carried one. */
  rel: string | null;
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

export interface DeckState {
  workspaceId: string | null;
  viewId: string | null;
  deskName: string | null;
  noteId: string | null;
  /** Keyed `<workspaceId>:<desk name>`, so two workspaces may both have a "triage". */
  desks: Record<string, Desk>;
  /** Rises on every accepted change; lets a subscriber drop a stale broadcast. */
  revision: number;
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
  panel: string | null;
}
