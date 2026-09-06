// TST-0005 — every state round-trips through its address, and a malformed
// address is refused rather than quietly becoming the default view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { formatAddress, parseAddress, tryParseAddress, AddressError } = load('shared/address.js');

const WORKSPACE = '3f2a1b0c9d8e7f60';

const STATES = [
  { workspaceId: WORKSPACE, viewId: 'cards', desk: null, note: null, panel: null },
  { workspaceId: WORKSPACE, viewId: 'cards', desk: 'triage', note: null, panel: null },
  { workspaceId: WORKSPACE, viewId: 'cards', desk: null, note: 'FEAT-0002', panel: null },
  { workspaceId: WORKSPACE, viewId: 'cards', desk: null, note: null, panel: 'status' },
  { workspaceId: WORKSPACE, viewId: 'a-view', desk: 'my desk', note: 'CHG-20260906-A', panel: 'status' },
];

test('format then parse is the identity over every reachable state', () => {
  for (const state of STATES) {
    const address = formatAddress(state);
    assert.deepEqual(parseAddress(address), state, `round trip failed for ${address}`);
  }
});

test('a desk name with a space survives the round trip', () => {
  const address = formatAddress(STATES[4]);
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
