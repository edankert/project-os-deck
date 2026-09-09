/**
 * The status vocabulary, copied from the cockpit because it is not served.
 *
 * Deck colours a status and folds finished work away, and the vocabulary that
 * decides both belongs to project-os, not to Deck. The sidecar serves none of
 * it as data — there is no endpoint that says "these are the statuses, in
 * these bands" — so Deck keeps a copy, and a copy Deck cannot ask for is a
 * copy a test has to check.
 *
 * **It has already drifted once.** The first version of this put `draft`,
 * `proposed` and `ready` in the doing band; the cockpit's `statuses.py` puts
 * all three in `pending`. That happened within two days of the copy being
 * written and nothing caught it, which is the whole argument for the fixture
 * beside this file (`desktop/fixtures/cockpit-statuses.json`, recorded by
 * `tools/scripts/record-sidecar-fixture.py`).
 *
 * **The band names are the cockpit's own**, rather than a second set of Deck
 * names mapped onto them. Two vocabularies for one idea is what drifted; one
 * is what does not.
 */

/** Band to members, mirroring `BANDS` in the cockpit's `statuses.py`. */
export const STATUS_BANDS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  active: ['accepted', 'active', 'approved', 'doing', 'mitigating', 'next', 'review'],
  archived: [
    'abandoned',
    'cancelled',
    'declined',
    'deprecated',
    'obsolete',
    'reconciled',
    'reverted',
    'retired',
    'superseded',
  ],
  blocked: ['blocked', 'failing', 'reopened'],
  done: [
    'closed',
    'complete',
    'done',
    'fixed',
    'fulfilled',
    'implemented',
    'merged',
    'met',
    'passing',
    'published',
    'released',
    'resolved',
    'verified',
  ],
  pending: ['backlog', 'draft', 'open', 'pending', 'planned', 'proposed', 'ready', 'todo', 'triage'],
  reference: ['deferred', 'reference'],
});

/**
 * Values project-os retired, still coloured as what they used to be.
 *
 * Rendering tolerance, not permission: the cockpit shows ten corpora that
 * migrate on their own schedule, and colouring a live note grey would tell the
 * reader something false about a state the system understands perfectly well
 * under its old name.
 */
export const LEGACY_STATUS_BANDS: Readonly<Record<string, string>> = Object.freeze({
  'in-progress': 'active',
  'in-review': 'active',
  'rolled-back': 'archived',
  'wont-fix': 'archived',
});

const BY_STATUS: Record<string, string> = {};
for (const [band, members] of Object.entries(STATUS_BANDS)) {
  for (const status of members) BY_STATUS[status] = band;
}

/** What "hide completed" removes: terminal, whether or not it succeeded. */
export const COMPLETED_STATUSES: ReadonlySet<string> = new Set([
  ...STATUS_BANDS['done'] ?? [],
  ...STATUS_BANDS['archived'] ?? [],
]);

/**
 * The band a status belongs to, or `none` when Deck has never heard of it.
 *
 * `none` rather than a guess. A vault writes `research`, `planning` and `none`
 * today, and project-os knows none of the three; drawing them as though they
 * were `pending` would be Deck asserting something about a vocabulary that is
 * not its own.
 */
export function bandFor(status: string | null | undefined): string {
  if (typeof status !== 'string') return 'none';
  const value = status.trim().toLowerCase();
  if (value === '') return 'none';
  return BY_STATUS[value] ?? LEGACY_STATUS_BANDS[value] ?? 'none';
}

/** Whether this status means the work is over, successfully or not. */
export function isCompleted(status: string | null | undefined): boolean {
  return typeof status === 'string' && COMPLETED_STATUSES.has(status.trim().toLowerCase());
}
