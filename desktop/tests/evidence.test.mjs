// Evidence beside the claim (FEAT-0024, ADR-0008). The rule without a window:
// which tests name a note, what is recorded for each kind of test and where
// it comes from, when a manual verification is stale, and the words for what
// is not there. Nothing is inferred: every case below is something a source
// says, or the plain statement that no source says it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, desktopRoot } from './helpers.mjs';

const E = load('shared/evidence.js');
const { testFacts, testsVerifying, keyPhrase, platformsFrom, platformLedger, recordedFor, recordedSentence, historyLine, runnerText, controlText, testsNamedOnLine, daysBetween } = E;

const record = (id, frontmatter = {}, types = ['test']) => ({ id, title: `${id} title`, relPath: `tests/${id}.md`, types, status: frontmatter.status ?? null, frontmatter });
const edge = (source, target, field) => ({ source, target, wrote: target, offset: 0, resolved: true, crossRepo: false, field });
const facts = (id, frontmatter) => testFacts(record(id, frontmatter));

/** A payload in the sidecar's shape, with the rows and history given. */
const payload = (rows, history = {}, extra = {}) => ({ schema_version: 4, ledger_platforms: ['app'], view: { tiers: [{ areas: [{ items: rows }] }], history }, ...extra });
const ledgers = (rows, history, platform = 'app') => ({ ledgers: [platformLedger(payload(rows, history), platform)] });
const TODAY = '2026-10-02';

test('the module asks for nothing and reaches no window', () => {
  const source = fs.readFileSync(path.join(desktopRoot, 'src', 'shared', 'evidence.ts'), 'utf8');
  const imports = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
  assert.deepEqual(imports, ['./graph.js'], 'it imports a type from the graph and nothing else');
  assert.match(source, /^import type /m, 'and that import is a type');
  for (const word of ['fetch(', 'document.', 'window.', 'ipcRenderer', 'XMLHttpRequest']) assert.equal(source.includes(word), false, `it uses ${word}`);
});

test('a test\'s facts are six things from its own frontmatter, and a note that is not a test has none', () => {
  assert.deepEqual(facts('TST-0001', { level: 'acceptance', status: 'active', artifacts: ['desktop/demos/a.cjs', 'desktop/tests/a.test.mjs'], review_verdict: 'adequate', covers: ['[[FEAT-0001-x]]'], owner: 'edwin' }), {
    id: 'TST-0001',
    title: 'TST-0001 title',
    rel: 'tests/TST-0001.md',
    status: 'active',
    level: 'acceptance',
    command: '',
    lastVerified: '',
    artifacts: ['desktop/demos/a.cjs', 'desktop/tests/a.test.mjs'],
    reviewVerdict: 'adequate',
  });
  // A YAML date comes through as a Date, and is read as the day it names.
  assert.equal(facts('TST-0002', { level: 'integration', status: 'passing', last_verified: new Date('2026-10-01T00:00:00Z') }).lastVerified, '2026-10-01');
  assert.equal(testFacts(record('FEAT-0001', { status: 'done' }, ['feature'])), null);
});

test('the tests that name a note are found under four keys and no other', () => {
  const records = [record('TST-0001'), record('TST-0002'), record('TST-0003'), record('TST-0004'), record('TST-0005'), record('ISS-0001', {}, ['issue'])];
  const edges = [
    edge('TST-0001', 'FEAT-0020', 'covers'),
    edge('TST-0002', 'FEAT-0020', 'covers'),
    edge('TST-0002', 'FEAT-0020', 'tasks'),
    edge('FEAT-0020', 'TST-0003', 'tests'),
    edge('FEAT-0020', 'TST-0005', 'verifies'),
    edge('FEAT-0020', 'TST-0004', null), // a mention in the note's text
    edge('TST-0004', 'FEAT-0020', 'related'),
    edge('TST-0004', 'FEAT-0020', 'source'),
    edge('TST-0004', 'FEAT-0020', 'parent'),
    edge('TST-0004', 'FEAT-0020', 'phase'),
    edge('TST-0004', 'FEAT-0020', 'issues'),
    edge('ISS-0001', 'FEAT-0020', 'covers'), // not a test
    edge('FEAT-0020', 'ISS-0001', 'tests'), // the target is not a test
    edge('TST-0001', 'FEAT-0009', 'covers'), // another note
    edge('TST-0003', null, 'covers'), // a dangling link
  ];
  assert.deepEqual(testsVerifying('FEAT-0020', edges, records), [
    { testId: 'TST-0001', keys: ['covers'] },
    { testId: 'TST-0002', keys: ['covers', 'tasks'] },
    { testId: 'TST-0003', keys: ['tests'] },
    { testId: 'TST-0005', keys: ['verifies'] },
  ]);
  assert.deepEqual(testsVerifying('FEAT-0099', edges, records), []);
  // The key is said as written, and whose frontmatter it is in.
  assert.equal(keyPhrase('covers'), 'its covers: names this note');
  assert.equal(keyPhrase('tasks'), 'its tasks: names this note');
  assert.equal(keyPhrase('tests'), "named in this note's tests:");
  assert.equal(keyPhrase('verifies'), "named in this note's verifies:");
});

test('a bare id under a key counts the same as a wikilink, and a test found both ways is returned once', () => {
  const records = [
    record('TST-0001', { covers: ['FEAT-0020'] }), // bare: makes no edge
    record('TST-0002', { covers: '[[FEAT-0020-Collections-And-Full-Notes|the desktop]]', tasks: ['TASK-0095', '[[features/x/TASK-0096-Draw]]'] }),
    record('TST-0003', { covers: ['[[FEAT-0020-Collections]]'] }), // also an edge
    record('TST-0004', { covers: ['FEAT-00200'], related: ['FEAT-0020'] }), // another note's id, and a key that does not count
    record('TASK-0095', { tests: ['TST-0004'] }, ['task']),
  ];
  const edges = [edge('TST-0003', 'FEAT-0020', 'covers')];
  assert.deepEqual(testsVerifying('FEAT-0020', edges, records), [
    { testId: 'TST-0001', keys: ['covers'] },
    { testId: 'TST-0002', keys: ['covers'] },
    { testId: 'TST-0003', keys: ['covers'] },
  ]);
  assert.deepEqual(testsVerifying('TASK-0096', [], records), [{ testId: 'TST-0002', keys: ['tasks'] }]);
  // On the note's side, when its own record is among those handed in.
  assert.deepEqual(testsVerifying('TASK-0095', [], records), [
    { testId: 'TST-0002', keys: ['tasks'] },
    { testId: 'TST-0004', keys: ['tests'] },
  ]);
});

test('the acceptance payload is read into a ledger: the standing verdict, the invalidation, and the history newest first', () => {
  const read = platformLedger(
    payload(
      [
        { id: 'TST-0001', rel: 'tests/TST-0001.md', mark: 'pass', verdict_date: '2026-09-20', verdict_reason: 'walked on the Mac', verdict_method: 'manual', invalidated_by: {} },
        { id: 'TST-0002', mark: 'todo', verdict_date: '', verdict_reason: '', verdict_method: '', invalidated_by: { change: 'TASK-0001', reason: 'written on the note long ago', date: '' } },
        { id: '', mark: 'pass' },
        'not a row',
      ],
      {
        'TST-0001': [
          { platform: 'app', release: 'WORKING', date: '2026-09-10', mark: 'fail', reason: 'the list was empty', by: 'user:edwin', method: 'manual' },
          { platform: 'app', release: 'WORKING', date: '2026-09-20', mark: 'pass', reason: 'walked on the Mac', by: 'user:edwin', method: 'manual' },
          { platform: 'app', date: '', mark: 'pass' }, // no date: dropped
          { platform: 'app', date: '2026-09-21', mark: 7 }, // a mark that is not a word: dropped
          { platform: 'ios', date: '2026-09-22', mark: 'fail' }, // another platform's event
          null,
        ],
        'TST-0009': 'not a list',
      },
    ),
    'app',
  );
  assert.equal(read.platform, 'app');
  assert.deepEqual([...read.rows.keys()], ['TST-0001', 'TST-0002']);
  assert.deepEqual(read.rows.get('TST-0001'), { mark: 'pass', date: '2026-09-20', reason: 'walked on the Mac', method: 'manual' });
  // A row's `invalidated_by` is the test note's own frontmatter, not the ledger's word, and is not read.
  assert.deepEqual(read.rows.get('TST-0002'), { mark: 'todo', date: '', reason: '', method: '' });
  assert.deepEqual(read.history.get('TST-0001').map((e) => `${e.date} ${e.mark} ${e.by}`), ['2026-09-20 pass user:edwin', '2026-09-10 fail user:edwin'], 'newest first, the malformed ones dropped and the rest kept');
  assert.equal(read.history.has('TST-0009'), false);
});

test('a payload Deck was not written against is not read at all, and says why', () => {
  assert.match(platformLedger(null, 'app').unread, /not the acceptance record/);
  assert.match(platformLedger({ view: { tiers: [], history: {} } }, 'app').unread, /no schema_version/);
  assert.match(platformLedger(payload([], {}, { schema_version: 5 }), 'app').unread, /schema 5.*reads schema 4/);
  assert.match(platformLedger({ schema_version: 4 }, 'app').unread, /no view/);
  assert.match(platformLedger({ schema_version: 4, view: { history: {} } }, 'app').unread, /view\.tiers/);
  assert.match(platformLedger({ schema_version: 4, view: { tiers: [] } }, 'app').unread, /view\.history/);
  assert.match(platformLedger({ schema_version: 4, view: { tiers: [], history: [] } }, 'app').unread, /view\.history/);
  // The platforms come from the body, and nothing else is read from that answer.
  assert.deepEqual(platformsFrom(payload([], {}, { ledger_platforms: ['app', 'ios', '', 3] })), ['app', 'ios']);
  assert.deepEqual(platformsFrom(payload([], {}, { ledger_platforms: [] })), []);
  assert.match(platformsFrom({ schema_version: 4 }).unread, /which platforms/);
  assert.match(platformsFrom(payload([], {}, { schema_version: 3 })).unread, /schema 3/);
  assert.match(platformsFrom('<html>').unread, /not the acceptance record/);
});

test('an acceptance check has the ledger\'s verdict, with who recorded it taken from the history', () => {
  const check = facts('TST-0001', { level: 'acceptance', status: 'active' });
  const read = ledgers(
    [{ id: 'TST-0001', mark: 'pass', verdict_date: '2026-09-20', verdict_reason: 'walked on the Mac', verdict_method: 'manual', invalidated_by: {}, stale: true }],
    {
      'TST-0001': [
        { platform: 'app', date: '2026-09-20', mark: 'pass', reason: 'walked on the Mac', by: 'user:edwin', method: 'manual' },
        { platform: 'app', date: '2026-09-10', mark: 'fail', reason: 'the list was empty', by: 'user:someone-else', method: 'manual' },
      ],
    },
  );
  const [recorded, ...rest] = recordedFor(check, read, TODAY);
  assert.deepEqual(rest, []);
  assert.deepEqual(recorded, { kind: 'verdict', mark: 'pass', settles: 'clears', date: '2026-09-20', reason: 'walked on the Mac', by: 'user:edwin', method: 'manual', platform: 'app', source: 'ledger' });
  assert.deepEqual(recordedSentence(recorded), { label: 'verdict', text: 'pass on 2026-09-20 by user:edwin, manual: walked on the Mac', from: 'the acceptance ledger (app)', tone: 'clear' });
  // The sidecar's own `stale` on the row is not read: the same row without it gives the same result.
  const without = ledgers([{ id: 'TST-0001', mark: 'pass', verdict_date: '2026-09-20', verdict_reason: 'walked on the Mac', verdict_method: 'manual', invalidated_by: {} }], { 'TST-0001': [{ platform: 'app', date: '2026-09-20', mark: 'pass', reason: 'walked on the Mac', by: 'user:edwin', method: 'manual' }] });
  assert.deepEqual(recordedFor(check, without, TODAY), [recorded]);
  // A verdict that holds a check open looks different from one that settles it.
  const held = recordedFor(check, ledgers([{ id: 'TST-0001', mark: 'question', verdict_date: '2026-09-21', verdict_reason: '', verdict_method: 'manual' }], {}), TODAY)[0];
  assert.equal(held.settles, 'blocks');
  assert.equal(held.by, '', 'no event says who, so no one is named');
  assert.deepEqual(recordedSentence(held), { label: 'verdict', text: 'question on 2026-09-21, manual', from: 'the acceptance ledger (app)', tone: 'blocking' });
});

test('a check nobody walked says exactly that, whatever its note\'s status', () => {
  for (const status of ['active', 'passing', 'ready']) {
    const check = facts('TST-0003', { level: 'acceptance', status });
    const absent = recordedFor(check, ledgers([{ id: 'TST-0003', mark: 'todo', verdict_date: '' }], {}), TODAY);
    assert.deepEqual(absent, [{ kind: 'not-walked', platform: 'app', source: 'ledger' }]);
    assert.deepEqual(recordedSentence(absent[0]), { label: 'verdict', text: 'not walked: no verdict is recorded', from: 'the acceptance ledger (app)', tone: 'absent' });
    // A check the payload has no row for at all reads the same.
    assert.deepEqual(recordedFor(check, ledgers([], {}), TODAY), absent);
  }
});

test('an invalidated check has no standing verdict; the one before it is said to stand no longer', () => {
  const check = facts('TST-0002', { level: 'acceptance', status: 'active' });
  // The row also carries the note's own, older, undated invalidation. The ledger's is the one that is said.
  const read = ledgers(
    [{ id: 'TST-0002', mark: 'todo', verdict_date: '', invalidated_by: { change: 'TASK-0385', reason: 'a screen was replaced', date: '' } }],
    {
      'TST-0002': [
        { platform: 'app', date: '2026-09-25', mark: '', reason: 'the list changed.', by: 'agent', method: 'automated', invalidated_by: 'CHG-20260925-x' },
        { platform: 'app', date: '2026-09-22', mark: '', reason: 'the bar moved', by: '', method: '', invalidated_by: 'CHG-20260922-y' },
        { platform: 'app', date: '2026-09-12', mark: 'pass', by: 'user:edwin', method: 'manual' },
      ],
    },
  );
  const [recorded] = recordedFor(check, read, TODAY);
  assert.deepEqual(recorded, { kind: 'invalidated', change: 'CHG-20260925-x', date: '2026-09-25', reason: 'the list changed.', before: { mark: 'pass', date: '2026-09-12' }, platform: 'app', source: 'ledger' });
  assert.equal('mark' in recorded, false, 'it is not a verdict, and nothing returns it as one');
  const said = recordedSentence(recorded);
  assert.equal(said.text, 'invalidated on 2026-09-25 by CHG-20260925-x: the list changed. The verdict before it, pass on 2026-09-12, no longer stands. Not walked since.');
  assert.equal(said.tone, 'absent', 'it does not look like the pass it replaced');
  // With no verdict before it, none is mentioned.
  const fromHistory = recordedFor(check, ledgers([{ id: 'TST-0002', mark: 'todo' }], { 'TST-0002': [{ platform: 'app', date: '2026-09-25', mark: '', invalidated_by: 'CHG-20260925-x' }] }), TODAY)[0];
  assert.equal(fromHistory.kind, 'invalidated');
  assert.equal(fromHistory.before, null);
  assert.equal(recordedSentence(fromHistory).text, 'invalidated on 2026-09-25 by CHG-20260925-x. Not walked since.');
  // An invalidation written only on the note, with nothing in the ledger, is not the ledger's: the check reads as not walked.
  assert.deepEqual(recordedFor(check, ledgers([{ id: 'TST-0002', mark: 'todo', invalidated_by: { change: 'TASK-0385', reason: 'x', date: '' } }], {}), TODAY), [{ kind: 'not-walked', platform: 'app', source: 'ledger' }]);
});

test('a record that could not be read is not an empty one, and a workspace with no ledger says so', () => {
  const check = facts('TST-0003', { level: 'acceptance', status: 'active' });
  const unread = recordedFor(check, { unread: 'the sidecar answered 502' }, TODAY);
  assert.deepEqual(unread, [{ kind: 'unread', why: 'the sidecar answered 502', source: 'ledger' }]);
  assert.equal(recordedSentence(unread[0]).text, 'the acceptance record could not be read');
  assert.notEqual(recordedSentence(unread[0]).text, E.NOT_WALKED);
  for (const none of [{ none: true }, { ledgers: [] }]) {
    const recorded = recordedFor(check, none, TODAY);
    assert.deepEqual(recorded, [{ kind: 'no-ledger', source: 'ledger' }]);
    assert.equal(recordedSentence(recorded[0]).text, 'this workspace keeps no acceptance ledger');
  }
});

test('each platform\'s verdict is its own', () => {
  const check = facts('TST-0001', { level: 'acceptance', status: 'active' });
  const read = {
    ledgers: [
      platformLedger(payload([{ id: 'TST-0001', mark: 'pass', verdict_date: '2026-09-20', verdict_method: 'manual' }], {}), 'app'),
      platformLedger(payload([{ id: 'TST-0001', mark: 'todo' }], {}), 'ios'),
    ],
  };
  assert.deepEqual(recordedFor(check, read, TODAY).map((r) => `${r.platform} ${r.kind}`), ['app verdict', 'ios not-walked']);
});

test('a test with a command has no result Deck can read: no verdict, no date, no colour', () => {
  const unit = facts('TST-0010', { level: 'unit', status: 'active', command: 'bash tools/scripts/run-desktop-tests.sh evidence', last_verified: '2026-01-01' });
  const recorded = recordedFor(unit, { none: true }, TODAY);
  assert.deepEqual(recorded, [{ kind: 'command', command: 'bash tools/scripts/run-desktop-tests.sh evidence', source: 'note' }]);
  assert.deepEqual(recordedSentence(recorded[0]), { label: '', text: 'run by a command; its result is not recorded anywhere Deck can read', from: 'the test note', tone: 'plain' });
  // A status of `passing` on such a note is not shown as a result either.
  assert.deepEqual(recordedFor(facts('TST-0011', { level: 'integration', status: 'passing', command: 'make check' }), { none: true }, TODAY), [{ kind: 'command', command: 'make check', source: 'note' }]);
  // An acceptance check that also has a command gets its ledger result and the command's sentence.
  const both = recordedFor(facts('TST-0012', { level: 'acceptance', status: 'active', command: 'bash walk.sh' }), ledgers([{ id: 'TST-0012', mark: 'pass', verdict_date: '2026-09-30', verdict_method: 'automated' }], {}), TODAY);
  assert.deepEqual(both.map((r) => r.kind), ['verdict', 'command']);
});

test('a manual test has its own note\'s status and date, and goes stale after ninety days, not at ninety', () => {
  const manual = (last) => facts('TST-0020', { level: 'integration', status: 'passing', last_verified: last });
  const fresh = recordedFor(manual('2026-09-30'), { none: true }, TODAY);
  assert.deepEqual(fresh, [{ kind: 'performed', status: 'passing', date: '2026-09-30', stale: false, days: 2, source: 'note' }]);
  assert.deepEqual(recordedSentence(fresh[0]), { label: 'status of the test note', text: 'passing, last verified 2026-09-30', from: 'the test note', tone: 'clear' });
  assert.equal(E.STALE_DAYS, 90);
  assert.equal(daysBetween('2026-07-04', TODAY), 90);
  assert.equal(recordedFor(manual('2026-07-04'), { none: true }, TODAY)[0].stale, false, 'at exactly ninety days it is not stale');
  const old = recordedFor(manual('2026-07-03'), { none: true }, TODAY)[0];
  assert.equal(old.stale, true);
  assert.deepEqual(recordedSentence(old), { label: 'status of the test note', text: 'passing, last verified 2026-07-03. stale: a manual verification goes stale after 90 days; this was 91 days ago', from: 'the test note', tone: 'stale' });
  const undated = recordedFor(manual(undefined), { none: true }, TODAY);
  assert.deepEqual(undated, [{ kind: 'undated', status: 'passing', source: 'note' }]);
  assert.equal(recordedSentence(undated[0]).text, 'passing; no date of verification is recorded on the test note');
  assert.equal(recordedSentence(recordedFor(facts('TST-0021', { level: 'system', status: 'failing', last_verified: '2026-10-01' }), { none: true }, TODAY)[0]).tone, 'blocking');
  assert.deepEqual(recordedFor(facts('TST-0022', { level: 'acceptance', status: 'retired' }), { unread: 'x' }, TODAY), [{ kind: 'retired', source: 'note' }]);
});

test('a verdict and a status are never the same fact', () => {
  const cases = [
    ...recordedFor(facts('A', { level: 'acceptance', status: 'passing' }), ledgers([{ id: 'A', mark: 'fail', verdict_date: '2026-09-01' }], {}), TODAY),
    ...recordedFor(facts('B', { level: 'acceptance', status: 'passing' }), ledgers([], {}), TODAY),
    ...recordedFor(facts('C', { level: 'integration', status: 'passing', last_verified: '2026-09-01' }), { none: true }, TODAY),
    ...recordedFor(facts('D', { level: 'integration', status: 'passing' }), { none: true }, TODAY),
    ...recordedFor(facts('E', { level: 'unit', status: 'passing', command: 'x' }), { none: true }, TODAY),
  ];
  for (const recorded of cases) {
    assert.equal('mark' in recorded && 'status' in recorded, false, `${recorded.kind} holds both a mark and a status`);
    if (recorded.source === 'ledger') assert.equal('status' in recorded, false, `${recorded.kind} comes from the ledger and carries the note's status`);
    if (recorded.source === 'note') assert.equal('mark' in recorded, false, `${recorded.kind} comes from the note and carries a mark`);
    const said = recordedSentence(recorded);
    if (recorded.source === 'ledger') assert.equal(said.label, 'verdict');
    else assert.notEqual(said.label, 'verdict');
  }
  // The note says passing and the ledger says fail: the ledger's word is the verdict, and the note's status is not in it.
  assert.equal(recordedSentence(cases[0]).text.includes('passing'), false);
  assert.equal(cases[0].mark, 'fail');
});

test('a note no test names says so, from a count and nothing else', () => {
  assert.equal(controlText(0), 'no test names this note');
  assert.equal(controlText(1), '1 test names this note');
  assert.equal(controlText(6), '6 tests name this note');
  assert.equal(controlText.length, 1, 'it is handed no status, no feature and no task to infer from');
});

test('the tests named on a criterion\'s own line are that line\'s, in the order written', () => {
  const isTest = (id) => id.startsWith('TST-');
  assert.deepEqual(testsNamedOnLine(['FEAT-0020', 'TST-0063', 'TST-0001', 'TST-0063', ''], isTest), ['TST-0063', 'TST-0001']);
  assert.deepEqual(testsNamedOnLine(['FEAT-0020', 'ADR-0006'], isTest), []);
  assert.deepEqual(testsNamedOnLine([], isTest), []);
  assert.equal(E.NAMED_ON_LINE, 'named on this line');
  assert.equal(E.NO_SECTION, 'this test note has no Evidence section');
});

test('how a test is carried out, and one line of its history', () => {
  assert.equal(runnerText(facts('A', { level: 'acceptance' })), 'walked by a person');
  assert.equal(runnerText(facts('B', { level: 'unit', command: 'x' })), 'run by a command (unit)');
  assert.equal(runnerText(facts('C', { level: 'integration' })), 'performed by hand (integration)');
  assert.equal(historyLine({ platform: 'app', date: '2026-09-20', mark: 'pass', reason: 'walked', by: 'user:edwin', method: 'manual', invalidatedBy: '' }), 'app, 2026-09-20: pass by user:edwin, manual: walked');
  assert.equal(historyLine({ platform: 'app', date: '2026-09-25', mark: '', reason: 'the list changed', by: '', method: '', invalidatedBy: 'CHG-1' }), 'app, 2026-09-25: invalidated by CHG-1: the list changed');
});

test('the payload recorded from a real sidecar still reads as it did when it was recorded (RISK-0008)', () => {
  const recorded = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'acceptance', 'app.json'), 'utf8'));
  assert.deepEqual(platformsFrom(recorded), ['app']);
  const ledger = platformLedger(recorded, 'app');
  assert.equal('unread' in ledger, false, ledger.unread);
  assert.equal(ledger.rows.size, 21, 'every check in the recording has a row');
  const marks = {};
  for (const row of ledger.rows.values()) marks[row.mark] = (marks[row.mark] ?? 0) + 1;
  assert.deepEqual(marks, { pass: 4, question: 1, todo: 16 });
  assert.equal([...ledger.history.values()].reduce((n, events) => n + events.length, 0), 14, 'every event in the recording is read');
  // One check of each kind, against what the ledger file held that day.
  const of = (id) => recordedFor(facts(id, { level: 'acceptance', status: 'active' }), { ledgers: [ledger] }, TODAY)[0];
  const kinds = {};
  for (const id of ledger.rows.keys()) kinds[of(id).kind] = (kinds[of(id).kind] ?? 0) + 1;
  assert.deepEqual(kinds, { verdict: 5, 'not-walked': 14, invalidated: 2 });
  for (const id of ledger.rows.keys()) {
    const r = of(id);
    if (r.kind !== 'verdict') continue;
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}/, `${id} has a verdict with no date`);
    assert.equal(r.by, 'user:edwin', `${id}: who recorded the verdict was not found in its history`);
    assert.equal(r.method, 'manual');
  }
});
