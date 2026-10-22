/**
 * The shell drawer's tabs, as data (FEAT-0035, TASK-0206): which shells are open, which one is
 * shown, and which have ended. A pure function of what happened, so the suite checks it with
 * no window.
 */
export interface ShellTab {
  id: string;
  title: string;
  folder: string;
  session: string | null;
  exited: boolean;
}

export interface TabsState {
  tabs: ShellTab[];
  active: string | null;
}

export type TabsAction =
  | { kind: 'opened'; tab: ShellTab }
  | { kind: 'closed'; id: string }
  | { kind: 'shown'; id: string }
  | { kind: 'exited'; id: string };

export const NO_TABS: TabsState = { tabs: [], active: null };

export function tabsAfter(state: TabsState, action: TabsAction): TabsState {
  switch (action.kind) {
    case 'opened':
      // A new shell is shown at once, at the end of the row.
      return { tabs: [...state.tabs.filter((t) => t.id !== action.tab.id), action.tab], active: action.tab.id };
    case 'closed': {
      const at = state.tabs.findIndex((t) => t.id === action.id);
      if (at < 0) return state;
      const tabs = state.tabs.filter((t) => t.id !== action.id);
      // Closing the shown tab shows its neighbour: the one after it, else the one before.
      const active = state.active !== action.id ? state.active : (tabs[at] ?? tabs[at - 1])?.id ?? null;
      return { tabs, active };
    }
    case 'shown':
      return state.tabs.some((t) => t.id === action.id) ? { ...state, active: action.id } : state;
    case 'exited':
      return { ...state, tabs: state.tabs.map((t) => (t.id === action.id ? { ...t, exited: true } : t)) };
  }
}

/** A tab's words: the folder's name, and the session it was opened for, and whether it has ended. */
export function tabWords(t: ShellTab): string {
  return `${t.title}${t.session !== null ? ` · ${t.session.slice(0, 8)}` : ''}${t.exited ? ' (ended)' : ''}`;
}
