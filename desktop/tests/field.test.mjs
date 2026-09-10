// TST-0040 — the field's deal: every view's notes into three bands, with the
// desk's and the hands' inputs, over the real navigation payloads (TASK-0029's
// use of the band table, TASK-0036's neighbourhood, TASK-0053's hands).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const { fieldEntries, dealField, pushRefusal, JOINED_GROUP } = load('shared/field.js');
const { projectOsProvider } = load('shared/views.js');
const { groupsFromNav, navFromPayload } = load('shared/sidecar-client.js');

const WORKSPACE = { id: 'aaaa1111', root: '/repo', name: 'a repo', kind: 'project-os' };
const VIEWS = projectOsProvider.views(WORKSPACE);

function real(file, viewId) {
  const raw = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'nav', file), 'utf-8'));
  return { groups: groupsFromNav(navFromPayload(raw, viewId)), view: VIEWS.find((v) => v.id === viewId) };
}

function hand(extra = {}) {
  return { held: new Set(), joined: new Set(), pulled: new Set(), pushed: new Set(), ...extra };
}

function card(noteId, extra = {}) {
  return {
    noteId,
    title: noteId,
    noteType: 'issue',
    status: 'open',
    rel: `${noteId}.md`,
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

test('every one of the seven views has a band table the field can deal with', () => {
  assert.equal(VIEWS.length, 7);
  for (const view of VIEWS) {
    const rows = view.band.rows.map((r) => `${JSON.stringify(r.when)}->${r.band}`);
    assert.equal(rows[0], '{"owed":true}->front', `${view.id}: owed is not the first rule, so a hand could move it`);
    assert.ok(rows.includes('{"pushed":true}->deep'), `${view.id} has no row for a pushed note`);
    assert.ok(rows.includes('{"pulled":true}->front'), `${view.id} has no row for a pulled note`);
    assert.ok(rows.includes('{"joinedToDesk":true}->front'), `${view.id} has no row for the neighbourhood`);
    assert.equal(rows.at(-1), '{}->mid');
  }
  // The three views with no Needs-you group say so in a ROW of the table, not
  // by falling through.
  assert.deepEqual(VIEWS.filter((v) => v.band.gathersOwed).map((v) => v.id).sort(), ['issues', 'publication', 'tests']);
});

test("the sidecar's double listing of an owed note is dealt once, under its own heading", () => {
  const groups = [
    { key: 'needs-you', label: 'Needs you', needsHuman: true, suppressed: false, cards: [card('FEAT-0002', { owed: true, owedVerb: 'review' })] },
    { key: 'PHASE-0001', label: 'Deck', needsHuman: false, suppressed: false, cards: [card('FEAT-0002'), card('FEAT-0003')] },
  ];
  const entries = fieldEntries(groups);
  assert.deepEqual(entries.map((e) => e.card.noteId), ['FEAT-0002', 'FEAT-0003']);
  assert.equal(entries[0].inputs.owed, true);
  assert.equal(entries[0].groupKey, 'PHASE-0001', 'it would sit in a Needs-you sector if a hand ever let it go');
});

test('over the real payloads, nothing owed leaves the front band and nothing unfinished falls behind', () => {
  for (const [file, viewId] of [
    ['deck-features.json', 'features'],
    ['your-trainer-features.json', 'features'],
    ['your-trainer-issues.json', 'issues'],
  ]) {
    const { groups, view } = real(file, viewId);
    const entries = fieldEntries(groups);
    const deal = dealField(view.band, entries);
    const owed = entries.filter((e) => e.inputs.owed).length;
    assert.equal(deal.front.length + deal.frontOverflow, owed, `${file}: an owed note went missing`);
    assert.equal(deal.owed, owed);
    assert.ok(deal.mid.every((e) => !e.inputs.owed), `${file}: an owed note is in the middle`);
    assert.ok(deal.deep.every((e) => !e.inputs.owed), `${file}: an owed note is behind`);
    assert.ok(deal.deep.every((e) => e.inputs.suppressed), `${file}: something unfinished is behind`);
    assert.equal(
      deal.front.length + deal.frontOverflow + deal.mid.length + deal.midOverflow + deal.deep.length,
      entries.length,
      `${file}: a note was dealt nowhere and counted nowhere`,
    );
  }
});

test("Your Trainer's Issues view overflows the front band, and says by how much", () => {
  const { groups, view } = real('your-trainer-issues.json', 'issues');
  const deal = dealField(view.band, fieldEntries(groups));
  assert.equal(deal.front.length, view.band.frontCapacity);
  assert.ok(deal.frontOverflow > 20, `only ${deal.frontOverflow} counted past the front band`);
  assert.equal(deal.handPlaced, 0);
});

test('the middle holds the view’s headings in the navigator’s order', () => {
  const { groups, view } = real('your-trainer-features.json', 'features');
  const deal = dealField(view.band, fieldEntries(groups));
  const headings = [...new Set(deal.mid.map((e) => e.groupKey))];
  const order = groups.map((g) => g.key).filter((k) => headings.includes(k));
  assert.deepEqual(headings, order);
});

test('a pulled note stands in front with a hand counted, and a pushed one stands behind', () => {
  const groups = [
    { key: 'a', label: 'A', needsHuman: false, suppressed: false, cards: [card('X-1'), card('X-2'), card('X-3')] },
    { key: 'done', label: 'Done', needsHuman: false, suppressed: true, cards: [card('X-4', { status: 'done' })] },
  ];
  const view = VIEWS.find((v) => v.id === 'features');
  const deal = dealField(view.band, fieldEntries(groups, hand({ pulled: new Set(['X-1', 'X-4']), pushed: new Set(['X-2']) })));
  assert.deepEqual(deal.front.map((e) => e.card.noteId), ['X-1', 'X-4']);
  assert.deepEqual(deal.mid.map((e) => e.card.noteId), ['X-3']);
  assert.deepEqual(deal.deep.map((e) => e.card.noteId), ['X-2']);
  assert.equal(deal.handPlaced, 2);
  assert.equal(deal.pushedBehind, 1);
});

test('an owed note cannot be pushed, and the refusal says why in words', () => {
  const groups = [
    { key: 'needs', label: 'Needs you', needsHuman: true, suppressed: false, cards: [card('ISS-0008', { owed: true, owedVerb: 'triage' })] },
  ];
  const view = VIEWS.find((v) => v.id === 'issues');
  const entries = fieldEntries(groups, hand({ pushed: new Set(['ISS-0008']) }));
  const deal = dealField(view.band, entries);
  assert.deepEqual(deal.front.map((e) => e.card.noteId), ['ISS-0008'], 'a push moved an owed note');
  assert.equal(deal.pushedBehind, 0);
  assert.match(pushRefusal(entries[0]), /ISS-0008 stays in front: it is owed triage/);
  const free = fieldEntries([{ key: 'a', label: 'A', needsHuman: false, suppressed: false, cards: [card('X-9')] }]);
  assert.equal(pushRefusal(free[0]), null);
});

test('while a note is held, its neighbourhood comes first, from inside the view and outside it', () => {
  const { groups, view } = real('your-trainer-issues.json', 'issues');
  const inView = groups.find((g) => !g.needsHuman && g.cards.length > 0).cards[0].noteId;
  const outside = card('TASK-9999', { noteType: 'task' });
  const entries = fieldEntries(groups, hand({ held: new Set(['X']), joined: new Set([inView, 'TASK-9999']) }), [outside]);
  const deal = dealField(view.band, entries);
  assert.deepEqual(deal.front.slice(0, 2).map((e) => e.card.noteId).sort(), [inView, 'TASK-9999'].sort());
  assert.equal(entries.find((e) => e.card.noteId === 'TASK-9999').groupKey, JOINED_GROUP.key);
  // The owed count is the same before and during: it is pinned, not dealt.
  const before = dealField(view.band, fieldEntries(groups));
  assert.equal(deal.owed, before.owed);
  assert.equal(deal.front.length + deal.frontOverflow, before.owed + 2 - (before.owed > 0 && entries.find((e) => e.card.noteId === inView).inputs.owed ? 1 : 0));
});

test('a child the navigator folds away is dealt only when a person named it', () => {
  const feature = card('FEAT-1', { noteType: 'feature', children: [card('TASK-1', { noteType: 'task' })] });
  const groups = [{ key: 'p', label: 'P', needsHuman: false, suppressed: false, cards: [feature] }];
  assert.deepEqual(fieldEntries(groups).map((e) => e.card.noteId), ['FEAT-1']);
  assert.deepEqual(fieldEntries(groups, hand({ pulled: new Set(['TASK-1']) })).map((e) => e.card.noteId), ['FEAT-1', 'TASK-1']);
});
