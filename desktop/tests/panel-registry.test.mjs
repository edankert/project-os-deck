// TST-0034 — the grammar carries surface, page, flow and step; every address
// that parsed before still parses to the same state; and the panel kinds come
// from a registry rather than from a literal set (TASK-0052).
//
// The load-bearing pair is refuse-then-register-then-parse. A parser that
// quietly accepts every panel kind passes a refusal test with a typo in it and
// fails this one, because the same address has to be refused before the
// registration and accepted after it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';
import { BAD, STATES, WORKSPACE } from './address-table.mjs';

const { addressFor, formatAddress, parseAddress, tryParseAddress, AddressError } = load('shared/address.js');
const { panelKinds } = load('shared/panels.js');
const { surfaceKinds, pageKinds, flowKinds } = load('shared/vocabularies.js');
const { initialState, normaliseState, reduce } = load('shared/store-state.js');

// ---- nothing that parsed before parses differently now ----

test('the six states TST-0005 named still round-trip, unchanged', () => {
  for (const state of STATES) {
    const address = formatAddress(state);
    assert.deepEqual(parseAddress(address), state, `round trip failed for ${address}`);
  }
});

test('the twelve addresses TST-0005 refuses are still refused', () => {
  for (const [raw, why] of BAD) {
    assert.throws(() => parseAddress(raw), AddressError, `expected a refusal for ${why}`);
  }
});

test('an address with none of the new keys is written exactly as it was', () => {
  // The written form is what a person copies and pastes. Four more keys must
  // not appear in an address whose state does not have them.
  assert.equal(formatAddress(addressFor(WORKSPACE, 'issues')), `deck://${WORKSPACE}/issues`);
  assert.equal(
    formatAddress(addressFor(WORKSPACE, 'issues', { note: 'ISS-0256', panel: 'desk' })),
    `deck://${WORKSPACE}/issues?note=ISS-0256&panel=desk`,
  );
});

// ---- the four new keys ----

test('surface round-trips, and refuses a surface nothing draws', () => {
  assert.deepEqual(surfaceKinds.ids(), ['list', 'spread', 'glass'], 'Glass registered its own surface in PHASE-0002');
  for (const surface of surfaceKinds.ids()) {
    const address = formatAddress(addressFor(WORKSPACE, 'issues', { surface }));
    assert.equal(parseAddress(address).surface, surface);
  }
  const refused = tryParseAddress(`deck://${WORKSPACE}/issues?surface=hologram`);
  assert.equal(refused.ok, false, 'a surface nothing draws was accepted');
  assert.match(refused.reason, /surface/, 'the refusal names the key');
  assert.match(refused.reason, /hologram/, 'and the value it could not read');
});

test('page and flow are empty today, and say so rather than pretending', () => {
  // Deck draws no page and runs no flow. An empty vocabulary is the guarantee
  // working, not a gap: an address cannot name what Deck cannot draw.
  assert.deepEqual(pageKinds.ids(), []);
  assert.deepEqual(flowKinds.ids(), []);
  const page = tryParseAddress(`deck://${WORKSPACE}/issues?page=release`);
  assert.equal(page.ok, false);
  assert.match(page.reason, /no page is registered/);
  const flow = tryParseAddress(`deck://${WORKSPACE}/issues?flow=acceptance`);
  assert.equal(flow.ok, false);
  assert.match(flow.reason, /no flow is registered/);
});

test('a step outside a flow names nothing, and is refused for saying so', () => {
  flowKinds.register({ id: 'acceptance', label: 'The acceptance walk' });
  const orphan = tryParseAddress(`deck://${WORKSPACE}/issues?step=walk-it`);
  assert.equal(orphan.ok, false);
  assert.match(orphan.reason, /step/);
  assert.match(orphan.reason, /flow/, 'the refusal says what a step needs');
  assert.throws(
    () => formatAddress(addressFor(WORKSPACE, 'issues', { step: 'walk-it' })),
    AddressError,
    'formatting wrote a step the parser would refuse',
  );
});

test('a flow and a step round-trip together, once the flow is registered', () => {
  flowKinds.register({ id: 'acceptance', label: 'The acceptance walk' });
  const state = addressFor(WORKSPACE, 'tests', { flow: 'acceptance', step: 'record-the-verdict' });
  const address = formatAddress(state);
  assert.equal(address, `deck://${WORKSPACE}/tests?flow=acceptance&step=record-the-verdict`);
  assert.deepEqual(parseAddress(address), state);
  const shouted = tryParseAddress(`deck://${WORKSPACE}/tests?flow=acceptance&step=Record It`);
  assert.equal(shouted.ok, false, 'a step name that cannot be read in an address was accepted');
});

test('every new key refuses a value it does not know, by name', () => {
  const cases = [
    ['surface', 'orbit'],
    ['page', 'release'],
    ['flow', 'triage-a-day'],
    ['step', 'Step One'],
  ];
  for (const [key, value] of cases) {
    const attempt = tryParseAddress(`deck://${WORKSPACE}/issues?${key}=${encodeURIComponent(value)}`);
    assert.equal(attempt.ok, false, `${key}=${value} was accepted`);
    assert.match(attempt.reason, new RegExp(key), `the refusal for ${key} does not name the key`);
  }
});

test('one key, one value: an address that answers a question twice is refused', () => {
  const twice = tryParseAddress(`deck://${WORKSPACE}/issues?note=FEAT-0002&note=FEAT-0003`);
  assert.equal(twice.ok, false);
  assert.match(twice.reason, /twice/);
});

// ---- the registry is real ----

test('an unregistered panel kind is refused, and registering it makes the SAME address parse', () => {
  const address = `deck://${WORKSPACE}/issues?panel=acceptance-checks`;
  const before = tryParseAddress(address);
  assert.equal(before.ok, false, 'a panel nobody registered was accepted');
  assert.match(before.reason, /panel/);
  assert.match(before.reason, /acceptance-checks/);

  panelKinds.register({ id: 'acceptance-checks', label: 'The acceptance checks' });

  const after = tryParseAddress(address);
  assert.equal(after.ok, true, `the same address is still refused after registering: ${after.reason}`);
  assert.equal(after.address.panel, 'acceptance-checks');
  assert.equal(panelKinds.label('acceptance-checks'), 'The acceptance checks');
});

test('the three panels Deck draws are registered where they are named, not in the parser', () => {
  // First three, in order: the registration above appended a fourth, and the
  // order a person is offered them in is the order they were registered.
  assert.deepEqual(panelKinds.ids().slice(0, 3), ['needs-you', 'note', 'desk']);

  // The parser must not carry the vocabulary. `note` and `desk` are also QUERY
  // KEYS, so their presence proves nothing either way; `needs-you` is a panel
  // kind and nothing else, which makes it the one string worth searching for.
  const parser = fs.readFileSync(path.join(desktopRoot, 'dist', 'shared', 'address.js'), 'utf-8');
  assert.ok(!parser.includes('needs-you'), 'the parser names a panel kind itself');

  // And the module that names them exports no set for the parser to read: the
  // question "is this a panel" is asked of the registry or not at all.
  const panels = load('shared/panels.js');
  for (const name of Object.keys(panels)) {
    assert.ok(
      !Array.isArray(panels[name]),
      `panels.js exports the array ${name}, which is the literal set the registry replaced`,
    );
  }
});

test('a kind whose id cannot be written into an address is refused at registration', () => {
  assert.throws(() => panelKinds.register({ id: 'Needs You', label: 'x' }), /cannot be a panel id/);
  assert.throws(() => panelKinds.register({ id: '', label: 'x' }), /cannot be a panel id/);
});

test('registering one id twice with two labels is refused rather than silently winning', () => {
  assert.throws(
    () => panelKinds.register({ id: 'desk', label: 'Something else' }),
    /already registered/,
    'a second registration quietly replaced the first',
  );
});

// ---- the reserved flow cursor ----

test('the store carries a flow cursor, and nothing writes it', () => {
  const state = initialState();
  assert.equal(state.flowCursor, null);
  assert.ok('flowCursor' in state, 'the slot has to exist to be reserved');

  // Every action a window may dispatch, and the two it may not. None of them
  // touches the cursor: it is reserved for a flow that is not built yet.
  const actions = [
    { type: 'open-workspace', workspaceId: WORKSPACE },
    { type: 'select-view', viewId: 'issues' },
    { type: 'focus-note', noteId: 'ISS-0256' },
    { type: 'save-desk', name: 'triage' },
    { type: 'open-desk', name: 'triage' },
    { type: 'put-on-desk', noteId: 'ISS-0256', x: 1, y: 2 },
    { type: 'move-card', noteId: 'ISS-0256', x: 3, y: 4 },
    { type: 'take-off-desk', noteId: 'ISS-0256' },
    { type: 'clear-desk' },
    { type: 'set-query', text: 'anything' },
    { type: 'set-filters', filters: { statuses: ['open'], types: [] } },
    { type: 'set-fold', key: 'g:main', folded: true },
    { type: 'set-flow-step', flow: 'acceptance', step: 'walk-it' },
  ];
  let current = state;
  for (const action of actions) {
    current = reduce(current, action);
    assert.equal(current.flowCursor, null, `${action.type} wrote the reserved cursor`);
  }
});

test('a cursor found in a state file is not read back, because nothing could have written it', () => {
  const restored = normaliseState({ flowCursor: { flow: 'acceptance', step: 'walk-it' } });
  assert.equal(restored.flowCursor, null);
});
