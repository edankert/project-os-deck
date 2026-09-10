// TST-0032 — a card's band and a card's face come from the view's description,
// and the vocabulary Deck copies from the cockpit is pinned (TASK-0044, and
// TASK-0029's band function).
//
// `faces.ts` used to branch on a note's TYPE. That was wrong in a way only a
// vault showed: a character with a portrait, a page with a number and a chapter
// that orders its pages all arrived as plain cards, because none of them is one
// of the four types somebody thought of.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const { bandOf, bandCards, bandInputsFor } = load('shared/description.js');
const { faceFor, faceText, fieldsFor, specFor, bandFor } = load('shared/faces.js');
const { STATUS_BANDS, LEGACY_STATUS_BANDS, COMPLETED_STATUSES, isCompleted } = load('shared/statuses.js');
const { projectOsProvider, PROJECT_OS_FACES } = load('shared/views.js');
const { groupsFromNav, navFromPayload } = load('shared/sidecar-client.js');

const WORKSPACE = { id: 'aaaa1111', root: '/repo', name: 'a repo', kind: 'project-os' };
const VIEWS = projectOsProvider.views(WORKSPACE);
const STATUS_FIXTURE = JSON.parse(
  fs.readFileSync(path.join(desktopRoot, 'fixtures', 'cockpit-statuses.json'), 'utf-8'),
);

function card(extra = {}) {
  return {
    noteId: 'ISS-0001',
    title: 'A note',
    noteType: 'issue',
    status: 'open',
    rel: null,
    subtitle: null,
    owed: false,
    owedVerb: null,
    groupKey: 'g',
    severity: null,
    lastVerified: null,
    stale: false,
    progress: null,
    children: [],
    frontmatter: null,
    ...extra,
  };
}

function inputs(extra = {}) {
  return { owed: false, suppressed: false, inSubject: true, held: false, joinedToDesk: false, pulled: false, pushed: false, ...extra };
}

// ---- faces.ts holds no type ----

test('faces.ts contains no branch on a note type', () => {
  // Crude on purpose, like the view-name search beside it: it is the only kind
  // of check that catches somebody adding one convenient branch, which then
  // survives every description change.
  const source = fs.readFileSync(path.join(desktopRoot, 'dist', 'shared', 'faces.js'), 'utf-8');
  for (const type of ['test', 'issue', 'feature', 'phase', 'surface', 'requirement', 'character', 'chapter']) {
    assert.ok(!source.includes(`'${type}'`), `faces.js names the note type "${type}"`);
    assert.ok(!source.includes(`"${type}"`), `faces.js names the note type "${type}"`);
  }
});

test('changing a description\'s face changes what the card shows, with no change to the renderer', () => {
  const issue = card({ severity: 'critical' });
  assert.equal(faceText(issue, PROJECT_OS_FACES), 'critical · open');

  // The same card, one section changed. Nothing in the renderer is touched.
  const rewritten = {
    default: PROJECT_OS_FACES.default,
    byType: { issue: { title: 'title', subtitle: null, image: null, fields: [], measure: 'none' } },
  };
  assert.deepEqual(faceFor(issue, rewritten), { kind: 'plain' });
  assert.equal(faceText(issue, rewritten), 'issue · open');
});

test('a vault type gets a face by being WRITTEN, not by adding a branch', () => {
  const character = card({
    noteId: 'Ada',
    noteType: 'character',
    status: 'draft',
    frontmatter: { role: 'lead', archetype: 'the mentor', portrait: '[[ada.png]]' },
  });
  // With the project-os faces it is a plain card, because project-os has never
  // heard of a character. That is the DEFAULT doing its job.
  assert.deepEqual(faceFor(character, PROJECT_OS_FACES), { kind: 'plain' });

  const vaultFaces = {
    default: PROJECT_OS_FACES.default,
    byType: {
      character: {
        title: 'title',
        subtitle: 'role',
        image: 'note.portrait',
        fields: ['role', 'archetype'],
        measure: 'none',
      },
    },
  };
  const spec = specFor(vaultFaces, character);
  assert.equal(spec.image, 'note.portrait');
  assert.deepEqual(fieldsFor(spec, character.frontmatter), [
    { property: 'role', value: 'lead' },
    { property: 'archetype', value: 'the mentor' },
  ]);
});

test('the four faces TASK-0028 built produce the cards they produced before', () => {
  const feature = card({
    noteId: 'FEAT-0085',
    noteType: 'feature',
    children: [card({ status: 'done' }), card({ status: 'done' }), card({ status: 'doing' })],
  });
  assert.equal(faceText(feature, PROJECT_OS_FACES), '2 of 3 done');
  assert.equal(faceText(card({ severity: 'high' }), PROJECT_OS_FACES), 'high · open');
  assert.equal(
    faceText(card({ noteType: 'test', lastVerified: '2026-09-06' }), PROJECT_OS_FACES),
    'walked 2026-09-06',
  );
  assert.equal(faceText(card({ noteType: 'change', status: 'merged' }), PROJECT_OS_FACES), 'change · merged');
});

// ---- the band table ----

test('a band comes from the description, through one function every surface calls', () => {
  const features = VIEWS.find((v) => v.id === 'features');
  assert.equal(bandOf(features.band, inputs({ owed: true })), 'front');
  assert.equal(bandOf(features.band, inputs({ suppressed: true })), 'deep');
  assert.equal(bandOf(features.band, inputs()), 'mid');
  // An owed note that is ALSO in the view's own groups is still in front: the
  // sidecar repeats an owed note under its phase, and the first matching row
  // wins, which is what makes a description read like the rule it is.
  assert.equal(bandOf(features.band, inputs({ owed: true, inSubject: true })), 'front');
});

test('for each of the seven views the table says which group lands in which band', () => {
  for (const view of VIEWS) {
    assert.equal(bandOf(view.band, inputs({ owed: true })), 'front', `${view.id} does not put what is owed in front`);
    assert.equal(bandOf(view.band, inputs({ suppressed: true })), 'deep', `${view.id} does not put finished work behind`);
    assert.equal(bandOf(view.band, inputs()), 'mid', `${view.id} does not put its own subject in the middle`);
  }
});

test('a view with no Needs-you group has a ROW saying so, not a fallback', () => {
  // `issues`, `tests` and `publication` gather their own obligations, so the
  // sidecar sends them no Needs-you group. A table that simply found none and
  // shrugged could not tell that apart from a view whose obligations are gone.
  for (const id of ['issues', 'tests', 'publication']) {
    const view = VIEWS.find((v) => v.id === id);
    assert.equal(view.band.gathersOwed, true, `${id} does not say it gathers its own obligations`);
    const row = view.band.rows.find((r) => r.when.owed === true);
    assert.match(row.note, /gathers what is owed/, `${id}'s row does not say why it has no Needs-you group`);
  }
  for (const id of ['intent', 'features', 'library']) {
    assert.equal(VIEWS.find((v) => v.id === id).band.gathersOwed, false);
  }
});

test('nothing owed is ever demoted: past the front band it is COUNTED', () => {
  const view = VIEWS.find((v) => v.id === 'issues');
  // Your Trainer's Issues view has 34 needing triage and 409 in all, so the
  // front band overflows in the normal case rather than the rare one.
  const owed = Array.from({ length: 34 }, (_, i) => ({ card: `owed-${i}`, inputs: inputs({ owed: true }) }));
  const banded = bandCards(view.band, owed);
  assert.equal(banded.front.length, view.band.frontCapacity);
  assert.equal(banded.frontOverflow, 34 - view.band.frontCapacity);
  assert.equal(banded.mid.length, 0, 'an owed note was demoted to the middle');
  assert.equal(banded.deep.length, 0, 'an owed note was pushed behind the person');
});

test('mid overflow is counted and never falls into the quiet band', () => {
  const view = VIEWS.find((v) => v.id === 'features');
  const subject = Array.from({ length: 60 }, (_, i) => ({ card: `note-${i}`, inputs: inputs() }));
  const banded = bandCards(view.band, subject);
  assert.equal(banded.mid.length, view.band.midCapacity);
  assert.equal(banded.midOverflow, 60 - view.band.midCapacity);
  // "Behind you" has to mean finished, not "did not fit".
  assert.equal(banded.deep.length, 0);
});

test('the desk and the hands fill their columns, and owed beats every one of them', () => {
  // Reserved by TASK-0029 in 2026-09-07's plan and filled on 2026-09-10:
  // joined-to-desk by FEAT-0010's neighbourhood, pulled and pushed by
  // FEAT-0014's hands. Held changes nothing on its own: a held note is on the
  // desk, and its slot in the field stays where it was, ghosted.
  const view = VIEWS.find((v) => v.id === 'features');
  assert.equal(bandOf(view.band, inputs({ held: true })), 'mid', 'holding a note moves its slot');
  assert.equal(bandOf(view.band, inputs({ joinedToDesk: true })), 'front', 'the neighbourhood takes the front band');
  assert.equal(bandOf(view.band, inputs({ pulled: true })), 'front', 'pulled beats the subject');
  assert.equal(bandOf(view.band, inputs({ pushed: true })), 'deep', 'pushed beats the subject');
  assert.equal(bandOf(view.band, inputs({ owed: true, inSubject: false, pushed: true })), 'front', 'owed beats pushed');
  assert.equal(bandOf(view.band, inputs({ suppressed: true, inSubject: false, pulled: true })), 'front', 'a hand may bring finished work forward');
  const withHeld = {
    ...view.band,
    rows: [{ when: { held: true }, band: 'front' }, ...view.band.rows],
  };
  assert.equal(bandOf(withHeld, inputs({ held: true })), 'front', 'the column cannot be filled by a description');
});

/** A real navigation payload, dealt into the bands the way a surface would. */
function bandRealPayload(file, viewId) {
  const raw = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'nav', file), 'utf-8'));
  // Through the SAME reader a live payload goes through, so what is measured
  // is the band function and not the fixture.
  const groups = groupsFromNav(navFromPayload(raw, viewId));
  const view = VIEWS.find((v) => v.id === viewId);
  // Through the one helper every surface uses, so what is measured is the rule
  // and not the suite's own reading of the payload.
  const entries = groups.flatMap((group) => group.cards.map((c) => ({ card: c, inputs: bandInputsFor(group, c) })));
  return { view, entries, banded: bandCards(view.band, entries) };
}

test('the band function runs over the REAL navigation payloads, and loses nothing', () => {
  // Recorded from the sidecar's own `nav_payload` by
  // tools/scripts/record-sidecar-fixture.py: this repository, and Your
  // Trainer's two biggest views, where the front band overflows in the normal
  // case rather than the rare one.
  for (const [file, viewId] of [
    ['deck-features.json', 'features'],
    ['your-trainer-features.json', 'features'],
    ['your-trainer-issues.json', 'issues'],
  ]) {
    const { entries, banded } = bandRealPayload(file, viewId);
    assert.ok(entries.length > 5, `${file} has almost nothing in it`);
    assert.equal(
      banded.front.length + banded.frontOverflow,
      entries.filter((e) => e.inputs.owed).length,
      `${file}: an owed note went missing between the payload and the front band`,
    );
    assert.equal(
      banded.deep.length,
      entries.filter((e) => e.inputs.suppressed && !e.inputs.owed).length,
      `${file}: the quiet band does not hold exactly the finished work`,
    );
    assert.equal(
      banded.front.length + banded.frontOverflow + banded.mid.length + banded.midOverflow + banded.deep.length,
      entries.length,
      `${file}: a note is in no band and in no overflow count`,
    );
  }
});

test("Your Trainer's Issues view overflows both bands, which is the normal case", () => {
  // 40 needing triage and 427 in all. If the overflow counts were zero here
  // the two checks above would be passing on data that never tests them.
  const { banded } = bandRealPayload('your-trainer-issues.json', 'issues');
  assert.ok(banded.frontOverflow > 0, `the front band did not overflow (${banded.front.length} in front)`);
  assert.ok(banded.midOverflow > 0, `the middle band did not overflow (${banded.mid.length} in the middle)`);
  assert.ok(banded.deep.length > 100, `only ${banded.deep.length} finished issues went behind`);
});

// ---- the vocabulary Deck copies ----

test("Deck's status bands equal the cockpit's, band by band", () => {
  // Deck's copy drifted from `statuses.py` within two days of being written
  // and nothing caught it: `draft`, `proposed` and `ready` were in the doing
  // band where the cockpit puts all three in `pending`.
  const mine = Object.fromEntries(Object.entries(STATUS_BANDS).map(([band, members]) => [band, [...members].sort()]));
  assert.deepEqual(mine, STATUS_FIXTURE.bands);
  assert.deepEqual([...COMPLETED_STATUSES].sort(), STATUS_FIXTURE.completed);
  assert.deepEqual(LEGACY_STATUS_BANDS, STATUS_FIXTURE.legacy);
});

test('the fixture says the date and the commit it was read at', () => {
  assert.match(STATUS_FIXTURE.recordedFrom, /statuses\.py/);
  assert.match(STATUS_FIXTURE.recordedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(STATUS_FIXTURE.cockpitCommit.length > 0);
});

test('a status project-os has never heard of is "none", not a guess', () => {
  assert.equal(bandFor('fixed'), 'done');
  assert.equal(bandFor('doing'), 'active');
  assert.equal(bandFor('backlog'), 'pending');
  assert.equal(bandFor('draft'), 'pending');
  assert.equal(bandFor('in-progress'), 'active', 'a retired value still renders as what it used to be');
  // The vault writes `research`, `planning` and `none`, and project-os knows
  // none of the three. Drawing them as `pending` would be Deck asserting
  // something about a vocabulary that is not its own.
  for (const unknown of ['research', 'planning', 'none', '', null, undefined]) {
    assert.equal(bandFor(unknown), 'none', `"${unknown}" was given a band`);
  }
  assert.equal(isCompleted('released'), true);
  assert.equal(isCompleted('cancelled'), true, 'terminal without success is still terminal');
  assert.equal(isCompleted('doing'), false);
});
