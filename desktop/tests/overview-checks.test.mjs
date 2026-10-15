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
      text('Phase 2'), text('003', { role: 'id' }), text('Vault', { role: 'name' }), text('Title appears on focus '.repeat(100), { rest: false }),
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
  scene.nodes.push(text('PHASE-0002 002', { role: 'id' }));
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
  for (const label of ['TASK-0115', 'PHASE-0002', 'Phase 21', '2026-10-14', '12:30', 'v2.3.0']) scene.nodes.push(text(label));
  scene.nodes.push(text('021', { role: 'id' }), text('500 tickets in a callout', { rest: false }));
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
    scene.screen = parts.flow ?? parts.page;
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

test('a name counts as words, and its digits are never read as a count', () => {
  const { checkScene: check } = load('shared/overview-checks.js');
  const scene = {
    screen: 'ticket', address: 'deck://abcd1234/features?page=wheel', width: 10, height: 10, title: 't', list: [],
    nodes: [{ kind: 'text', x: 0, y: 0, text: 'Schwinn 800IC trainers', rest: true, role: 'name' }],
  };
  const results = Object.fromEntries(check(scene).map((r) => [r.rule, r]));
  assert.equal(results.numbers.ok, true, results.numbers.detail);
  assert.match(results.words.detail, /^3 words/);
  scene.nodes[0].role = 'label';
  assert.equal(Object.fromEntries(check(scene).map((r) => [r.rule, r])).numbers.ok, false, 'the same digits in a label are a count');
});


test('each count needs its own text and mark, even equal counts and ratios', () => {
  for (const value of ['1 closed, 2 open', '1 closed, 1 open', '1/2', '1/1']) {
    const scene = good();
    scene.nodes.push(text(value, { markRef: 'features' }));
    assert.equal(verdict(scene, 'numbers').ok, false, value);
  }
  const scene = good();
  scene.nodes.push(text('1 closed', { markRef: 'features' }),
    { kind: 'mark', tag: 'circle', attrs: {}, markId: 'open', count: 2 },
    text('2 open', { markRef: 'open' }));
  assert.equal(verdict(scene, 'numbers').ok, true);
});

test('name roles cannot hide bare counts, ratios, percentages or numeric tokens', () => {
  for (const value of ['12', '012', '1,200', '50%', '3/3', '3 / 3', '3 of 3', '-12', '12.5', '1k', '1 k', '1.2 M', '1e3', '0x10', '0xFF', '0o10', '0b10']) {
    for (const rest of [true, false]) {
      for (const markRef of [undefined, 'features']) {
        const scene = good();
        scene.nodes.push(text(value, { role: 'name', rest, markRef }));
        assert.equal(verdict(scene, 'numbers').ok, false, `${value}, rest=${rest}, markRef=${markRef}`);
      }
    }
  }
  const scene = good();
  scene.nodes.push(text('1', { role: 'name', markRef: 'features' }));
  assert.equal(verdict(scene, 'numbers').ok, false, 'even a marked bare count must use a count role');
  scene.nodes.pop();
  for (const value of ['Schwinn 800IC', 'Model 3', 'R2-D2', 'Étape 2']) scene.nodes.push(text(value, { role: 'name' }));
  assert.equal(verdict(scene, 'numbers').ok, true, 'digits remain valid inside real names');
});

test('a zero-padded count is still a count in a label', () => {
  const scene = good(); scene.nodes.push(text('012 open'));
  assert.equal(verdict(scene, 'numbers').ok, false);
});

test('an address must name the screen, not only round-trip', () => {
  const screens = ['wheel', 'phase', 'ticket', 'rephase', 'design', 'test-run', 'accept'];
  for (const screen of screens) {
    const scene = good(); scene.screen = screen;
    for (const destination of screens) {
      const parts = ['design', 'test-run', 'accept'].includes(destination) ? { flow: destination } : { page: destination };
      scene.address = formatAddress(addressFor('aaaa1111', 'features', parts));
      assert.equal(verdict(scene, 'address').ok, screen === destination, `${screen} / ${destination}`);
    }
    scene.address = 'deck://aaaa1111/features';
    assert.equal(verdict(scene, 'address').ok, false, screen);
  }
  const scene = good();
  scene.address = 'deck://aaaa1111/features?page=wheel&flow=design';
  assert.equal(verdict(scene, 'address').ok, false, 'an overlaid flow is not the wheel');
});

test('id text may contain only identifiers or bare padded phase numbers', () => {
  for (const value of ['12 tickets', '012 open', 'FEAT-0001 prose', 'word '.repeat(100), 'ABC-123']) {
    const scene = good(); scene.nodes.push(text(value, { role: 'id' }));
    assert.equal(verdict(scene, 'numbers').ok, false, value);
  }
  const scene = good(); scene.nodes.push(text('word '.repeat(61), { role: 'id' }));
  assert.equal(verdict(scene, 'words').ok, false, 'mislabelled prose cannot evade the word budget');
  scene.nodes = [text('FEAT-0001 PHASE-0002 002 999 ACCEPTANCE-RUN-2.2.0', { role: 'id' })];
  assert.equal(verdict(scene, 'numbers').ok, true);
});

test('word count excludes only complete ticket or phase id tokens', () => {
  const scene = good();
  scene.nodes = [text('REQ-1 FEAT-2 TASK-3 TST-4 ISS-5 ADR-6 DES-7 RISK-8 PHASE-9 CHG-10 REL-11 (TST-12),')];
  assert.match(verdict(scene, 'words').detail, /^0 words/);
  scene.nodes.push(text('COVID-19 ABC-123 FEAT-1st PHASE-2-more CHG-20261014-Title'));
  assert.match(verdict(scene, 'words').detail, /^5 words/);
});

test('panel row and note text is exempt, while prose outside a panel still counts', () => {
  for (const body of [
    { kind: 'rows', sections: [{ key: 'tickets', title: 'Many words '.repeat(80), rows: [{ id: 'FEAT-0001', title: 'Long title '.repeat(80), status: 'done', type: 'feature', fill: 'delivered', needsYou: false }] }] },
    { kind: 'note', id: 'FEAT-0001', title: 'Long title '.repeat(80), text: 'Full note '.repeat(1000) },
  ]) {
    const scene = good();
    scene.nodes = [{ kind: 'group', children: [{ kind: 'panel', key: 'detail', x: 0, y: 0, w: 800, h: 400, label: 'Details', body }] }, text('word '.repeat(60))];
    assert.match(verdict(scene, 'words').detail, /^60 words/);
    assert.equal(verdict(scene, 'words').ok, true);
    scene.nodes.push(text('one'));
    assert.equal(verdict(scene, 'words').ok, false, 'the exemption cannot hide outside prose');
  }
});

test('every panel row, including folded and nonstandard ids, requires a list twin', () => {
  const scene = good();
  const rows = ['TASK-0001', 'custom-ticket'].map((id) => ({ id, title: id, type: 'task', fill: 'open', needsYou: false, status: 'backlog' }));
  scene.nodes.push({ kind: 'group', children: [{ kind: 'panel', key: 'rows', x: 0, y: 0, w: 800, h: 400, label: 'Rows', body: { kind: 'rows', sections: [{ key: 'folded', title: 'Closed', folded: true, rows }] } }] });
  assert.match(verdict(scene, 'twin').detail, /Missing rows: TASK-0001, custom-ticket/);
  scene.list.push(...rows.map((row) => ({ id: row.id, label: row.title, group: 'Rows' })));
  assert.equal(verdict(scene, 'twin').ok, true, 'panel rows are drawn tickets, not extra list entries');
});
