// TST-0031 — the evaluator runs the seeded language over Deck's index, and
// names what it cannot run (TASK-0043, TASK-0045).
//
// Two programs now evaluate this language over the same files, Obsidian and
// Deck, and they can disagree (RISK-0003). The mitigation is the two rules
// checked here: the seed is NAMED rather than assumed, and what falls outside
// it is reported instead of quietly producing a different answer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const { SEED_FUNCTIONS, isImplemented, evaluate, parseExpression, matches, UNSUPPORTED, same, duration } =
  load('shared/expression.js');
const { runQuery, compileFilter, toCard } = load('shared/query.js');
const { recordFrom } = load('shared/records.js');
const { walkNotes } = load('main/note-index.js');
const { parseDescription, DESCRIPTION_VERSION } = load('shared/description.js');
const { rowsFor } = load('shared/rows.js');
const { projectOsProvider } = load('shared/views.js');
const { fromBaseFile } = load('shared/base-file.js');

const REPO = path.resolve(desktopRoot, '..');
const WORKSPACE = { id: 'aaaa1111', root: REPO, name: 'deck', kind: 'project-os' };

/** A small index written by hand, so a check says what it is about. */
function index(entries) {
  return entries.map(([relPath, frontmatter]) => {
    const name = (relPath.split('/').pop() ?? relPath).replace(/\.md$/, '');
    // Real Markdown, parsed by the real reader: a fixture built by hand out of
    // record objects would not exercise the parser the records come through.
    return recordFrom(relPath, `---\n${toYaml(frontmatter)}---\n# ${name}\n`, 0).record;
  });
}

function toYaml(frontmatter) {
  let out = '';
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) out += `${key}: [${value.map((v) => scalar(v)).join(', ')}]\n`;
    else out += `${key}: ${scalar(value)}\n`;
  }
  return out;
}

/** A number stays a number, as it would in a file somebody wrote. */
function scalar(value) {
  return typeof value === 'number' ? String(value) : JSON.stringify(String(value));
}

const VAULT = index([
  ['Comic/Ada.md', { type: '[[@Character]]', role: 'lead', age: 34, portrait: '[[ada.png]]' }],
  ['Comic/Bram.md', { type: '[[@Character]]', role: 'foil', age: 51 }],
  ['Comic/Chapter 1.md', { type: '[[Chapter]]', number: 1, story: '[[The Book]]' }],
  ['Comic/Chapter 2.md', { type: '[[Chapter]]', number: 2, story: '[[The Book]]' }],
  ['Tasks/Ride.md', { type: '[[Task]]', status: 'todo', due: '2026-09-01', priority: 'high' }],
  ['Tasks/Write.md', { type: '[[Task]]', status: 'done', due: '2026-12-01', priority: 'low' }],
  ['Tasks/Rest.md', { type: ['[[Task]]', '[[Chapter]]'], status: 'cancelled' }],
]);

const TODAY = new Date('2026-09-09T00:00:00Z');

function select(filter, records = VAULT) {
  const unsupported = [];
  const predicate = compileFilter(filter, 'source.filter', unsupported);
  const chosen = records.filter((record) =>
    predicate({ record, formulas: {}, this: null, today: TODAY, unsupported, where: 'source.filter', pathPrefix: 'docs' }),
  );
  return { names: chosen.map((r) => r.fileName), unsupported };
}

// ---- filters ----

test('and, or, not and ! select the right notes', () => {
  assert.deepEqual(select('type.contains(link("Chapter"))').names, ['Chapter 1', 'Chapter 2', 'Rest']);
  assert.deepEqual(select({ and: ['type.contains(link("Chapter"))', 'number == 2'] }).names, ['Chapter 2']);
  assert.deepEqual(select({ or: ['role == "lead"', 'number == 2'] }).names, ['Ada', 'Chapter 2']);
  // Obsidian's `not` excludes a note matching ANY of its children, which is
  // how the cockpit's own base files leave templates out.
  assert.deepEqual(select({ not: ['type.contains(link("Chapter"))', 'type == link("Task")'] }).names, ['Ada', 'Bram']);
  assert.deepEqual(select('!status.containsAny("done", "cancelled")').names, ['Ada', 'Bram', 'Chapter 1', 'Chapter 2', 'Ride']);
});

test("the or-of-and shape the vault's sidebar base uses", () => {
  const filter = {
    or: [
      { and: ['type.contains(link("@Character"))', 'role == "lead"'] },
      { and: ['type.contains(link("Chapter"))', 'number == 2'] },
    ],
  };
  assert.deepEqual(select(filter).names, ['Ada', 'Chapter 2']);
});

test('all six comparison operators behave', () => {
  assert.deepEqual(select('age > 40').names, ['Bram']);
  assert.deepEqual(select('age >= 34').names, ['Ada', 'Bram']);
  assert.deepEqual(select('age < 40').names, ['Ada']);
  assert.deepEqual(select('age <= 34').names, ['Ada']);
  assert.deepEqual(select('role == "lead"').names, ['Ada']);
  assert.deepEqual(select({ and: ['type == link("@Character")', 'role != "lead"'] }).names, ['Bram']);
});

test('date addition behaves, over records whose values are dates', () => {
  // The vault writes `today() + "1 week"` and `today() - "7d"`.
  assert.deepEqual(select('due < today()').names, ['Ride']);
  assert.deepEqual(select({ and: ['type == link("Task")', 'due > today() + "1 week"'] }).names, ['Write']);
  assert.equal(duration('1 week'), 7 * 86400000);
  assert.equal(duration('7d'), 7 * 86400000);
  assert.equal(duration('not a duration'), null);
});

test('the THREE spellings of "this note is of type X" agree', () => {
  // All three appear in the vault and mean one thing to a person. They mean
  // one thing here too, and the rule is one named function rather than three
  // branches: `same()` reduces a link to its target on both sides.
  const a = select('type.contains(link("Chapter"))').names;
  const b = select('type == link("Chapter")').names;
  const c = select('note.type == "[[Chapter]]"').names;
  assert.deepEqual(a, b);
  assert.deepEqual(b, c);
  assert.ok(a.includes('Chapter 1') && a.includes('Rest'), 'a list-valued type must match too');
  assert.equal(same({ link: 'Task' }, '[[Task]]'), true);
  assert.equal(same('[[Task|a task]]', 'Task'), true);
});

test('the property namespaces resolve to what they name', () => {
  const record = VAULT[0];
  const context = { record, formulas: {}, this: null, unsupported: [], where: 'x', pathPrefix: 'docs' };
  assert.equal(evaluate(parseExpression('role'), context), 'lead');
  assert.equal(evaluate(parseExpression('note.role'), context), 'lead');
  assert.equal(evaluate(parseExpression('file.name'), context), 'Ada');
  // `file.path` is what OBSIDIAN would call it: the record's path with the
  // docs root's own name in front, because a base file is written against the
  // vault whose root is the repository (ISS-0027).
  assert.equal(evaluate(parseExpression('file.path'), context), 'docs/Comic/Ada.md');
  assert.equal(evaluate(parseExpression('file.folder'), context), 'docs/Comic');
  const vault = { ...context, pathPrefix: '' };
  assert.equal(evaluate(parseExpression('file.path'), vault), 'Comic/Ada.md', 'a vault has no prefix');
  assert.equal(evaluate(parseExpression('file.ext'), context), 'md');
  const withFormula = { ...context, formulas: { summary: parseExpression('role + " (" + toString(age) + ")"') } };
  assert.equal(evaluate(parseExpression('formula.summary'), withFormula), 'lead (34)');
});

test('a this.-relative filter is reported by name, never evaluated against nothing', () => {
  // The vault's sidebar base filters relative to the note it is embedded in,
  // and Deck has no such note. Selecting nothing quietly would be a view that
  // looks empty for a reason nobody can read.
  const { names, unsupported } = select('this.file.properties.characters.contains(file)');
  assert.deepEqual(names, []);
  assert.equal(unsupported.length, 1);
  assert.equal(unsupported[0].construct, 'this.');
  assert.match(unsupported[0].reason, /embedded/);
});

test('a formula the view does not define is reported by name', () => {
  const { unsupported } = select('formula.missing == 1');
  assert.equal(unsupported.length, 1);
  assert.equal(unsupported[0].construct, 'formula.missing');
});

// ---- the seed ----

test('every function in the SEED either evaluates or is reported by name', () => {
  // The walk reads the seed list itself, so a function nobody implemented
  // cannot pass by being absent from this suite too.
  assert.ok(SEED_FUNCTIONS.length > 20, 'the seed is smaller than the language that was measured');
  const evaluated = [];
  const reported = [];
  for (const name of SEED_FUNCTIONS) {
    const unsupported = [];
    const context = { record: VAULT[0], formulas: {}, this: null, today: TODAY, unsupported, where: 'seed', pathPrefix: 'docs' };
    const node = parseExpression(`${name}(1)`);
    const value = evaluate(node, context);
    if (isImplemented(name)) {
      assert.equal(unsupported.length, 0, `${name}() is listed as implemented and reported itself unsupported`);
      assert.notEqual(value, UNSUPPORTED, `${name}() is listed as implemented and produced nothing`);
      evaluated.push(name);
    } else {
      assert.equal(value, UNSUPPORTED, `${name}() is not implemented and produced a value anyway`);
      assert.equal(unsupported.length, 1, `${name}() is not implemented and was not reported`);
      assert.match(unsupported[0].reason, /measured language/, `${name}()'s report does not say it is in the seed`);
      reported.push(name);
    }
  }
  assert.ok(evaluated.length >= 25, `only ${evaluated.length} of the seed evaluate`);
  assert.ok(reported.length > 0, 'a seed with nothing left to implement is a seed nobody measured');
});

test('a function outside the seed is reported as not part of the language at all', () => {
  const unsupported = [];
  const context = { record: VAULT[0], formulas: {}, this: null, unsupported, where: 'x', pathPrefix: 'docs' };
  assert.equal(evaluate(parseExpression('teleport(1)'), context), UNSUPPORTED);
  assert.match(unsupported[0].reason, /not part of the language/);
});

test('no path returns an empty list without a report beside it', () => {
  // The rule this whole feature is written against: an empty view and a broken
  // view look identical on screen and only one of them is a bug.
  for (const filter of ['map(type)', 'this.file.name == "x"', 'formula.nope', 'teleport()']) {
    const { names, unsupported } = select(filter);
    assert.deepEqual(names, [], `${filter} selected something`);
    assert.ok(unsupported.length > 0, `${filter} selected nothing and said nothing`);
  }
});

test('an expression that will not parse is reported with where it broke', () => {
  const unsupported = [];
  compileFilter('status == ', 'source.filter', unsupported);
  assert.equal(unsupported.length, 1);
  assert.match(unsupported[0].reason, /character \d+/);
});

// ---- sort and groupBy ----

function queryView(source, extra = {}) {
  const { description, refusals } = parseDescription({
    version: DESCRIPTION_VERSION,
    id: 'q',
    label: 'A query',
    source: { kind: 'query', ...source },
    band: { rows: [{ when: {}, band: 'mid' }] },
    face: { default: { title: 'title', measure: 'none' }, byType: {} },
    surfaces: ['list'],
    verbs: 'registry',
    ...extra,
  });
  assert.deepEqual(refusals, []);
  return description;
}

test('sort by a property with a direction produces the order that was asked for', () => {
  const up = runQuery(queryView({ filter: 'type == link("Chapter")', sort: [{ property: 'number' }] }), { records: VAULT, pathPrefix: 'docs' });
  assert.deepEqual(up.groups[0].cards.map((c) => c.title), ['Chapter 1', 'Chapter 2', 'Rest']);
  const down = runQuery(
    queryView({ filter: 'type == link("Chapter")', sort: [{ property: 'number', direction: 'desc' }] }),
    { records: VAULT, pathPrefix: 'docs' },
  );
  // Nothing sorts LAST whichever way round it was asked for: `Rest` has no
  // number, and a note with no due date is not the most urgent one.
  assert.deepEqual(down.groups[0].cards.map((c) => c.title), ['Chapter 2', 'Chapter 1', 'Rest']);
});

test('groupBy a property produces the groups the description asked for', () => {
  const result = runQuery(queryView({ filter: 'type == link("Task")', groupBy: 'status' }), { records: VAULT, pathPrefix: 'docs' });
  assert.deepEqual(
    result.groups.map((g) => [g.label, g.cards.length]),
    [
      ['cancelled', 1],
      ['done', 1],
      ['todo', 1],
    ],
  );
});

// ---- the navigator draws either kind ----

test('a query-sourced view draws through the same group model a mode-sourced one does', () => {
  const result = runQuery(queryView({ filter: 'type == link("Chapter")' }), { records: VAULT, pathPrefix: 'docs' });
  const faces = projectOsProvider.views(WORKSPACE)[0].face;
  const rows = rowsFor({ groups: result.groups, faces, folds: {}, onDesk: new Set(), currentNoteId: null });
  // One heading and its cards, exactly as the sidecar's groups draw.
  assert.equal(rows.filter((r) => r.kind === 'group').length, 1);
  assert.equal(rows.filter((r) => r.kind === 'card').length, 3);
  assert.equal(rows[0].count, 3, 'the heading counts what is under it');
});

test('what is owed is at the top of a query-sourced view, read from the sidecar', () => {
  const marks = new Map([
    ['Chapter 1', { owed: true, owedVerb: 'Approve', suppressed: false }],
    ['Chapter 2', { owed: false, owedVerb: null, suppressed: true }],
  ]);
  const result = runQuery(queryView({ filter: 'type == link("Chapter")' }), { records: VAULT, pathPrefix: 'docs' }, { marks });
  assert.deepEqual(result.groups.map((g) => g.key), ['needs-you', 'all', 'quiet']);
  assert.equal(result.groups[0].cards[0].title, 'Chapter 1');
  assert.equal(result.groups[0].cards[0].owedVerb, 'Approve', 'the verb is the sidecar\'s, not invented');
  assert.equal(result.groups[0].needsHuman, true);
  assert.equal(result.groups[2].suppressed, true, 'finished work arrives folded');
  assert.equal(result.untracked, false);
});

test('a view the sidecar does not track has NO owed group, and says so', () => {
  // A view of a vault's chapters owes nothing because project-os does not
  // track chapters, which is a different thing from a view that owes nothing
  // today. Drawing an empty "Needs you" heading would confuse the two.
  const result = runQuery(queryView({ filter: 'type == link("Chapter")' }), { records: VAULT, pathPrefix: 'docs' });
  assert.equal(result.untracked, true);
  assert.ok(!result.groups.some((g) => g.key === 'needs-you'));
});

test('a query over this repository selects what a person would expect', () => {
  const records = walkNotes(path.join(REPO, 'docs')).records;
  const issues = runQuery(queryView({ filter: 'type == link("issue")' }), { records: records, pathPrefix: 'docs' });
  const counted = issues.groups.reduce((n, g) => n + g.cards.length, 0);
  assert.ok(counted > 15, `a query over the real index found ${counted} issues`);
  const fixed = runQuery(queryView({ filter: { and: ['type == link("issue")', 'status == "fixed"'] } }), { records: records, pathPrefix: 'docs' });
  const fixedCount = fixed.groups.reduce((n, g) => n + g.cards.length, 0);
  assert.ok(fixedCount > 0 && fixedCount < counted, `${fixedCount} fixed of ${counted}`);
  // A card from Deck's index carries its record, so a face can read a property
  // by name — which is what makes a vault's own fields drawable.
  assert.notEqual(fixed.groups[0].cards[0].frontmatter, null);
});

test('a card built from a record carries what the navigator needs', () => {
  const card = toCard(VAULT[0], new Map());
  assert.equal(card.noteId, 'Ada');
  assert.equal(card.noteType, '@character');
  assert.equal(card.rel, 'Comic/Ada.md');
  assert.equal(card.frontmatter.portrait, '[[ada.png]]');
});

test('matches() never lets an unsupported construct select a note', () => {
  const unsupported = [];
  const context = { record: VAULT[0], formulas: {}, this: null, unsupported, where: 'x', pathPrefix: 'docs' };
  assert.equal(matches(parseExpression('map(type)'), context), false);
  assert.ok(unsupported.length > 0);
});

// ---- four paths that used to select the wrong notes (ISS-0027) ----

test('contains on a STRING is a substring test, not equality', () => {
  const notes = index([
    ['a.md', { type: 'Task', title: 'Draft One', tags: ['red', 'blue'] }],
    ['b.md', { type: 'Task', title: 'Final', tags: ['green'] }],
  ]);
  // The wrong answer, confidently: `title.contains("Draft")` was false over
  // `title: "Draft One"`, because every receiver was treated as a list and a
  // string became a one-element list.
  assert.deepEqual(select('title.contains("Draft")', notes).names, ['a']);
  assert.deepEqual(select('title.contains("Nothing")', notes).names, []);
  // Membership still works for a list, which is the other half of `contains`.
  assert.deepEqual(select('tags.contains("blue")', notes).names, ['a']);
  assert.deepEqual(select('tags.containsAny("green", "pink")', notes).names, ['b']);
  assert.deepEqual(select('tags.containsAll("red", "blue")', notes).names, ['a']);
  // And a link still compares as its target, so the type filters are unmoved.
  assert.deepEqual(select('type.contains(link("Task"))', notes).names, ['a', 'b']);
});

test('hasLink asks about its RECEIVER, not about the whole note', () => {
  const notes = index([
    ['a.md', { type: 'Task', owner: '[[Ann]]', related: '[[Zed]]' }],
    ['b.md', { type: 'Task', owner: '[[Zed]]' }],
  ]);
  // It used to search the whole record whatever the receiver was, so this
  // matched `a` — whose owner is Ann — because some OTHER field held Zed.
  assert.deepEqual(select('owner.hasLink(link("Zed"))', notes).names, ['b']);
  assert.deepEqual(select('related.hasLink(link("Zed"))', notes).names, ['a']);
  // `file.hasLink` is the one that asks about the whole note, which is what
  // the cockpit's own CONTEXT.base uses.
  assert.deepEqual(select('file.hasLink(link("Zed"))', notes).names, ['a', 'b']);
});

test('equality is case-SENSITIVE, as Obsidian\'s is', () => {
  const notes = index([
    ['a.md', { type: 'Task', status: 'done' }],
    ['b.md', { type: 'Task', status: 'Done' }],
  ]);
  assert.deepEqual(select('status == "done"', notes).names, ['a']);
  assert.deepEqual(select('status == "Done"', notes).names, ['b']);
  // The three type spellings still agree, because they agree by the wikilink
  // being reduced to its target and never by case.
  const one = select('type.contains(link("Task"))', notes).names;
  assert.deepEqual(one, select('type == link("Task")', notes).names);
  assert.deepEqual(one, select('note.type == "[[Task]]"', notes).names);
});

test('file.path is what Obsidian would call it, so a base file\'s inFolder matches', () => {
  // ISS-0027. A record's path is relative to the DOCS root; a base file is
  // written against the vault, whose root is the repository. The cockpit's own
  // NAVIGATION.base says `file.inFolder("docs/__templates__")`, which never
  // matched — so its "Features (All)" view selected fourteen notes here where
  // the cockpit shows thirteen.
  const records = walkNotes(path.join(REPO, 'docs')).records;
  const nav = fromBaseFile(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'bases', 'cockpit-navigation.base'), 'utf-8'), 'nav');
  const features = nav.views.find((v) => v.name === 'Features (All)');
  const counted = (pathPrefix) =>
    runQuery(features.description, { records, pathPrefix }).groups.reduce((n, g) => n + g.cards.length, 0);

  const withPrefix = counted('docs');
  const without = counted('');
  assert.equal(withPrefix, without - 1, 'the template note is not being excluded');
  assert.ok(withPrefix > 5, `only ${withPrefix} features were selected`);
  // Named, so the check says which note the prefix removes.
  const names = runQuery(features.description, { records, pathPrefix: '' })
    .groups.flatMap((g) => g.cards.map((c) => c.rel))
    .filter((rel) => rel.startsWith('__templates__/'));
  assert.deepEqual(names, ['__templates__/feature.md']);
});

test("the cockpit's own base file draws what the cockpit draws", () => {
  const records = walkNotes(path.join(REPO, 'docs')).records;
  const nav = fromBaseFile(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'bases', 'cockpit-navigation.base'), 'utf-8'), 'nav');
  const counts = {};
  for (const view of nav.views) {
    const result = runQuery(view.description, { records: records, pathPrefix: 'docs' }, { pathPrefix: 'docs' });
    counts[view.name] = result.groups.reduce((n, g) => n + g.cards.length, 0);
    assert.deepEqual(result.unsupported, [], `${view.name} could not be evaluated: ${JSON.stringify(result.unsupported)}`);
  }
  // Read off this repository's own snapshot: fifteen features and four
  // phases. If a feature or a phase is added, this fails and says so, which is
  // the right way round for a check about agreeing with another program.
  assert.equal(counts['Features (All)'], 15);
  assert.equal(counts['Phases (All)'], 4);
  assert.ok(counts['Features (Open)'] <= counts['Features (All)']);
});

test('a formula with an empty body is reported as an EMPTY EXPRESSION, not as nothing', () => {
  // `Daily Tasks Base.base` declares `formulas: { Untitled: "" }`, and
  // reporting an empty string as the construct told a person nothing at all.
  const view = queryView({ filter: 'type == link("Task")', formulas: { Untitled: '' } });
  const result = runQuery(view, { records: VAULT, pathPrefix: 'docs' });
  const report = result.unsupported.find((u) => u.where === 'source.formulas.Untitled');
  assert.notEqual(report, undefined);
  assert.ok(report.construct.trim().length > 0, 'the report named nothing');
});

test('file.hasLink says it can only see the frontmatter', () => {
  // ISS-0033. A record carries no body — TASK-0038 decided that, because 1537
  // notes with their bodies is a different memory question from 1537 records —
  // and the cockpit builds its backlink graph from frontmatter AND body. So
  // Deck answers a strictly smaller question, and answering it in silence is
  // the failure this evaluator is written against.
  const notes = index([
    ['a.md', { type: 'Task', related: '[[Zed]]' }],
    ['b.md', { type: 'Task' }],
  ]);
  const { names, unsupported } = select('file.hasLink(link("Zed"))', notes);
  assert.deepEqual(names, ['a'], 'the frontmatter answer is still given');
  const report = unsupported.find((u) => u.construct === 'file.hasLink()');
  assert.notEqual(report, undefined, 'the limitation was not reported');
  assert.match(report.reason, /prose|body/i, 'the report does not say what is not seen');

  // A field's own `hasLink` is complete and reports nothing: the frontmatter is
  // all there is to a field.
  const field = select('related.hasLink(link("Zed"))', notes);
  assert.deepEqual(field.names, ['a']);
  assert.deepEqual(field.unsupported, []);
});
