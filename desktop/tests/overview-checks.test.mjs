// TST-0083: a scene must pass all four checks independently.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';
const { checkScene } = load('shared/overview-checks.js');
const { addressFor, formatAddress, parseAddress } = load('shared/address.js');

const text = (value, parts = {}) => ({ kind: 'text', text: value, x: 0, y: 0, rest: true, role: 'label', ...parts });
function good() {
  return { screen: 'wheel', address: 'deck://aaaa1111/features?page=wheel', width: 900, height: 600, title: 'Example',
    nodes: [{ kind: 'group', children: [
      { kind: 'mark', tag: 'circle', attrs: { r: 4 }, ticket: 'FEAT-0001', markId: 'features', count: 1, action: 'open' },
      text('1 feature', { role: 'number', markRef: 'features' }), text('FEAT-0001', { role: 'id' }),
      text('Phase 2'), text('003 Vault'), text('Title appears on focus '.repeat(100), { rest: false }),
    ] }], list: [{ id: 'FEAT-0001', label: 'First feature', group: 'Features', action: 'open' }] };
}
const verdict = (scene, rule, options) => checkScene(scene, options).find((r) => r.rule === rule);

test('a good nested scene passes every rule and reports exactly one result per rule', () => {
  const results = checkScene(good());
  assert.deepEqual(results.map((r) => r.rule), ['words', 'numbers', 'address', 'twin']);
  assert.ok(results.every((r) => r.ok), JSON.stringify(results));
});

test('a text-heavy scene fails, while 60 words and id text do not exceed the budget', () => {
  const scene = good();
  scene.nodes = [text('word '.repeat(61))]; scene.list = [];
  assert.equal(verdict(scene, 'words').ok, false);
  assert.match(verdict(scene, 'words').detail, /61 words/);
  scene.nodes = [text('word '.repeat(60)), text('FEAT-0001 TASK-0002 (TST-0003)')];
  assert.equal(verdict(scene, 'words').ok, true);
  scene.nodes.push(text('word '.repeat(100), { role: 'id' }));
  assert.equal(verdict(scene, 'words').ok, true);
  assert.equal(verdict(scene, 'words', { maxWords: 59 }).ok, false);
});

test('counts hidden in labels need a unique matching mark, including counts on controls', () => {
  for (const label of ['12 tickets', '12', 'Accept 12', '1,200 tickets', '50%', '12/20']) {
    const scene = good(); scene.nodes.push(text(label));
    assert.equal(verdict(scene, 'numbers').ok, false, label);
  }
  const scene = good();
  scene.nodes.push({ kind: 'mark', tag: 'circle', attrs: {}, markId: 'count', count: 1200 });
  scene.nodes.push(text('1,200 tickets', { markRef: 'count' }));
  assert.equal(verdict(scene, 'numbers').ok, true);
  scene.nodes.at(-2).count = 1199;
  assert.equal(verdict(scene, 'numbers').ok, false, 'a mark for another count is not evidence');
  scene.nodes.at(-2).count = 1200;
  scene.nodes.push({ kind: 'mark', tag: 'circle', attrs: {}, markId: 'count', count: 1200 });
  assert.equal(verdict(scene, 'numbers').ok, false, 'an ambiguous markRef fails');
});

test('number roles require marks even off rest; missing and invalid count values fail', () => {
  const scene = good();
  scene.nodes.push(text('3', { role: 'number', rest: false, markRef: 'missing' }));
  assert.equal(verdict(scene, 'numbers').ok, false);
  const mark = { kind: 'mark', tag: 'rect', attrs: {}, markId: 'missing' };
  scene.nodes.push(mark);
  for (const count of [undefined, NaN, Infinity, -3, 3.5]) {
    mark.count = count;
    assert.equal(verdict(scene, 'numbers').ok, false, String(count));
  }
  mark.count = 3;
  assert.equal(verdict(scene, 'numbers').ok, true);
});

test('ticket ids, phase numbers, dates and versions are not counts, and hover prose is ignored', () => {
  const scene = good();
  for (const label of ['TASK-0115', 'PHASE-0002', 'Phase 21', '002 Glass', '2026-10-14', '12:30', 'v2.3.0']) scene.nodes.push(text(label));
  scene.nodes.push(text('21', { role: 'id' }), text('500 tickets in a callout', { rest: false }));
  assert.equal(verdict(scene, 'numbers').ok, true);
  scene.nodes.push(text('Phase 2 has 12 tickets'));
  assert.equal(verdict(scene, 'numbers').ok, false, 'a phase label does not exempt its count');
});

test('addresses cover all seven screens and dotted test steps, and must round-trip exactly', () => {
  const scene = good();
  for (const parts of [
    { page: 'wheel' }, { page: 'phase', note: 'PHASE-0002' }, { page: 'ticket', note: 'FEAT-0024' }, { page: 'rephase' },
    { flow: 'design', note: 'DES-0005' }, { flow: 'test-run', step: 'android' }, { flow: 'test-run', step: 'android.3' },
    { flow: 'accept', note: 'FEAT-0024' },
  ]) {
    scene.address = formatAddress(addressFor('aaaa1111', 'features', parts));
    assert.equal(verdict(scene, 'address').ok, true, scene.address);
  }
  for (const address of ['deck://aaaa1111/features?page=unknown', 'deck://aaaa1111/features?page=phase&note=PHASE-0002', ' deck://aaaa1111/features?page=wheel', 'deck://aaaa1111/features?note=%46EAT-0024&page=ticket']) {
    scene.address = address; assert.equal(verdict(scene, 'address').ok, false, address);
  }
  for (const step of ['.android', 'android.', 'android..3', '../etc', 'Android.3', 'a'.repeat(65)]) {
    assert.throws(() => formatAddress(addressFor('aaaa1111', 'tests', { flow: 'test-run', step })), /step/);
  }
  assert.throws(() => parseAddress('deck://aaaa1111/tests?step=android.3'), /flow/);
});

test('the list twin must hold exactly the marked ticket ids and every action', () => {
  const scene = good();
  scene.list.push({ id: 'PHASE-0001', label: 'One', group: 'Phases' }, { id: 'aggregate', label: 'Total', group: 'Counts' });
  assert.equal(verdict(scene, 'twin').ok, true);
  scene.list.push({ id: 'TASK-0001', label: 'No mark', group: 'Tasks' });
  assert.equal(verdict(scene, 'twin').ok, false);
  scene.list.pop(); scene.list.shift();
  assert.match(verdict(scene, 'twin').detail, /Missing rows: FEAT-0001/);
  scene.list.unshift({ id: 'FEAT-0001', label: 'First', group: 'Features' });
  assert.match(verdict(scene, 'twin').detail, /Missing actions: open/);
  scene.list.push({ id: 'open-control', label: 'Open', group: 'Actions', action: 'open' });
  assert.equal(verdict(scene, 'twin').ok, true);
});

test('retired acceptance documents from the real corpus also need list twins', () => {
  const scene = good();
  scene.nodes.push({ kind: 'mark', tag: 'circle', attrs: {}, ticket: 'ACCEPTANCE-RUN-2.2.0' });
  assert.equal(verdict(scene, 'twin').ok, false);
  scene.list.push({ id: 'ACCEPTANCE-RUN-2.2.0', label: 'Old acceptance run', group: 'Tests' });
  assert.equal(verdict(scene, 'twin').ok, true);
  scene.nodes.pop();
  assert.equal(verdict(scene, 'twin').ok, false, 'a legacy row without a mark also fails');
});
