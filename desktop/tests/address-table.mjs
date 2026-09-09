// The address table, in one place, so two suites run the SAME one.
//
// TST-0005 built it: six reachable states that must round-trip, and twelve
// malformed addresses that must be refused. TST-0034 opened the grammar with
// four new keys and has to prove that nothing which parsed before parses
// differently now. Copying the table into the second suite would let the two
// copies drift, and the claim "nothing regressed" would then be about a copy.
import { load } from './helpers.mjs';

const { addressFor } = load('shared/address.js');

export const WORKSPACE = '3f2a1b0c9d8e7f60';

/**
 * The six states TST-0005 named, written with every part present.
 *
 * The states themselves are unchanged by TASK-0052. What changed is that a
 * state now has four more parts — surface, page, flow and step — and all four
 * are absent in every one of these, which is the point.
 */
export const STATES = [
  addressFor(WORKSPACE, 'cards'),
  addressFor(WORKSPACE, 'cards', { desk: 'triage' }),
  addressFor(WORKSPACE, 'cards', { note: 'FEAT-0002' }),
  addressFor(WORKSPACE, 'cards', { panel: 'needs-you' }),
  addressFor(WORKSPACE, 'cards', { note: 'FEAT-0002', panel: 'note' }),
  addressFor(WORKSPACE, 'a-view', { desk: 'my desk', note: 'CHG-20260906-A', panel: 'desk' }),
];

/** The twelve addresses TST-0005 refuses, each with what is wrong with it. */
export const BAD = [
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
