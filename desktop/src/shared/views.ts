/**
 * Which views a workspace has, and what each of them IS.
 *
 * Edwin decided on 2026-09-06 that this is Deck's concern and the cockpit is
 * not changed for it: the cockpit keeps showing its seven project-os views,
 * and Deck's own provider offers the same seven. A vault's `.base` files
 * become views by adding a provider here, not by touching the renderer.
 *
 * Since 2026-09-09 a provider returns DESCRIPTIONS rather than three-field
 * records (FEAT-0012). A view used to be an id, a label and a sidecar mode,
 * with every other decision about it in code; it is now one document per view
 * saying what it selects, how it bands, what a card shows and which surfaces
 * may draw it. Nothing a person sees changed on the day that landed, which is
 * what [[TST-0006]]'s fixture — read off the cockpit's own navigator — is for.
 */
import {
  DESCRIPTION_VERSION,
  type BandTable,
  type Description,
  type FaceSection,
} from './description.js';
import type { DeckView, ViewSource, Workspace, WorkspaceKind } from './types.js';

/**
 * The band rule every project-os view shares, and the two shapes it takes.
 *
 * Read top to bottom: the first row that matches wins. This is the rule
 * [[TASK-0023]] already draws in the navigator — the Needs-you group first,
 * the view's own groups next, the suppressed group folded away — written down
 * once instead of implied by the order the sidecar sends its groups in.
 */
function bandTable(gathersOwed: boolean): BandTable {
  return {
    gathersOwed,
    frontCapacity: 12,
    midCapacity: 40,
    rows: [
      {
        when: { owed: true },
        band: 'front',
        note: gathersOwed
          ? 'This view gathers what is owed itself, so the sidecar sends it no Needs-you group. A note the payload still marks owed stands in front.'
          : "The sidecar's Needs-you group. Nothing owed is ever demoted; past the front band's capacity it is counted, not moved.",
      },
      {
        when: { suppressed: true },
        band: 'deep',
        note: 'Finished work, behind you. Nothing reaches this band for not fitting: "behind you" has to mean finished.',
      },
      { when: {}, band: 'mid', note: "The view's own subject." },
    ],
  };
}

/**
 * The faces [[TASK-0028]] built, as a description section.
 *
 * They used to be four branches on a note's type inside `faces.ts`. Written
 * here they are data: a vault type gets a face by gaining an entry, and
 * `faces.ts` holds no type name at all.
 */
const PROJECT_OS_FACES: FaceSection = {
  default: { title: 'title', subtitle: 'subtitle', image: null, fields: [], measure: 'none' },
  byType: {
    // Anything that holds other notes shows how much of it is finished.
    phase: { title: 'title', subtitle: 'subtitle', image: null, fields: [], measure: 'progress' },
    feature: { title: 'title', subtitle: 'subtitle', image: null, fields: [], measure: 'progress' },
    surface: { title: 'title', subtitle: 'subtitle', image: null, fields: [], measure: 'progress' },
    requirement: { title: 'title', subtitle: 'subtitle', image: null, fields: [], measure: 'progress' },
    // A severity is not in an issue's status, and it is the thing a person
    // triaging reads first.
    issue: { title: 'title', subtitle: 'subtitle', image: null, fields: ['severity'], measure: 'severity' },
    // A test's last walk, and whether it has gone stale.
    test: { title: 'title', subtitle: 'subtitle', image: null, fields: [], measure: 'verified' },
  },
};

/** Every project-os view is drawn as a list or on the desk, and not yet in the field. */
const PROJECT_OS_SURFACES = Object.freeze(['list', 'spread']);

function modeView(id: string, label: string, mode: string, gathersOwed = false): Description {
  return {
    version: DESCRIPTION_VERSION,
    id,
    label,
    // The sidecar's groups ARE the arrangement for all seven. No query is
    // evaluated and no record is read from Deck's index, so these seven need
    // nothing from FEAT-0011.
    source: { kind: 'mode', mode },
    band: bandTable(gathersOwed),
    face: PROJECT_OS_FACES,
    // `glass` is absent because Glass does not exist yet, not because these
    // views are unsuited to it: PHASE-0002 adds it per view as it draws them,
    // and the surface vocabulary refuses the name until then.
    surfaces: [...PROJECT_OS_SURFACES],
    verbs: 'registry',
    extensions: {},
  };
}

/**
 * The seven views the cockpit's navigator shows for a project-os repository.
 *
 * `issues`, `tests` and `publication` gather their own obligations — the
 * cockpit's `_VIEWS_THAT_ALREADY_GATHER` — so the sidecar sends them no
 * Needs-you group and no suppressed group. Their band tables say so.
 */
const PROJECT_OS_VIEWS: readonly Description[] = Object.freeze([
  {
    ...modeView('overview', 'Overview', 'overview'),
    /**
     * Overview is the one view the shape does not carry, and this is the
     * finding rather than a workaround pretending to be a design.
     *
     * It is not a view of NOTES: it is a page of statistics built from the
     * sidecar's `/api/cockpit/stats`, and `source` has two kinds, both of
     * which select notes. The extension namespace is what the language has for
     * exactly this, so the fact is written in Deck's own key and the renderer
     * reads it there. What it would take to say this properly is for Overview
     * to become a PAGE — the address grammar already has the `page` key and an
     * empty registry waiting for one (TASK-0052) — which is PHASE-0004's work.
     */
    source: { kind: 'query', filter: false, sort: [], groupBy: null, formulas: {} },
    extensions: { 'deck:stats': true },
  },
  modeView('intent', 'Intent', 'intent'),
  modeView('features', 'Features', 'features'),
  modeView('issues', 'Issues', 'issues', true),
  modeView('tests', 'Tests', 'tests', true),
  modeView('publication', 'Publication', 'publication', true),
  modeView('library', 'Library', 'library'),
]);

export { PROJECT_OS_FACES };

export interface ViewProvider {
  readonly kind: WorkspaceKind;
  views(workspace: Workspace): Description[];
}

export const projectOsProvider: ViewProvider = {
  kind: 'project-os',
  views(): Description[] {
    return PROJECT_OS_VIEWS.map(copy);
  },
};

function copy(description: Description): Description {
  return JSON.parse(JSON.stringify(description)) as Description;
}

/**
 * How the renderer routes a description's contents.
 *
 * The renderer never names a sidecar route; it asks here. `stats` is the
 * Overview case described above, and it is read from Deck's own extension key
 * rather than from a third `source.kind`, because a third kind would have to
 * be one the parser accepts and the shape does not have one.
 */
export function sourceOf(description: Description): ViewSource {
  if (description.extensions['deck:stats'] === true) return { kind: 'stats' };
  if (description.source.kind === 'mode') return { kind: 'nav', mode: description.source.mode };
  return { kind: 'query' };
}

/**
 * Which navigation mode's obligations apply to a query-sourced view.
 *
 * A query decides which notes a view HOLDS; whether one needs a person is the
 * cockpit's judgement, and it arrives on a navigation payload for one mode. A
 * description that wants those marks names the mode it wants them from, in
 * Deck's own namespace, and one that names none simply has none — which is the
 * normal case for a vault, whose notes project-os does not track at all.
 *
 * The name lives HERE rather than in the renderer, which holds no view name at
 * all: one convenient hard-coded mode in the renderer is exactly what
 * [[TST-0006]]'s search exists to catch.
 */
export function marksModeFor(description: Description): string | null {
  const value = description.extensions['deck:marksFrom'];
  return typeof value === 'string' && value !== '' ? value : null;
}

/** The three-field shape the renderer's switcher and address still speak. */
export function asDeckView(description: Description): DeckView {
  return { id: description.id, label: description.label, source: sourceOf(description) };
}

export class ViewRegistry {
  private readonly providers = new Map<WorkspaceKind, ViewProvider>();

  constructor(providers: ViewProvider[] = [projectOsProvider]) {
    for (const provider of providers) this.providers.set(provider.kind, provider);
  }

  register(provider: ViewProvider): void {
    this.providers.set(provider.kind, provider);
  }

  /** No provider for this kind means no views, said out loud rather than an empty screen. */
  viewsFor(workspace: Workspace): { views: Description[]; reason: string | null } {
    const provider = this.providers.get(workspace.kind);
    if (provider === undefined) {
      return { views: [], reason: `no view provider for a ${workspace.kind} workspace` };
    }
    return { views: provider.views(workspace), reason: null };
  }

  /** A view id the provider did not return cannot be selected. */
  resolve(workspace: Workspace, viewId: string): Description | null {
    return this.viewsFor(workspace).views.find((v) => v.id === viewId) ?? null;
  }
}

export const DEFAULT_VIEW_ID = 'features';
