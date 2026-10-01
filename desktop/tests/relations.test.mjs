// TST-0066 — a relationship is labelled with the source's own word, or not at
// all (FEAT-0020, TASK-0098).
//
// DES-0003: "A link can say parent, implements or verified by only when the
// current source reports that relationship. Otherwise show a generic incoming
// or outgoing link." The source reports one in exactly one place, the
// frontmatter key a link was written under, so that is all a label may use.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { relationsBetween, relationLabel, relationSentence, relationsSentence, relationKinds } = load('shared/relations.js');

const edge = (source, target, field = null) => ({ source, target, wrote: target, offset: 0, resolved: true, crossRepo: false, field });
const EDGES = [
  edge('TASK-0095', 'FEAT-0020', 'parent'),
  edge('TASK-0095', 'FEAT-0020'),
  edge('FEAT-0020', 'TASK-0095', 'tasks'),
  edge('FEAT-0020', 'REQ-0001', 'requirements'),
  edge('REQ-0001', 'FEAT-0020', 'implements'),
  edge('TST-0063', 'FEAT-0020', 'covers'),
  edge('ISS-0070', 'FEAT-0020'),
  edge('FEAT-0020', 'DES-0003'),
  edge('FEAT-0020', 'DES-0003', 'design'),
  edge('FEAT-0020', 'DES-0003', 'design'),
  edge('FEAT-0001', 'FEAT-0002', 'related'),
  edge('FEAT-0020', null, 'related'),
];

test('each distinct way two notes are joined is listed once, the document\'s own links first', () => {
  assert.deepEqual(relationsBetween(EDGES, 'FEAT-0020', 'TASK-0095'), [
    { field: 'tasks', direction: 'out' },
    { field: 'parent', direction: 'in' },
    { field: null, direction: 'in' },
  ]);
  // The same key written twice is one relation.
  assert.deepEqual(relationsBetween(EDGES, 'FEAT-0020', 'DES-0003'), [
    { field: 'design', direction: 'out' },
    { field: null, direction: 'out' },
  ]);
  // Seen from the other end, the directions swap and the words do not.
  assert.deepEqual(relationsBetween(EDGES, 'TASK-0095', 'FEAT-0020'), [
    { field: 'parent', direction: 'out' },
    { field: null, direction: 'out' },
    { field: 'tasks', direction: 'in' },
  ]);
  assert.deepEqual(relationsBetween(EDGES, 'FEAT-0020', 'FEAT-0099'), []);
});

test('the label is the keys the source wrote, and "link" when it wrote none', () => {
  assert.equal(relationLabel(relationsBetween(EDGES, 'FEAT-0020', 'TASK-0095')), 'tasks · parent');
  assert.equal(relationLabel(relationsBetween(EDGES, 'FEAT-0020', 'REQ-0001')), 'requirements · implements');
  assert.equal(relationLabel(relationsBetween(EDGES, 'FEAT-0020', 'TST-0063')), 'covers');
  // A link in a sentence has no stated meaning, so it is given none.
  assert.equal(relationLabel(relationsBetween(EDGES, 'FEAT-0020', 'ISS-0070')), 'link');
  assert.equal(relationLabel([]), 'link');
});

test('no label is ever a word the source did not write', () => {
  const written = new Set(EDGES.map((e) => e.field).filter((f) => f !== null));
  const ids = [...new Set(EDGES.flatMap((e) => [e.source, e.target]).filter((x) => x !== null))];
  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      for (const part of relationLabel(relationsBetween(EDGES, a, b)).split(' · ')) {
        assert.ok(part === 'link' || written.has(part), `${a} to ${b} is labelled "${part}", which no note wrote`);
      }
    }
  }
});

test('a relation is said as who wrote what about whom, never inverted into another word', () => {
  assert.equal(relationSentence('FEAT-0020', 'TASK-0095', { field: 'tasks', direction: 'out' }), 'FEAT-0020 names TASK-0095 in its tasks field');
  // On the feature, the task's `parent:` is not called "child".
  assert.equal(relationSentence('FEAT-0020', 'TASK-0095', { field: 'parent', direction: 'in' }), 'TASK-0095 names FEAT-0020 in its parent field');
  assert.equal(relationSentence('FEAT-0020', 'ISS-0070', { field: null, direction: 'in' }), 'ISS-0070 links to FEAT-0020 in its text');
  assert.equal(
    relationsSentence('FEAT-0020', 'TASK-0095', relationsBetween(EDGES, 'FEAT-0020', 'TASK-0095'), 'both'),
    'FEAT-0020 names TASK-0095 in its tasks field; TASK-0095 names FEAT-0020 in its parent field; TASK-0095 links to FEAT-0020 in its text',
  );
});

test('with no edge known the sentence says only which way the link runs', () => {
  assert.equal(relationsSentence('A', 'B', [], 'out'), 'A links to B');
  assert.equal(relationsSentence('A', 'B', [], 'in'), 'B links to A');
  assert.equal(relationsSentence('A', 'B', [], 'both'), 'A and B link to each other');
});

test('the kinds a document can be emphasised by are the keys that join it to a neighbour, each with its neighbours', () => {
  const kinds = relationKinds(EDGES, 'FEAT-0020', ['TASK-0095', 'REQ-0001', 'TST-0063', 'ISS-0070', 'DES-0003']);
  assert.deepEqual([...kinds.keys()], ['covers', 'design', 'implements', 'parent', 'requirements', 'tasks']);
  assert.deepEqual([...kinds.get('parent')], ['TASK-0095']);
  assert.deepEqual([...kinds.get('covers')], ['TST-0063']);
  // A neighbour joined only by a link in the text is in no kind.
  assert.ok([...kinds.values()].every((set) => !set.has('ISS-0070')));
  // A note that is not a neighbour is left out even when an edge names it.
  assert.deepEqual([...relationKinds(EDGES, 'FEAT-0020', ['REQ-0001']).keys()], ['implements', 'requirements']);
  // A dangling link joins nothing.
  assert.equal(relationKinds(EDGES, 'FEAT-0020', []).size, 0);
});
