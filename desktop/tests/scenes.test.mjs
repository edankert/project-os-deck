// A scene is a named, saved arrangement of one view's Glass desk (FEAT-0023,
// ADR-0007). It keeps where things stand and where each document was being
// read. It keeps nothing derived and nothing of the session, a desk saved
// before scenes still opens, and one a newer Deck saved is kept untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { reduce, initialState, normaliseState, persistable, deskCardsOf, collectionOf, deskKey } = load('shared/store-state.js');
const { SCENE_VERSION, sceneKind, listScenes, readingAnchorAt, scrollTopForAnchor, sceneReport, sceneFrom, normaliseScene } = load('shared/scenes.js');

const WS = 'aaaa1111bbbb2222';
const list = { x: 12, y: 12, w: 340, h: 700, collapsed: false, presentation: 'cards' };

function desk() {
  let s = reduce(initialState(), { type: 'open-workspace', workspaceId: WS });
  s = reduce(s, { type: 'select-view', viewId: 'issues' });
  s = reduce(s, { type: 'put-on-desk', noteId: 'ISS-0001', x: 400, y: 20, w: 640, h: 560 });
  s = reduce(s, { type: 'put-on-desk', noteId: 'ISS-0002', x: 700, y: 60, w: 560, h: 520 });
  s = reduce(s, { type: 'set-collection', layout: list });
  s = reduce(s, { type: 'set-query', text: 'glass' });
  s = reduce(s, { type: 'set-filters', filters: { statuses: ['open'], types: [] } });
  return s;
}
const extras = { anchors: { 'ISS-0001': { heading: 'Problem', past: 40, fraction: 0.2 }, 'NOT-OPEN': { heading: null, past: 0, fraction: 0 } }, field: { w: 1260, h: 745 }, savedAt: '2026-10-02T10:00:00Z' };
const save = (s, name = 'Review Glass') => reduce(s, { type: 'save-scene', name, ...extras });

test('a scene keeps the view, the search, the collection, each document and where it was read, and nothing derived', () => {
  const s = save(desk());
  const scene = s.desks[deskKey(WS, 'Review Glass')];
  assert.equal(scene.version, SCENE_VERSION);
  assert.equal(sceneKind(scene), 'scene');
  assert.equal(scene.view, 'issues');
  assert.equal(scene.query, 'glass');
  assert.deepEqual(scene.filters, { statuses: ['open'], types: [] });
  assert.deepEqual(scene.collection, list);
  assert.deepEqual(scene.cards, [{ noteId: 'ISS-0001', x: 400, y: 20, w: 640, h: 560 }, { noteId: 'ISS-0002', x: 700, y: 60, w: 560, h: 520 }]);
  assert.deepEqual(scene.anchors, { 'ISS-0001': { heading: 'Problem', past: 40, fraction: 0.2 } }, 'an anchor for a note that is not on the desk is not kept');
  assert.deepEqual(scene.field, { w: 1260, h: 745 });
  assert.equal(s.deskName, 'Review Glass');
  // Everything a scene holds, by name: no rows, ids of members, counts, text, yaw, zoom, focus or undo.
  assert.deepEqual(Object.keys(scene).sort(), ['anchors', 'cards', 'collection', 'field', 'filters', 'name', 'query', 'savedAt', 'version', 'view', 'workspaceId']);
  // It survives being written to disk and read back.
  const again = normaliseState(JSON.parse(JSON.stringify(persistable(s))));
  assert.deepEqual(again.desks[deskKey(WS, 'Review Glass')], scene);
});

test('opening a scene brings back its view, search, collection and documents, and can be taken back', () => {
  const saved = save(desk());
  // The person moves on: another view, another search, the desk cleared, the collection as a table.
  let s = reduce(saved, { type: 'clear-desk' });
  s = reduce(s, { type: 'set-collection', layout: { ...list, presentation: 'table', x: 300 } });
  s = reduce(s, { type: 'set-query', text: '' });
  s = reduce(s, { type: 'select-view', viewId: 'features' });
  s = reduce(s, { type: 'put-on-desk', noteId: 'FEAT-0009', x: 10, y: 10 });
  // What is on screen now, kept by the window so opening the scene can be undone.
  const before = sceneFrom({ workspaceId: WS, view: 'features', query: s.query, filters: s.filters, collection: collectionOf(s, WS, 'features'), cards: deskCardsOf(s, WS, 'features') }, s.deskName ?? '', { anchors: {}, field: { w: 1260, h: 745 }, savedAt: '' });
  const opened = reduce(s, { type: 'open-desk', name: 'Review Glass' });
  assert.equal(opened.viewId, 'issues', 'the scene\'s own view comes with it');
  assert.equal(opened.query, 'glass');
  assert.deepEqual(opened.filters, { statuses: ['open'], types: [] });
  assert.deepEqual(collectionOf(opened, WS, 'issues'), list);
  assert.deepEqual(deskCardsOf(opened, WS, 'issues').map((c) => [c.noteId, c.x, c.y, c.w, c.h]), [['ISS-0001', 400, 20, 640, 560], ['ISS-0002', 700, 60, 560, 520]]);
  assert.deepEqual(deskCardsOf(opened, WS, 'features').map((c) => c.noteId), ['FEAT-0009'], 'the other view\'s desk is not touched');
  // Back to the desk before: a scene that is not in the list, applied.
  const back = reduce(opened, { type: 'apply-scene', scene: before });
  assert.equal(back.viewId, 'features');
  assert.equal(back.query, '');
  assert.deepEqual(deskCardsOf(back, WS, 'features').map((c) => c.noteId), ['FEAT-0009']);
  assert.equal(Object.keys(back.desks).length, 1, 'taking it back adds nothing to the list of scenes');
  assert.deepEqual(deskCardsOf(back, WS, 'issues').length, 2, 'and the scene\'s own view keeps what the scene put there');
});

// One note open on the Issues view, and the list where a view puts it when nobody has moved it: nothing stored.
function unmoved() {
  let s = reduce(initialState(), { type: 'open-workspace', workspaceId: WS });
  s = reduce(s, { type: 'select-view', viewId: 'issues' });
  return reduce(s, { type: 'put-on-desk', noteId: 'ISS-0001', x: 400, y: 20, w: 640, h: 560 });
}

test('a scene saved while the list had never been moved puts the list back to having no place of its own', () => {
  let s = unmoved();
  assert.equal(collectionOf(s, WS, 'issues'), null);
  s = save(s, 'Plain');
  assert.equal('collection' in s.desks[deskKey(WS, 'Plain')], false, 'a list with no stored layout is saved as having none');
  // Since then the list was dragged, collapsed and shown as a table, and another view's list was moved too.
  s = reduce(s, { type: 'set-collection', layout: { ...list, presentation: 'table', x: 300, collapsed: true } });
  s = reduce(s, { type: 'set-collection', layout: { ...list, x: 77 }, viewId: 'features' });
  const opened = reduce(s, { type: 'open-desk', name: 'Plain' });
  assert.equal(collectionOf(opened, WS, 'issues'), null, 'the list is where the scene had it: at the place a view gives it');
  assert.deepEqual(collectionOf(opened, WS, 'features'), { ...list, x: 77 }, 'another view\'s list is not touched');
  // And the state it leaves is one the state file takes and gives back.
  assert.equal(collectionOf(normaliseState(JSON.parse(JSON.stringify(persistable(opened)))), WS, 'issues'), null);
});

test('"back to the desk before" puts the list back as it was, a list that had no place of its own included', () => {
  const bare = unmoved();
  const table = { ...list, presentation: 'table' };
  // A scene of this view that keeps the list as a table, in the list of a desk whose own list was never moved.
  const s = { ...bare, desks: save(reduce(bare, { type: 'set-collection', layout: table }), 'As a table').desks };
  const before = sceneFrom({ workspaceId: WS, view: 'issues', query: s.query, filters: s.filters, collection: collectionOf(s, WS, 'issues'), cards: deskCardsOf(s, WS, 'issues') }, '', { anchors: {}, field: { w: 1260, h: 745 }, savedAt: '' });
  const opened = reduce(s, { type: 'open-desk', name: 'As a table' });
  assert.deepEqual(collectionOf(opened, WS, 'issues'), table);
  const back = reduce(opened, { type: 'apply-scene', scene: before });
  assert.equal(collectionOf(back, WS, 'issues'), null, 'the table the scene brought is gone with the scene');
});

test('a note kept on every view stays when a scene is opened, and is not doubled', () => {
  let s = desk();
  s = reduce(s, { type: 'set-every-view', noteId: 'ISS-0002', on: true });
  s = save(s);
  s = reduce(s, { type: 'clear-desk' });
  const opened = reduce(s, { type: 'open-desk', name: 'Review Glass' });
  const ids = deskCardsOf(opened, WS, 'issues').map((c) => c.noteId).sort();
  assert.deepEqual(ids, ['ISS-0001', 'ISS-0002']);
});

test('a desk saved before scenes opens exactly as it did', () => {
  let s = desk();
  s = reduce(s, { type: 'save-desk', name: 'old' });
  const old = s.desks[deskKey(WS, 'old')];
  assert.equal(old.version, undefined);
  assert.equal(sceneKind(old), 'desk');
  s = reduce(s, { type: 'clear-desk' });
  s = reduce(s, { type: 'set-query', text: 'other' });
  s = reduce(s, { type: 'select-view', viewId: 'features' });
  const opened = reduce(s, { type: 'open-desk', name: 'old' });
  assert.equal(opened.viewId, 'features', 'it has no view of its own: it opens on the view on screen');
  assert.equal(opened.query, 'other', 'and brings no search');
  assert.deepEqual(deskCardsOf(opened, WS, 'features').map((c) => c.noteId), ['ISS-0001', 'ISS-0002']);
  // And a state file holding only { name, workspaceId, cards } still reads.
  const read = normaliseState({ desks: { [deskKey(WS, 'older')]: { name: 'older', workspaceId: WS, cards: [{ noteId: 'A', x: 1, y: 2 }] } } });
  assert.deepEqual(read.desks[deskKey(WS, 'older')], { name: 'older', workspaceId: WS, cards: [{ noteId: 'A', x: 1, y: 2 }] });
});

test('a scene saved by a newer Deck is kept untouched, listed as unreadable, not opened and not overwritten', () => {
  const future = { name: 'from the future', workspaceId: WS, version: 3, cards: [{ noteId: 'A', x: 1, y: 2 }], camera: { yaw: 1.2 }, somethingNew: [1, 2, 3] };
  let s = normaliseState({ ...JSON.parse(JSON.stringify(persistable(desk()))), desks: { [deskKey(WS, 'from the future')]: future } });
  assert.deepEqual(s.desks[deskKey(WS, 'from the future')], future, 'every field survives, including ones this Deck has never heard of');
  assert.deepEqual(JSON.parse(JSON.stringify(persistable(s))).desks[deskKey(WS, 'from the future')], future, 'and is written back as it was');
  const entry = listScenes(s.desks, WS).find((e) => e.name === 'from the future');
  assert.equal(entry.kind, 'unreadable');
  assert.match(entry.why, /newer Deck \(version 3\)/);
  s = reduce(s, { type: 'open-workspace', workspaceId: WS });
  s = reduce(s, { type: 'select-view', viewId: 'issues' });
  assert.equal(reduce(s, { type: 'open-desk', name: 'from the future' }), s, 'it is not opened');
  assert.equal(reduce(s, { type: 'save-scene', name: 'from the future', ...extras }), s, 'and a scene saved under its name does not replace it');
});

test('rename keeps the scene, delete removes it, and restore puts it back only into the gap it left', () => {
  let s = save(desk());
  const scene = s.desks[deskKey(WS, 'Review Glass')];
  s = reduce(s, { type: 'rename-desk', workspaceId: WS, from: 'Review Glass', to: 'Compare designs' });
  assert.deepEqual(s.desks[deskKey(WS, 'Compare designs')], { ...scene, name: 'Compare designs' });
  assert.equal(deskKey(WS, 'Review Glass') in s.desks, false);
  assert.equal(s.deskName, 'Compare designs', 'the open scene\'s name follows it');
  // Not onto a name that is taken.
  s = save(s, 'Second');
  assert.equal(reduce(s, { type: 'rename-desk', workspaceId: WS, from: 'Second', to: 'Compare designs' }), s);
  assert.equal(reduce(s, { type: 'rename-desk', workspaceId: WS, from: 'Second', to: '   ' }), s);
  // Delete, then restore.
  const kept = s.desks[deskKey(WS, 'Second')];
  let gone = reduce(s, { type: 'delete-desk', workspaceId: WS, name: 'Second' });
  assert.equal(deskKey(WS, 'Second') in gone.desks, false);
  const restored = reduce(gone, { type: 'restore-desk', desk: kept });
  assert.deepEqual(restored.desks[deskKey(WS, 'Second')], kept);
  // A scene saved under that name since is not replaced by the restore.
  gone = save(gone, 'Second');
  assert.equal(reduce(gone, { type: 'restore-desk', desk: { ...kept, cards: [] } }), gone);
});

test('a scene with fields that are not what they should be opens with those fields dropped', () => {
  const junk = { name: 'j', workspaceId: WS, version: 2, cards: [{ noteId: 'A', x: 5, y: 6 }, 'nonsense'], view: 7, query: {}, filters: 'x', collection: { x: 1 }, anchors: { A: { heading: 4, past: 'far', fraction: 9 }, B: {} }, field: { w: -1, h: 'x' }, savedAt: 12 };
  const s = normaliseState({ desks: { [deskKey(WS, 'j')]: junk } });
  assert.deepEqual(s.desks[deskKey(WS, 'j')], { name: 'j', workspaceId: WS, version: 2, cards: [{ noteId: 'A', x: 5, y: 6 }], anchors: { A: { heading: null, past: 0, fraction: 1 } } });
});

test('a reading position is kept by the heading above it, and found again when text is added above', () => {
  const headings = [{ text: 'Goal', top: 40 }, { text: 'Scope', top: 300 }, { text: 'Out of scope', top: 900 }];
  const anchor = readingAnchorAt(headings, 420, 2000);
  assert.deepEqual(anchor, { heading: 'Scope', past: 120, fraction: 0.21 });
  // Three paragraphs were added to Goal: Scope is 260 pixels lower, and so is the reader.
  const grown = [{ text: 'Goal', top: 40 }, { text: 'Scope', top: 560 }, { text: 'Out of scope', top: 1160 }];
  assert.deepEqual(scrollTopForAnchor(anchor, grown, 2260), { top: 680, moved: false });
  // The heading was renamed: the share of the text is used, and it says the passage moved.
  const renamed = [{ text: 'Goal', top: 40 }, { text: 'What is in', top: 300 }];
  assert.deepEqual(scrollTopForAnchor(anchor, renamed, 2000), { top: 420, moved: true });
  // Above the first heading there is no heading to keep: the pixels are kept.
  assert.deepEqual(readingAnchorAt(headings, 10, 2000), { heading: null, past: 10, fraction: 0.005 });
  assert.deepEqual(scrollTopForAnchor({ heading: null, past: 10, fraction: 0.005 }, headings, 2000), { top: 10, moved: false });
  // Never past the end of a text that got shorter.
  assert.deepEqual(scrollTopForAnchor(anchor, headings, 350), { top: 350, moved: false });
  // A document that does not scroll has a fraction of 0, not NaN.
  assert.equal(readingAnchorAt(headings, 0, 0).fraction, 0);
});

test('a reopened scene says what is not as it was saved, and nothing about the count', () => {
  const scene = save(desk()).desks[deskKey(WS, 'Review Glass')];
  assert.deepEqual(sceneReport({ scene, present: new Set(['ISS-0001', 'ISS-0002']), field: { w: 1260, h: 745 }, movedPassages: [] }), []);
  const report = sceneReport({ scene, present: new Set(['ISS-0001']), field: { w: 900, h: 700 }, movedPassages: ['ISS-0001'] });
  assert.equal(report.length, 3);
  assert.match(report[0], /^ISS-0002 is no longer in this workspace\. Its document is kept, labelled, and can be closed\.$/);
  assert.match(report[1], /^This window's field is 900 by 700; the scene was arranged in 1260 by 745\. ISS-0001 and ISS-0002 are drawn inside this field; the saved places are not changed\.$/);
  assert.match(report[2], /^The passage being read in ISS-0001 is not under the heading it was/);
  assert.ok(!report.join(' ').match(/\d+ notes|count|members/), 'the collection\'s membership is live and is never reported as a change');
  // A larger field is not a change worth a sentence.
  assert.deepEqual(sceneReport({ scene, present: new Set(['ISS-0001', 'ISS-0002']), field: { w: 2000, h: 1200 }, movedPassages: [] }), []);
});

test('a saved scene has a name, a field has a size, and the list is one workspace\'s', () => {
  const cards = (v) => (Array.isArray(v) ? v : []);
  const none = () => null;
  // Nothing saved is unnamed. Only the desk kept for "back", which is never saved, may be.
  assert.equal(normaliseScene({ name: '', workspaceId: WS, version: SCENE_VERSION, cards: [] }, cards, none), null);
  assert.equal(normaliseScene({ name: '', workspaceId: WS, cards: [] }, cards, none), null);
  assert.notEqual(normaliseScene({ name: '', workspaceId: WS, version: SCENE_VERSION, cards: [] }, cards, none, true), null);
  assert.equal(normaliseScene({ name: 'x', workspaceId: '', version: SCENE_VERSION, cards: [] }, cards, none), null);
  // A field of no size, or of a size that is not a number, is dropped: the report would otherwise compare a window with nothing.
  for (const field of [{ w: 0, h: 600 }, { w: 800, h: 0 }, { w: -1, h: 600 }, { w: Number.NaN, h: 600 }, { w: '800', h: 600 }, null]) {
    assert.equal(normaliseScene({ name: 'x', workspaceId: WS, version: SCENE_VERSION, cards: [], field }, cards, none).field, undefined, JSON.stringify(field));
  }
  assert.deepEqual(normaliseScene({ name: 'x', workspaceId: WS, version: SCENE_VERSION, cards: [], field: { w: 800.4, h: 600.6 } }, cards, none).field, { w: 800, h: 601 });
  // The list names this workspace's scenes and no other's.
  const desks = {
    a: { name: 'Mine', workspaceId: WS, version: SCENE_VERSION, view: 'issues', cards: [] },
    b: { name: 'Theirs', workspaceId: 'cccc3333dddd4444', version: SCENE_VERSION, view: 'issues', cards: [] },
    c: { name: 'An old desk', workspaceId: WS, cards: [{ noteId: 'ISS-0001', x: 0, y: 0 }] },
  };
  assert.deepEqual(listScenes(desks, WS).map((s) => s.name), ['An old desk', 'Mine']);
  assert.deepEqual(listScenes(desks, 'cccc3333dddd4444').map((s) => s.name), ['Theirs']);
});
