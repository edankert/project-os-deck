/**
 * Which views a workspace has.
 *
 * Edwin decided on 2026-09-06 that this is Deck's concern and the cockpit is
 * not changed for it: the cockpit keeps showing its seven project-os views,
 * and Deck's own provider offers the same seven. A vault's `.base` files
 * become views by adding a provider here, not by touching the renderer.
 *
 * The renderer holds no view names at all. It renders what a provider returns.
 */
import type { DeckView, Workspace, WorkspaceKind } from './types.js';

/**
 * The seven views the cockpit's navigator shows for a project-os repository.
 * `overview` is not one of the sidecar's nav modes: the cockpit builds it from
 * the stats payload, and so does Deck, which is why a view carries its source
 * rather than a mode name.
 */
const PROJECT_OS_VIEWS: readonly DeckView[] = Object.freeze([
  { id: 'overview', label: 'Overview', source: { kind: 'stats' } },
  { id: 'intent', label: 'Intent', source: { kind: 'nav', mode: 'intent' } },
  { id: 'features', label: 'Features', source: { kind: 'nav', mode: 'features' } },
  { id: 'issues', label: 'Issues', source: { kind: 'nav', mode: 'issues' } },
  { id: 'tests', label: 'Tests', source: { kind: 'nav', mode: 'tests' } },
  { id: 'publication', label: 'Publication', source: { kind: 'nav', mode: 'publication' } },
  { id: 'library', label: 'Library', source: { kind: 'nav', mode: 'library' } },
]);

export interface ViewProvider {
  readonly kind: WorkspaceKind;
  views(workspace: Workspace): DeckView[];
}

export const projectOsProvider: ViewProvider = {
  kind: 'project-os',
  views(): DeckView[] {
    return PROJECT_OS_VIEWS.map((v) => ({ ...v, source: { ...v.source } }));
  },
};

export class ViewRegistry {
  private readonly providers = new Map<WorkspaceKind, ViewProvider>();

  constructor(providers: ViewProvider[] = [projectOsProvider]) {
    for (const provider of providers) this.providers.set(provider.kind, provider);
  }

  register(provider: ViewProvider): void {
    this.providers.set(provider.kind, provider);
  }

  /** No provider for this kind means no views, said out loud rather than an empty screen. */
  viewsFor(workspace: Workspace): { views: DeckView[]; reason: string | null } {
    const provider = this.providers.get(workspace.kind);
    if (provider === undefined) {
      return { views: [], reason: `no view provider for a ${workspace.kind} workspace` };
    }
    return { views: provider.views(workspace), reason: null };
  }

  /** A view id the provider did not return cannot be selected. */
  resolve(workspace: Workspace, viewId: string): DeckView | null {
    return this.viewsFor(workspace).views.find((v) => v.id === viewId) ?? null;
  }
}

export const DEFAULT_VIEW_ID = 'features';
