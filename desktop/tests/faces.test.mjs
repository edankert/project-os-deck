// TST-0018 — a card shows what its note is, and an unknown type still draws
// (TASK-0028).
//
// Every card used to show id, title, type and a status stripe, whatever it
// held, which is the cockpit's row with rounded corners. The face is decided
// by a pure function so it can be checked without opening a window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { faceFor, faceText, progressOf, bandFor } = load('shared/faces.js');

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
    ...extra,
  };
}

test('a note that holds work shows how much of it is finished', () => {
  const feature = card({
    noteId: 'FEAT-0085',
    noteType: 'feature',
    children: [
      card({ noteId: 'TASK-1', status: 'done' }),
      card({ noteId: 'TASK-2', status: 'done' }),
      card({ noteId: 'TASK-3', status: 'doing' }),
    ],
  });
  assert.deepEqual(faceFor(feature), { kind: 'progress', done: 2, total: 3, stale: 0 });
  assert.equal(faceText(feature), '2 of 3 done');
});

test("a count the sidecar sent is used rather than counted again", () => {
  // The tests view sends a progress object per surface, and it knows about
  // notes Deck was not sent.
  const surface = card({ noteType: 'surface', progress: { done: 12, total: 73, stale: 3 } });
  assert.deepEqual(faceFor(surface), { kind: 'progress', done: 12, total: 73, stale: 3 });
});

test('an issue shows its severity, which its status does not say', () => {
  const issue = card({ severity: 'critical', status: 'open' });
  assert.deepEqual(faceFor(issue), { kind: 'severity', severity: 'critical' });
  assert.equal(faceText(issue), 'critical · open');
});

test('a test shows when it was last walked, and says so when that is stale', () => {
  const fresh = card({ noteId: 'TST-0008', noteType: 'test', lastVerified: '2026-09-06' });
  assert.deepEqual(faceFor(fresh), { kind: 'verified', lastVerified: '2026-09-06', stale: false });
  assert.equal(faceText(fresh), 'walked 2026-09-06');

  const stale = card({ noteId: 'TST-0009', noteType: 'test', lastVerified: '2026-01-02', stale: true });
  assert.equal(faceText(stale), 'walked 2026-01-02 · stale');

  const never = card({ noteId: 'TST-0010', noteType: 'test', lastVerified: null });
  assert.equal(faceText(never), 'never walked');
});

test('a type Deck has no face for still draws, with what every card has', () => {
  // The Vault phase brings note types nobody here has heard of.
  const unknown = card({ noteId: 'CHARACTER-12', noteType: 'character', status: 'draft' });
  assert.deepEqual(faceFor(unknown), { kind: 'plain' });
  assert.equal(faceText(unknown), 'character · draft');
  const typeless = card({ noteType: '', status: '' });
  assert.equal(faceText(typeless), 'note · no status');
});

test('an issue with no severity falls back rather than drawing an empty band', () => {
  assert.deepEqual(faceFor(card({ severity: null })), { kind: 'plain' });
});

test('progress is counted with the same status vocabulary the bands use', () => {
  const phase = card({
    noteType: 'phase',
    children: [
      card({ status: 'fixed' }),
      card({ status: 'implemented' }),
      card({ status: 'passing' }),
      card({ status: 'backlog' }),
    ],
  });
  assert.deepEqual(progressOf(phase), { done: 3, total: 4, stale: 0 });
  assert.equal(bandFor('fixed'), 'done');
  assert.equal(bandFor('doing'), 'doing');
  assert.equal(bandFor('backlog'), 'owed');
  assert.equal(bandFor(''), 'none');
});

test('a note that holds nothing has no progress to show', () => {
  assert.equal(progressOf(card()), null);
});
