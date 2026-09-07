// TST-0005 — every state round-trips through its address, and a malformed
// address is refused rather than quietly becoming the default view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { formatAddress, parseAddress, tryParseAddress, AddressError, isDeskName } = load('shared/address.js');

const WORKSPACE = '3f2a1b0c9d8e7f60';

const STATES = [
  { workspaceId: WORKSPACE, viewId: 'cards', desk: null, note: null, panel: null },
  { workspaceId: WORKSPACE, viewId: 'cards', desk: 'triage', note: null, panel: null },
  { workspaceId: WORKSPACE, viewId: 'cards', desk: null, note: 'FEAT-0002', panel: null },
  { workspaceId: WORKSPACE, viewId: 'cards', desk: null, note: null, panel: 'needs-you' },
  { workspaceId: WORKSPACE, viewId: 'cards', desk: null, note: 'FEAT-0002', panel: 'note' },
  { workspaceId: WORKSPACE, viewId: 'a-view', desk: 'my desk', note: 'CHG-20260906-A', panel: 'desk' },
];

test('format then parse is the identity over every reachable state', () => {
  for (const state of STATES) {
    const address = formatAddress(state);
    assert.deepEqual(parseAddress(address), state, `round trip failed for ${address}`);
  }
});

test('a desk name with a space survives the round trip', () => {
  // Found by what it is rather than by where it sits in the table: a state
  // added to the table above should not move this check onto another one.
  const address = formatAddress(STATES.find((state) => state.desk === 'my desk'));
  assert.ok(address.includes('desk=my%20desk'), `expected the space to be encoded, got ${address}`);
  assert.equal(parseAddress(address).desk, 'my desk');
});

const BAD = [
  ['', 'empty'],
  ['   ', 'blank'],
  ['https://example.com/x', 'another scheme'],
  ['deck://', 'no workspace'],
  ['deck://only-one-segment', 'no view'],
  ['deck://ws/view/extra', 'too many segments'],
  ['deck://WS!/view', 'a workspace id that is not one'],
  ['deck://3f2a1b0c9d8e7f60/Not A View', 'a view id that is not one'],
  ['deck://3f2a1b0c9d8e7f60/view?mode=features', 'a key that is not part of an address'],
  ['deck://3f2a1b0c9d8e7f60/view?note=', 'a key with no value'],
  ['deck://3f2a1b0c9d8e7f60/view?note', 'a key with no value at all'],
  ['deck://3f2a1b0c9d8e7f60/view?note=%E0%A4%A', 'text that will not decode'],
];

test('every malformed address is refused, and says why', () => {
  for (const [raw, why] of BAD) {
    assert.throws(() => parseAddress(raw), AddressError, `expected a refusal for ${why}: ${JSON.stringify(raw)}`);
    const attempt = tryParseAddress(raw);
    assert.equal(attempt.ok, false);
    assert.ok(attempt.reason.length > 0, 'a refusal has to say what it could not read');
  }
});

test('nothing malformed ever resolves to a view', () => {
  // The failure this test exists for: the cockpit's navigator silently turns an
  // unknown mode into `features`, which made the Tests view look broken for
  // thirty-three hours. An address that cannot be read must produce nothing.
  for (const [raw] of BAD) {
    const attempt = tryParseAddress(raw);
    assert.equal(attempt.ok, false);
    assert.equal(attempt.address, undefined);
  }
});

test('formatting refuses a state it could not parse back', () => {
  assert.throws(
    () => formatAddress({ workspaceId: 'not a workspace', viewId: 'x', desk: null, note: null, panel: null }),
    AddressError,
  );
  assert.throws(
    () => formatAddress({ workspaceId: WORKSPACE, viewId: 'Not A View', desk: null, note: null, panel: null }),
    AddressError,
  );
});


test('a desk name a person can actually type survives the round trip', () => {
  // These are names the desk prompt accepts, so the grammar has to accept them
  // too: an address the interface can produce and the parser refuses is worse
  // than no address at all.
  for (const desk of ["Edwin's desk", 'sprint #3', 'Q4 (draft)', 'deja vu', 'a=b&c=d', '100%', 'a/b', 'ends with space ']) {
    const address = formatAddress({ workspaceId: WORKSPACE, viewId: 'cards', desk, note: null, panel: null });
    assert.equal(parseAddress(address).desk, desk, 'round trip failed for ' + JSON.stringify(desk));
  }
});

test('a note id the sidecar can produce survives the round trip', () => {
  for (const note of ['FEAT-0002', 'notes/total', 'owed items', 'CHG-20260906-Deck-Runs', 'a note with (brackets)']) {
    const address = formatAddress({ workspaceId: WORKSPACE, viewId: 'cards', desk: null, note, panel: null });
    assert.equal(parseAddress(address).note, note, 'round trip failed for ' + JSON.stringify(note));
  }
});

test('formatting refuses every field parsing would refuse, not just the two in the path', () => {
  const base = { workspaceId: WORKSPACE, viewId: 'cards', desk: null, note: null, panel: null };
  const cases = [
    ['desk', ''],
    ['desk', 'a' + String.fromCharCode(10) + 'b'],
    ['desk', 'x'.repeat(65)],
    ['note', ''],
    ['note', 'x'.repeat(201)],
    ['panel', 'Not A Panel'],
    ['panel', ''],
    // A panel Deck cannot draw is refused rather than opened as something
    // else: a window carrying a surprise is the silent fallback this grammar
    // exists to prevent (TASK-0026).
    ['panel', 'status'],
    ['panel', 'terminal'],
  ];
  for (const [field, value] of cases) {
    assert.throws(
      () => formatAddress({ ...base, [field]: value }),
      AddressError,
      'formatting accepted a ' + field + ' of ' + JSON.stringify(value) + ' that parsing would refuse',
    );
  }
});

test('anything format produces, parse accepts', () => {
  // The invariant the two functions exist to keep, asserted over the awkward
  // cases rather than only the tidy ones.
  const values = ["Edwin's desk", 'deja vu', 'a=b&c', '100%', 'a/b', 'FEAT-0002', 'x'.repeat(64)];
  for (const desk of values) {
    for (const note of values) {
      const address = formatAddress({ workspaceId: WORKSPACE, viewId: 'cards', desk, note, panel: 'desk' });
      const parsed = parseAddress(address);
      assert.equal(parsed.desk, desk);
      assert.equal(parsed.note, note);
    }
  }
});


test('a desk name is judged by the same rule that writes it into an address', () => {
  // The interface asks this before saving, so the two ends cannot disagree.
  for (const good of ["Edwin's desk", 'sprint #3', 'a/b', 'x'.repeat(64)]) {
    assert.equal(isDeskName(good), true, JSON.stringify(good) + ' should be a desk name');
    assert.doesNotThrow(() =>
      formatAddress({ workspaceId: WORKSPACE, viewId: 'cards', desk: good, note: null, panel: null }),
    );
  }
  for (const bad of ['', 'x'.repeat(65), 'a' + String.fromCharCode(9) + 'b']) {
    assert.equal(isDeskName(bad), false, JSON.stringify(bad) + ' should not be a desk name');
  }
});
