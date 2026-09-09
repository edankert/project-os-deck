// TST-0029 — Deck's own index reads what is on disk, and agrees with the
// sidecar about what a note is (FEAT-0011).
//
// The fixture is the load-bearing part: `desktop/fixtures/sidecar-types.json`
// is recorded from the cockpit's OWN index, so a mirrored rule that is subtly
// wrong fails here rather than surprising somebody in front of two
// applications that disagree (RISK-0004). Where the two differ on purpose, the
// fixture names the file and the reason; a suite that passed because somebody
// loosened an assertion would test nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const { parseFrontmatter, parseYaml, firstHeading } = load('shared/yaml.js');
const { EXCLUDED_DIRECTORIES, isExcluded, isTemplate, linkTarget, normaliseStatus, normaliseTypes, recordFrom, typeCounts } =
  load('shared/records.js');
const { NoteIndex, docsRootFor, walkNotes } = load('main/note-index.js');

const REPO = path.resolve(desktopRoot, '..');
const FIXTURE = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'sidecar-types.json'), 'utf-8'));

// ---- the record ----

test('a record carries every frontmatter key, in the shape the YAML gave it', () => {
  const text = [
    '---',
    'id: FEAT-0011',
    'type: "[[feature]]"',
    'status: Doing',
    'created: 2026-09-08',
    'aliases: ["FEAT-0011"]',
    'tags: [deck, index]',
    'related:',
    '  - "[[TASK-0038-Records]]"',
    '  - "[[RISK-0004-Two-Indexers]]"',
    'weight: 3',
    'draft: false',
    'empty:',
    "note: 'it''s here'",
    'summary: one sentence that runs',
    '  over two lines',
    '---',
    '',
    '# The heading',
  ].join('\n');
  const { record, problems } = recordFrom('features/index/FEAT-0011.md', text, 1234);
  assert.deepEqual(problems, []);
  assert.equal(record.id, 'FEAT-0011');
  assert.equal(record.relPath, 'features/index/FEAT-0011.md');
  assert.equal(record.fileName, 'FEAT-0011');
  assert.equal(record.mtimeMs, 1234);
  assert.deepEqual(record.types, ['feature'], 'the wikilink wrapper is stripped and the value lower-cased');
  assert.equal(record.status, 'doing');
  assert.deepEqual(record.aliases, ['FEAT-0011']);
  assert.equal(record.title, 'The heading', 'no title: falls back to the first heading, as the sidecar does');
  // Every shape, under its own name.
  assert.equal(record.frontmatter.created, '2026-09-08', 'a date is the text that was written');
  assert.deepEqual(record.frontmatter.tags, ['deck', 'index']);
  assert.deepEqual(record.frontmatter.related, ['[[TASK-0038-Records]]', '[[RISK-0004-Two-Indexers]]']);
  assert.equal(record.frontmatter.weight, 3);
  assert.equal(record.frontmatter.draft, false);
  assert.equal(record.frontmatter.empty, null);
  assert.equal(record.frontmatter.note, "it's here");
  assert.equal(record.frontmatter.summary, 'one sentence that runs over two lines');
});

test('a key Deck has never heard of is kept, because a vault is full of them', () => {
  const text = ['---', 'type: Chapter', 'portrait: "[[face.png]]"', 'number: 12', 'world: Ardan', '---'].join('\n');
  const { record } = recordFrom('Comic/Chapter 12.md', text, 0);
  assert.equal(record.frontmatter.portrait, '[[face.png]]');
  assert.equal(record.frontmatter.number, 12);
  assert.equal(record.frontmatter.world, 'Ardan');
  assert.deepEqual(record.types, ['chapter']);
});

test('a note with no frontmatter is still a note', () => {
  const { record, problems } = recordFrom('Inbox/scrap.md', '# Just a heading\n\nsome text\n', 0);
  assert.deepEqual(problems, []);
  assert.deepEqual(record.frontmatter, {});
  assert.deepEqual(record.types, []);
  assert.equal(record.id, 'scrap', 'with no id, a note is addressed by its file name');
  assert.equal(record.title, 'Just a heading');
});

test('a LIST-valued type counts under every one of its values', () => {
  // The defect Deck must not reproduce: the sidecar's `_normalise_type` returns
  // nothing for a value that is not a string, so a note written this way is
  // counted under no type at all and vanishes from the cockpit's Library.
  // That is project-os-cockpit#ISS-0279.
  assert.deepEqual(normaliseTypes(['[[Project]]', 'Chapter']), ['project', 'chapter']);
  assert.deepEqual(normaliseTypes('[[Task]]'), ['task']);
  assert.deepEqual(normaliseTypes('  Reference  '), ['reference']);
  assert.deepEqual(normaliseTypes(''), []);
  assert.deepEqual(normaliseTypes(42), []);
  assert.deepEqual(normaliseTypes(['[[Task]]', 'task']), ['task'], 'two spellings of one type are one type');

  const text = ['---', 'type:', '- "[[Project]]"', '- "[[Design]]"', '---'].join('\n');
  const { record } = recordFrom('requirements/PRD.md', text, 0);
  assert.deepEqual(record.types, ['project', 'design']);
  assert.deepEqual(typeCounts([record]), { project: 1, design: 1 });
});

test('the type spellings the sidecar normalises, Deck normalises the same way', () => {
  // Mirrored, not invented: `_normalise_type` strips a `[[...]]` wrapper and
  // lower-cases, and does NOTHING else. It does not strip the alias half of a
  // wikilink, and neither does Deck, because Deck's answer for a file has to
  // be the sidecar's answer for that file.
  assert.deepEqual(normaliseTypes('[[Task|A task]]'), ['task|a task']);
  assert.equal(normaliseStatus('  Fixed '), 'fixed');
  assert.equal(normaliseStatus(42), null);
  assert.equal(normaliseStatus(''), null);
});

test('a wikilink names its target, whatever it was written with', () => {
  assert.equal(linkTarget('[[Chapter 12]]'), 'Chapter 12');
  assert.equal(linkTarget('[[Chapter 12|the twelfth]]'), 'Chapter 12');
  assert.equal(linkTarget('[[Chapter 12#Scene 3]]'), 'Chapter 12');
  assert.equal(linkTarget('Chapter 12'), 'Chapter 12');
});

// ---- what is walked, and what is not ----

test('the directories the sidecar ignores are ignored, from one place', () => {
  assert.deepEqual([...EXCLUDED_DIRECTORIES], ['__bases__', '.obsidian', '.trash', '.git']);
  for (const rel of ['__bases__/x.md', '.obsidian/x.md', '.trash/x.md', '.git/x.md', '.anything/x.md']) {
    assert.equal(isExcluded(rel), true, `${rel} was walked`);
  }
  // `__templates__` is deliberately NOT excluded: it holds the type-stub notes
  // a wikilink like `[[feature]]` resolves to, which is Obsidian's behaviour.
  assert.equal(isExcluded('__templates__/feature.md'), false);
  assert.equal(isTemplate('__templates__/feature.md'), true);
  // A file is never excluded by its OWN name, only by a directory above it.
  assert.equal(isExcluded('.trash.md'), false);
  assert.equal(isExcluded('issues/ISS-0001.md'), false);
});

test('one unreadable file costs one record, never the walk', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-index-'));
  fs.writeFileSync(path.join(root, 'good.md'), '---\ntype: issue\n---\n# Good\n');
  // Two lists under one key, the second at column zero: the shape eight of Your
  // Trainer's requirements are written in, and the one PyYAML refuses outright.
  fs.writeFileSync(path.join(root, 'odd.md'), '---\ntype: issue\nacceptance:\n  - "a"\n- "b"\n---\n# Odd\n');
  fs.mkdirSync(path.join(root, '.trash'));
  fs.writeFileSync(path.join(root, '.trash', 'gone.md'), '---\ntype: issue\n---\n');
  fs.writeFileSync(path.join(root, 'notes.txt'), 'not markdown');

  const { records, problems } = walkNotes(root);
  assert.deepEqual(records.map((r) => r.relPath), ['good.md', 'odd.md'], 'the ignored directory stayed ignored');
  const report = problems.find((p) => p.relPath === 'odd.md');
  assert.notEqual(report, undefined, 'the odd file was not reported');
  assert.equal(typeof report.reason, 'string');
  assert.ok(report.reason.length > 0, 'a report has to say what it could not read');
  assert.equal(typeof report.line, 'number', 'and where');
  // The record is still there, with what could be read.
  assert.deepEqual(records[1].types, ['issue']);
});

// ---- the comparison with the sidecar ----

/**
 * Compare Deck's answer with the sidecar's, note by note, for one workspace.
 *
 * Three claims, and they are not the same strength.
 *
 * A note the fixture names that is still ON DISK and that Deck did not index
 * fails outright. That check was missing, and its absence let a mutation that
 * hid `issues/` and `reference/` — a sixth of this repository — pass the whole
 * comparison (ISS-0026).
 *
 * A CONTRADICTION about what a note IS — the sidecar says feature and Deck says
 * anything else — fails with no tolerance. So does a difference in the KEY SET,
 * which is what caught nothing while Deck was losing five relationship fields
 * on twenty-two of Your Trainer's notes (ISS-0024).
 *
 * Deck KNOWING SOMETHING THE SIDECAR DOES NOT is allowed under the two rules
 * the fixture states, each checked live on the Deck side rather than against a
 * list of paths, because a list goes stale.
 */
function compareWithSidecar(recorded, docsRoot, workspace, atLeast) {
  const walked = walkNotes(docsRoot);
  const mine = new Map(walked.records.map((r) => [r.relPath, r]));
  const reported = new Set(walked.problems.map((p) => p.relPath));
  const named = new Map(
    FIXTURE.expectedDifferences.filter((d) => d.workspace === workspace).map((d) => [d.relPath, d]),
  );
  let compared = 0;
  const notIndexed = [];
  const contradictions = [];
  const keySets = [];
  const unexplained = [];
  for (const [relPath, note] of Object.entries(recorded.notes)) {
    const record = mine.get(relPath);
    if (record === undefined) {
      // A note DELETED since the fixture was recorded is not a disagreement.
      // A note still on disk that Deck did not index is the worst kind.
      if (fs.existsSync(path.join(docsRoot, relPath))) notIndexed.push(relPath);
      continue;
    }
    compared += 1;

    // The key set. `unreadable` means PyYAML refused the whole document, so
    // the sidecar has no keys at all and the difference rules cover it.
    if (note.unreadable !== true) {
      const wanted = recorded.shapes[note.shape];
      const ours = Object.keys(record.frontmatter).sort().join(',');
      if (ours !== wanted) keySets.push(`${relPath}: deck [${ours}] where the sidecar read [${wanted}]`);
    }

    if (note.type !== null) {
      if (JSON.stringify(record.types) !== JSON.stringify([note.type])) {
        contradictions.push(`${relPath}: deck ${JSON.stringify(record.types)}, sidecar ${JSON.stringify(note.type)}`);
      }
      continue;
    }
    if (record.types.length === 0) continue;
    const listValued = Array.isArray(record.frontmatter.type);
    if (listValued || reported.has(relPath) || named.has(relPath)) continue;
    unexplained.push(`${relPath}: deck ${JSON.stringify(record.types)} where the sidecar had no opinion`);
  }
  assert.deepEqual(notIndexed, [], `these notes in ${workspace} are on disk and Deck did not index them`);
  assert.deepEqual(contradictions, [], `Deck and the sidecar CONTRADICT each other about these notes in ${workspace}`);
  assert.deepEqual(keySets, [], `Deck and the sidecar read different keys from these notes in ${workspace}`);
  assert.deepEqual(unexplained, [], `no rule in the fixture explains these differences in ${workspace}`);
  assert.ok(compared > atLeast, `only ${compared} notes were compared; the fixture has lost its content`);
  for (const [relPath, row] of named) {
    const record = mine.get(relPath);
    if (record === undefined) continue;
    assert.deepEqual(record.types, row.deck, `the named difference for ${relPath} no longer describes what Deck does`);
  }
  return compared;
}

test('Deck calls every note in this repository what the sidecar calls it', () => {
  compareWithSidecar(FIXTURE.thisRepository, path.join(REPO, 'docs'), 'thisRepository', 150);
});

test('Deck calls every note in Your Trainer what the sidecar calls it', (t) => {
  const trainer = FIXTURE.yourTrainer;
  if (trainer === null || !fs.existsSync(trainer.docsRoot)) {
    // Absent in CI. Said out loud rather than passed quietly: this is the
    // large-workspace half of the comparison and it did not run.
    t.skip('your-trainer is not on this machine, so the large-workspace comparison did not run');
    return;
  }
  compareWithSidecar(trainer, trainer.docsRoot, 'yourTrainer', 2000);
});

test('a note ON DISK that Deck did not index fails the comparison', () => {
  // The check ISS-0026 was missing, and its absence let a mutation hiding a
  // sixth of this repository pass the whole comparison. Driven over a
  // temporary workspace, because the failure it guards is a note that is
  // ABSENT from the index — and an absent thing is what a loop over what is
  // present cannot see.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-missing-'));
  fs.writeFileSync(path.join(root, 'here.md'), '---\ntype: issue\n---\n');
  fs.mkdirSync(path.join(root, '.trash'));
  fs.writeFileSync(path.join(root, '.trash', 'hidden.md'), '---\ntype: issue\n---\n');
  const recorded = {
    shapes: ['type'],
    notes: { 'here.md': { type: 'issue', shape: 0 }, '.trash/hidden.md': { type: 'issue', shape: 0 } },
  };
  assert.throws(
    () => compareWithSidecar(recorded, root, 'thisRepository', 0),
    /on disk and Deck did not index them/,
  );
  // A note the fixture names that has actually been DELETED is not a failure:
  // both repositories lose notes, and a comparison that broke on that would be
  // a comparison nobody trusted.
  fs.rmSync(path.join(root, '.trash'), { recursive: true });
  assert.equal(compareWithSidecar(recorded, root, 'thisRepository', 0), 1);
});

test('a note whose KEYS differ from the sidecar\'s fails the comparison', () => {
  // The check that was type-only, which is why ISS-0024 lost five relationship
  // fields on twenty-two notes with nothing going red.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-keys-'));
  fs.writeFileSync(path.join(root, 'a.md'), '---\ntype: issue\nstatus: open\n---\n');
  const recorded = { shapes: ['status,tests,type'], notes: { 'a.md': { type: 'issue', shape: 0 } } };
  assert.throws(() => compareWithSidecar(recorded, root, 'thisRepository', 0), /read different keys/);
});

test('the fixture states the RULES a difference has to fall under, not just a list', () => {
  const rules = FIXTURE.differenceRules;
  assert.equal(rules.length, 2);
  assert.deepEqual(rules.map((r) => r.id).sort(), ['frontmatter-deck-reports', 'list-valued-type']);
  for (const rule of rules) {
    assert.ok(rule.when.length > 20, `${rule.id} does not say when it applies`);
    assert.ok(rule.reason.length > 80, `${rule.id} does not say why`);
  }
});

test('the fixture says where it came from, so a reader can re-record it', () => {
  assert.match(FIXTURE.recordedFrom, /project_os_cockpit/);
  assert.match(FIXTURE.recordedOn, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(FIXTURE.sidecarCommit.length > 0);
  for (const row of FIXTURE.expectedDifferences) {
    assert.ok(row.relPath.length > 0);
    assert.ok(row.reason.length > 40, `${row.relPath} has no reason worth reading`);
  }
});

// ---- changes on disk ----

function tempWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-watch-'));
  fs.writeFileSync(path.join(root, 'a.md'), '---\ntype: issue\nstatus: open\n---\n# A\n');
  fs.writeFileSync(path.join(root, 'b.md'), '---\ntype: task\nstatus: backlog\n---\n# B\n');
  return root;
}

/** The real file system, with every read counted. */
function countingIo() {
  const nodeIo = load('main/note-index.js').nodeIo;
  const reads = [];
  return {
    reads,
    io: {
      readDir: nodeIo.readDir,
      readFile: (file) => {
        reads.push(file);
        return nodeIo.readFile(file);
      },
      mtimeMs: nodeIo.mtimeMs,
    },
  };
}

test('editing a note changes its record and raises the revision, with no restart', () => {
  const root = tempWorkspace();
  const seen = [];
  const index = new NoteIndex({ workspaceId: 'w', docsRoot: root, onChange: (r) => seen.push(r), quietMs: 0 });
  index.build();
  const first = index.snapshot();
  assert.equal(first.building, false);
  assert.equal(first.records.length, 2);
  assert.equal(first.records.find((r) => r.relPath === 'a.md').status, 'open');

  fs.writeFileSync(path.join(root, 'a.md'), '---\ntype: issue\nstatus: fixed\n---\n# A\n');
  index.noticed('a.md');
  index.settle();

  const second = index.snapshot();
  assert.equal(second.records.find((r) => r.relPath === 'a.md').status, 'fixed');
  assert.ok(second.revision > first.revision, 'the revision did not rise');
  assert.deepEqual(seen, [1, 2]);
  index.close();
});

test('a single file changing re-reads that file and nothing else', () => {
  const root = tempWorkspace();
  const { reads, io } = countingIo();
  const index = new NoteIndex({ workspaceId: 'w', docsRoot: root, io, quietMs: 0 });
  index.build();
  assert.equal(reads.length, 2, 'the first walk reads every note once');
  reads.length = 0;

  fs.writeFileSync(path.join(root, 'b.md'), '---\ntype: task\nstatus: done\n---\n# B\n');
  index.noticed('b.md');
  index.settle();

  assert.equal(reads.length, 1, `a one-file change read ${reads.length} files`);
  assert.ok(reads[0].endsWith('b.md'));
  index.close();
});

test('a burst is one rebuild and one rise, not one per file', () => {
  const root = tempWorkspace();
  const seen = [];
  const index = new NoteIndex({ workspaceId: 'w', docsRoot: root, onChange: (r) => seen.push(r), quietMs: 0 });
  index.build();
  seen.length = 0;

  for (const name of ['a.md', 'b.md', 'c.md', 'd.md']) {
    fs.writeFileSync(path.join(root, name), '---\ntype: task\n---\n');
    index.noticed(name);
  }
  index.settle();

  assert.equal(seen.length, 1, `a burst of four raised the revision ${seen.length} times`);
  assert.equal(index.snapshot().records.length, 4);
  index.close();
});

test('adding, deleting and renaming a note each do the obvious thing', () => {
  const root = tempWorkspace();
  const index = new NoteIndex({ workspaceId: 'w', docsRoot: root, quietMs: 0 });
  index.build();

  fs.writeFileSync(path.join(root, 'c.md'), '---\ntype: risk\n---\n');
  index.noticed('c.md');
  index.settle();
  assert.equal(index.snapshot().records.length, 3);

  fs.unlinkSync(path.join(root, 'c.md'));
  index.noticed('c.md');
  index.settle();
  assert.equal(index.snapshot().records.length, 2, 'a deleted note kept its record');

  // A rename is a removal and an addition, never a record with a stale path.
  fs.renameSync(path.join(root, 'a.md'), path.join(root, 'renamed.md'));
  index.noticed('a.md');
  index.noticed('renamed.md');
  index.settle();
  const paths = index.snapshot().records.map((r) => r.relPath).sort();
  assert.deepEqual(paths, ['b.md', 'renamed.md']);
  index.close();
});

test('the revision never falls, and only a real change raises it', () => {
  const root = tempWorkspace();
  const index = new NoteIndex({ workspaceId: 'w', docsRoot: root, quietMs: 0 });
  index.build();
  const first = index.snapshot().revision;
  assert.equal(first, 1, 'the first build always raises: a window at revision 0 has drawn nothing');

  // A rebuild that finds the same records is not a change. It used to raise
  // anyway, so a write to `.obsidian/workspace.json` — which Obsidian does
  // whenever a pane moves — told every window its notes had changed
  // (ISS-0030).
  index.build();
  assert.equal(index.snapshot().revision, first, 'a rebuild that changed nothing raised the revision');

  fs.writeFileSync(path.join(root, 'a.md'), '---\ntype: issue\nstatus: doing\n---\n');
  index.noticed('a.md');
  index.settle();
  const second = index.snapshot().revision;
  assert.ok(second > first, 'a real change did not raise the revision');

  // Including across a rebuild: the counter only ever goes up.
  fs.writeFileSync(path.join(root, 'c.md'), '---\ntype: risk\n---\n');
  index.build();
  assert.ok(index.snapshot().revision > second, 'a rebuild that found a new note did not raise');
  index.close();
});

test('a change under a directory the walk does not read is ignored entirely', () => {
  // Obsidian writes `.obsidian/workspace.json` whenever a pane moves. Re-
  // walking a vault for that, and then marking every window, was a banner
  // nobody could act on (ISS-0030).
  const root = tempWorkspace();
  const { reads, io } = countingIo();
  const seen = [];
  const index = new NoteIndex({ workspaceId: 'w', docsRoot: root, io, onChange: (r) => seen.push(r), quietMs: 0 });
  index.build();
  reads.length = 0;
  seen.length = 0;

  index.noticed('.obsidian/workspace.json');
  index.settle();
  assert.equal(reads.length, 0, `an excluded path caused ${reads.length} reads`);
  assert.deepEqual(seen, [], 'an excluded path raised the revision');

  // A Markdown file that is NOT excluded still does both.
  fs.writeFileSync(path.join(root, 'a.md'), '---\ntype: issue\nstatus: fixed\n---\n');
  index.noticed('a.md');
  index.settle();
  assert.equal(seen.length, 1);
  index.close();
});

test('a workspace whose notes are in docs/ is walked there, and a vault at its root', () => {
  assert.equal(docsRootFor(REPO), path.join(REPO, 'docs'));
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-vault-'));
  assert.equal(docsRootFor(bare), bare);
});

// ---- the YAML subset itself ----

test('the YAML subset reads what these files are actually written in', () => {
  const { value, problems } = parseYaml(
    [
      'formulas:',
      '  character.summary: summary',
      '  page.image: "if(image, image(image)) "',
      'views:',
      '  - type: cards',
      '    name: Characters',
      '    filters:',
      '      and:',
      '        - type.contains(link("@Character"))',
      '        - file.name != "@Character"',
      '    sort:',
      '      - property: number',
      '        direction: ASC',
      '    cardSize: 240',
    ].join('\n'),
  );
  assert.deepEqual(problems, []);
  assert.equal(value.formulas['character.summary'], 'summary');
  assert.equal(value.views[0].type, 'cards');
  assert.deepEqual(value.views[0].filters.and, ['type.contains(link("@Character"))', 'file.name != "@Character"']);
  assert.deepEqual(value.views[0].sort, [{ property: 'number', direction: 'ASC' }]);
  assert.equal(value.views[0].cardSize, 240);
});

test('a construct the subset does not read is NAMED, and the rest still parses', () => {
  const { value, problems } = parseYaml(['a: 1', 'b: &anchor value', 'c: 3'].join('\n'));
  assert.equal(value.a, 1);
  assert.equal(value.c, 3, 'the keys after the unreadable one were dropped');
  assert.equal(problems.length, 1);
  assert.equal(problems[0].construct, 'an anchor');
  assert.equal(problems[0].line, 2);
});

test('yes and no stay text, because a status is not a boolean', () => {
  // YAML 1.2 dropped `yes`/`no` as booleans, and a note whose `status: no`
  // became `false` would be a note nobody could find again.
  const { value } = parseYaml(['a: yes', 'b: true', 'c: NULL', 'd: 0012', 'e: 1.5'].join('\n'));
  assert.equal(value.a, 'yes');
  assert.equal(value.b, true);
  assert.equal(value.c, null);
  assert.equal(value.d, '0012', 'a leading zero is an identifier, not a number');
  assert.equal(value.e, 1.5);
});

test('a trailing comment goes, and a colour and a fragment stay', () => {
  const { value } = parseYaml(['a: one # a comment', 'b: "#ff0000"', 'c: https://x.test/p#frag'].join('\n'));
  assert.equal(value.a, 'one');
  assert.equal(value.b, '#ff0000');
  assert.equal(value.c, 'https://x.test/p#frag');
});

test('frontmatter that never closes is reported rather than read to the end', () => {
  const { frontmatter, problems } = parseFrontmatter('---\ntype: issue\n\n# not a fence\n');
  assert.deepEqual(frontmatter, {});
  assert.equal(problems.length, 1);
  assert.match(problems[0].construct, /never closed/);
});

test('the first heading is the fallback title, as it is for the sidecar', () => {
  assert.equal(firstHeading('some text\n\n# The title\n\n# A second\n'), 'The title');
  assert.equal(firstHeading('## Not a first-level heading\n'), null);
  assert.equal(firstHeading(''), null);
});

// ---- the records reach a page, read-only, on both hosts ----

const { DeckHost } = load('main/host.js');
const { SERVED_CAPABILITIES } = load('shared/capability.js');

/** Deck's host with an index behind it, and nothing else. */
async function hostWithIndex(indexFor) {
  const host = new DeckHost({
    webRoot: path.join(desktopRoot, 'dist', 'web'),
    // The SERVED set: what a tablet gets. If the records were readable only in
    // the shell there would be two data paths, which is what "one renderer,
    // two hosts" exists to prevent.
    capabilities: SERVED_CAPABILITIES,
    listWorkspaces: () => [],
    sidecarBaseFor: () => null,
    indexFor,
  });
  const { port } = await host.listen(0);
  return { host, origin: `http://127.0.0.1:${port}` };
}

test('a page reads Deck\'s records over Deck\'s own host, with the revision', async () => {
  const root = tempWorkspace();
  const index = new NoteIndex({ workspaceId: 'aaaa1111', docsRoot: root, quietMs: 0 });
  index.build();
  const { host, origin } = await hostWithIndex((id) => (id === 'aaaa1111' ? index.snapshot() : null));
  try {
    const response = await fetch(`${origin}/deck/records/aaaa1111`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.workspaceId, 'aaaa1111');
    assert.equal(payload.building, false);
    assert.equal(payload.revision, 1, 'every answer says which index state it is');
    assert.deepEqual(payload.records.map((r) => r.relPath).sort(), ['a.md', 'b.md']);
    assert.deepEqual(payload.records.find((r) => r.relPath === 'a.md').types, ['issue']);

    const head = await fetch(`${origin}/deck/records/aaaa1111`, { method: 'HEAD' });
    assert.equal(head.status, 200);
  } finally {
    await host.close();
    index.close();
  }
});

test('a read while the index is still building is answered, not refused', async () => {
  // ISS-0011 is this shape one layer down: a read arriving during a long
  // start-up was read as a death and the thing being read was torn down.
  const root = tempWorkspace();
  const index = new NoteIndex({ workspaceId: 'aaaa1111', docsRoot: root, quietMs: 0 });
  const { host, origin } = await hostWithIndex(() => index.snapshot());
  try {
    const during = await fetch(`${origin}/deck/records/aaaa1111`);
    assert.equal(during.status, 200, 'a read during the walk was reported as a failure');
    const payload = await during.json();
    assert.equal(payload.building, true);
    assert.equal(payload.revision, 0);
    assert.deepEqual(payload.records, [], 'half a workspace would be drawn as though it were all of it');

    index.build();
    const after = await (await fetch(`${origin}/deck/records/aaaa1111`)).json();
    assert.equal(after.building, false);
    assert.equal(after.records.length, 2);
  } finally {
    await host.close();
    index.close();
  }
});

test('a workspace Deck has no index for is refused BY NAME, not as an empty list', async () => {
  const { host, origin } = await hostWithIndex(() => null);
  try {
    const response = await fetch(`${origin}/deck/records/bbbb2222`);
    assert.equal(response.status, 404);
    const said = await response.text();
    assert.match(said, /bbbb2222/, 'the refusal does not name the workspace');
    const nameless = await fetch(`${origin}/deck/records/`);
    assert.equal(nameless.status, 404);
  } finally {
    await host.close();
  }
});

test('every method that is not a read is refused on the records path too', async () => {
  const root = tempWorkspace();
  const index = new NoteIndex({ workspaceId: 'aaaa1111', docsRoot: root, quietMs: 0 });
  index.build();
  const { host, origin } = await hostWithIndex(() => index.snapshot());
  try {
    // Including the ones a browser will not send: this path is Deck's own and
    // is not a forward, so the forwarding suite's refusals say nothing about it.
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'PROPFIND', 'LOCK']) {
      const response = await fetch(`${origin}/deck/records/aaaa1111`, { method });
      assert.equal(response.status, 405, `${method} was not refused`);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
    }
    // `fetch` will not send TRACE at all, so it is driven down a raw socket.
    // A method the runtime refuses to send is still a method that reaches this
    // host from something that is not a browser.
    const traced = await rawRequest(origin, 'TRACE /deck/records/aaaa1111');
    assert.match(traced, /^HTTP\/1\.1 405 /, `TRACE was answered ${traced.split(String.fromCharCode(13))[0]}`);
  } finally {
    await host.close();
    index.close();
  }
});

/** One request down a socket, for methods `fetch` refuses to send. */
function rawRequest(origin, requestLine) {
  const url = new URL(origin);
  return new Promise((resolve, reject) => {
    const socket = net.connect(Number(url.port), url.hostname, () => {
      socket.write(`${requestLine} HTTP/1.1\r\nHost: ${url.host}\r\nConnection: close\r\n\r\n`);
    });
    let text = '';
    socket.setEncoding('utf-8');
    socket.on('data', (chunk) => {
      text += chunk;
    });
    socket.on('end', () => resolve(text));
    socket.on('error', reject);
  });
}

// ---- what the reader used to get wrong ----

test('a key whose value is followed by an indented list does NOT end the document', () => {
  // ISS-0024. Twenty-two of Your Trainer's notes are written this way — a
  // `source:` key was deleted and its list left behind — and Deck used to stop
  // at that point, losing `effort`, `depends`, `blocks`, `related` and
  // `tests`. YAML has no way for a key with a scalar value to have a sequence
  // as well, so the lines CONTINUE the scalar, which is what PyYAML does.
  const { value, problems } = parseYaml(
    ['updated: 2026-05-07', '  - "[[FEAT-0066]]"', '  - "[[REQ-0157]]"', 'effort: "high"', 'blocks: []'].join('\n'),
  );
  assert.deepEqual(Object.keys(value), ['updated', 'effort', 'blocks'], 'the keys after the list were lost');
  assert.equal(value.effort, 'high');
  assert.deepEqual(value.blocks, []);
  assert.equal(value.updated, '2026-05-07 - "[[FEAT-0066]]" - "[[REQ-0157]]"');
  assert.deepEqual(problems, [], 'nothing was left unread, so nothing should be reported');
});

test('a block scalar keeps its blank lines, its hashes and its trailing newline', () => {
  // ISS-0025, and the SILENT one: the scan stripped blanks and comments from
  // the whole document before any reader ran, so a `|` scalar lost them with
  // no report at all.
  const { value } = parseYaml(['body: |', '  # Heading', '', '  text', 'after: 1'].join('\n'));
  assert.equal(value.body, '# Heading\n\ntext\n');
  assert.equal(value.after, 1, 'the key after the block scalar was lost');
});

test('an escape is read once, so a literal backslash-n stays one', () => {
  // ISS-0025. A chain of replacements cannot be right: whichever rule runs
  // first eats the other's input, so `\\n` — an escaped backslash and the
  // letter n — came out as a backslash and a newline.
  const { value } = parseYaml(['a: "x\\\\ny"', 'b: "x\\ny"', 'c: "a\\"b"', 'd: "\\u0041"'].join('\n'));
  assert.equal(value.a, 'x\\ny');
  assert.equal(value.b, 'x\ny');
  assert.equal(value.c, 'a"b');
  assert.equal(value.d, 'A');
});

test('a sequence inside a sequence nests', () => {
  const { value } = parseYaml(['m:', '  - - 1', '    - 2', '  - 3'].join('\n'));
  assert.deepEqual(value.m, [[1, 2], 3]);
});
