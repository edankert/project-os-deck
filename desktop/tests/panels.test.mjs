// TST-0020 — a popped-out window carries one named panel, and its address
// says which (TASK-0026).
//
// Pop out used to open the same view again with no navigation, which is why
// this phase's second exit criterion was written down as the duplicate that
// existed rather than the status window that was wanted. A panel is one of
// three things, and an address naming a fourth is refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { PANEL_TYPES, PANEL_LABELS, isPanelType, panelOrNull } = load('shared/panels.js');
const { formatAddress, parseAddress, tryParseAddress, AddressError } = load('shared/address.js');

const WORKSPACE = '3f2a1b0c9d8e7f60';

test('a window carries one of three things, each with a name a person reads', () => {
  assert.deepEqual([...PANEL_TYPES], ['needs-you', 'note', 'desk']);
  for (const type of PANEL_TYPES) {
    assert.equal(typeof PANEL_LABELS[type], 'string');
    assert.ok(PANEL_LABELS[type].length > 0, `${type} has no label to offer`);
  }
});

test('every panel survives being written into an address and read back', () => {
  for (const panel of PANEL_TYPES) {
    const address = formatAddress({
      workspaceId: WORKSPACE,
      viewId: 'issues',
      desk: 'triage',
      note: 'ISS-0256',
      panel,
    });
    const parsed = parseAddress(address);
    assert.equal(parsed.panel, panel, `${address} did not come back carrying ${panel}`);
    assert.equal(parsed.desk, 'triage');
    assert.equal(parsed.note, 'ISS-0256');
  }
});

test('a panel Deck cannot draw is refused rather than opened as something else', () => {
  for (const unknown of ['status', 'terminal', 'orbit', 'Desk', 'needs you', '']) {
    const parsed = tryParseAddress(`deck://${WORKSPACE}/issues?panel=${encodeURIComponent(unknown)}`);
    assert.equal(parsed.ok, false, `an address naming the panel "${unknown}" was accepted`);
  }
});

test('the two ends agree: what formatting refuses, parsing refuses too', () => {
  assert.throws(
    () => formatAddress({ workspaceId: WORKSPACE, viewId: 'issues', desk: null, note: null, panel: 'status' }),
    AddressError,
    'formatting wrote a panel that parsing would refuse',
  );
});

test('a panel read from somewhere untrusted is a panel or nothing', () => {
  assert.equal(panelOrNull('desk'), 'desk');
  assert.equal(panelOrNull('status'), null);
  assert.equal(panelOrNull(null), null);
  assert.equal(panelOrNull(42), null);
  assert.equal(isPanelType('needs-you'), true);
  assert.equal(isPanelType('needsyou'), false);
});

test('a window with no panel is the whole application, which is still addressable', () => {
  const address = formatAddress({ workspaceId: WORKSPACE, viewId: 'issues', desk: null, note: null, panel: null });
  assert.equal(address, `deck://${WORKSPACE}/issues`);
  assert.equal(parseAddress(address).panel, null);
});
