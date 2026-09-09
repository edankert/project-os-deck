// TST-0030 — a description parses, or says by name what it could not read
// (TASK-0041, TASK-0042, TASK-0046).
//
// A parser that DEFAULTS is the defect this whole feature is written against:
// the cockpit's silent fallback for an unknown navigation mode made the Tests
// view look broken for thirty-three hours. Every check here is either "this
// parses" or "this is refused, by name".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const { parseDescription, DESCRIPTION_VERSION, READABLE_VERSIONS, EXTENSION_PREFIX } = load('shared/description.js');
const { projectOsProvider, sourceOf } = load('shared/views.js');
const { fromBaseFile } = load('shared/base-file.js');

const WORKSPACE = { id: 'aaaa1111', root: '/repo', name: 'a repo', kind: 'project-os' };
const BASES = path.join(desktopRoot, 'fixtures', 'bases');

/** A description with every section filled, to vary one thing at a time. */
function valid(extra = {}) {
  return {
    version: DESCRIPTION_VERSION,
    id: 'issues',
    label: 'Issues',
    source: { kind: 'mode', mode: 'issues' },
    band: { rows: [{ when: { owed: true }, band: 'front' }, { when: {}, band: 'mid' }], gathersOwed: true },
    face: { default: { title: 'title', measure: 'none' }, byType: {} },
    surfaces: ['list', 'spread'],
    verbs: 'registry',
    ...extra,
  };
}

// ---- the shape ----

test('a description has five sections, and each one comes back read', () => {
  const { description, refusals } = parseDescription(valid());
  assert.deepEqual(refusals, []);
  assert.equal(description.source.kind, 'mode');
  assert.equal(description.source.mode, 'issues');
  assert.equal(description.band.rows.length, 2);
  assert.equal(description.band.gathersOwed, true);
  assert.equal(description.face.default.title, 'title');
  assert.deepEqual(description.surfaces, ['list', 'spread']);
  assert.equal(description.verbs, 'registry');
});

test('a section that is missing is refused BY NAME, never defaulted', () => {
  for (const section of ['source', 'band', 'face', 'surfaces', 'verbs']) {
    const doc = valid();
    delete doc[section];
    const { refusals } = parseDescription(doc);
    const named = refusals.find((r) => r.where === section);
    assert.notEqual(named, undefined, `a description with no ${section} was accepted`);
    assert.match(named.reason, new RegExp(section));
  }
});

test('a source is mode or query, and a third kind is refused by name', () => {
  const { description } = parseDescription(
    valid({ source: { kind: 'query', filter: 'status == "open"', sort: [{ property: 'due' }] } }),
  );
  assert.equal(description.source.kind, 'query');
  assert.deepEqual(description.source.sort, [{ property: 'due', direction: 'asc' }]);

  const { description: none, refusals } = parseDescription(valid({ source: { kind: 'sql', query: 'select *' } }));
  assert.equal(none, null);
  const named = refusals.find((r) => r.where === 'source.kind');
  assert.notEqual(named, undefined);
  assert.match(named.reason, /mode/);
  assert.match(named.reason, /query/);
});

test('verbs is the word "registry", and a restated verb list names REQ-0026', () => {
  const { refusals } = parseDescription(valid({ verbs: ['approve', 'reject', 'defer'] }));
  const named = refusals.find((r) => r.where === 'verbs');
  assert.notEqual(named, undefined, 'a verb list was accepted');
  assert.match(named.reason, /REQ-0026/, 'the refusal does not say whose rule this is');
});

test('every description carries a version, and one this build cannot read is refused', () => {
  const doc = valid();
  delete doc.version;
  const missing = parseDescription(doc).refusals.find((r) => r.where === 'version');
  assert.notEqual(missing, undefined);
  assert.match(missing.reason, new RegExp(READABLE_VERSIONS.join('|')));

  const future = parseDescription(valid({ version: '9' })).refusals.find((r) => r.where === 'version');
  assert.notEqual(future, undefined);
  assert.match(future.reason, /9/, 'the refusal does not say which version it read');
  assert.match(future.reason, new RegExp(READABLE_VERSIONS.join('|')), 'nor which ones it can read');
});

test("a key outside the language is Deck's only under Deck's prefix", () => {
  const { description, refusals } = parseDescription(valid({ [`${EXTENSION_PREFIX}stats`]: true }));
  assert.deepEqual(refusals, []);
  assert.equal(description.extensions[`${EXTENSION_PREFIX}stats`], true);

  const bare = parseDescription(valid({ stats: true }));
  const named = bare.refusals.find((r) => r.where === 'stats');
  assert.notEqual(named, undefined, 'a bare unknown key was accepted');
  assert.match(named.reason, new RegExp(`${EXTENSION_PREFIX}stats`), 'the refusal does not say how to write it');
});

test('several unreadable things are ALL reported, not the first one thrown', () => {
  const doc = valid({ verbs: ['approve'], version: '9', surfaces: ['orbit'], nonsense: 1 });
  delete doc.band;
  const { refusals } = parseDescription(doc);
  const where = refusals.map((r) => r.where).sort();
  assert.deepEqual(where, ['band', 'nonsense', 'surfaces[0]', 'verbs', 'version']);
  for (const refusal of refusals) {
    assert.ok(refusal.construct.length > 0, 'a refusal names the construct');
    assert.ok(refusal.reason.length > 10, 'and says what to do about it');
  }
});

test('a surface nothing draws is refused, from the same vocabulary the address reads', () => {
  const { refusals } = parseDescription(valid({ surfaces: ['list', 'glass'] }));
  const named = refusals.find((r) => r.where === 'surfaces[1]');
  assert.notEqual(named, undefined, 'a surface Deck does not draw was accepted');
  assert.match(named.reason, /glass/);
});

// ---- the seven ----

test('the seven views the provider emits are seven descriptions with no refusals', () => {
  const views = projectOsProvider.views(WORKSPACE);
  assert.equal(views.length, 7);
  for (const view of views) {
    const { description, refusals } = parseDescription(view);
    assert.deepEqual(refusals, [], `${view.id} was refused: ${JSON.stringify(refusals)}`);
    assert.notEqual(description, null);
    assert.equal(description.version, DESCRIPTION_VERSION);
    assert.equal(description.verbs, 'registry');
  }
});

test('each of the seven names list and spread, and does NOT name glass', () => {
  for (const view of projectOsProvider.views(WORKSPACE)) {
    assert.deepEqual(view.surfaces, ['list', 'spread'], `${view.id} draws on the wrong surfaces`);
  }
});

test('six of the seven are mode-sourced, and Overview is the one the shape cannot carry', () => {
  const views = projectOsProvider.views(WORKSPACE);
  const modes = views.filter((v) => v.source.kind === 'mode');
  assert.equal(modes.length, 6);
  // Overview is a page of statistics, not a view of notes, and `source` has
  // two kinds and both select notes. The extension namespace is what the
  // language has for exactly this, and the renderer reads it there.
  const overview = views.find((v) => v.id === 'overview');
  assert.equal(overview.extensions['deck:stats'], true);
  assert.deepEqual(sourceOf(overview), { kind: 'stats' });
  assert.deepEqual(sourceOf(views.find((v) => v.id === 'issues')), { kind: 'nav', mode: 'issues' });
});

test('the three views that gather their own obligations say so in their band table', () => {
  const views = projectOsProvider.views(WORKSPACE);
  const gathering = views.filter((v) => v.band.gathersOwed).map((v) => v.id);
  // The cockpit's own `_VIEWS_THAT_ALREADY_GATHER`. A ROW rather than a
  // fallback: a table that simply found no Needs-you group and shrugged could
  // not tell that apart from a view whose obligations are missing.
  assert.deepEqual(gathering.sort(), ['issues', 'publication', 'tests']);
  for (const view of views) {
    const owedRow = view.band.rows.find((r) => r.when.owed === true);
    assert.notEqual(owedRow, undefined, `${view.id} has no row for what is owed`);
    assert.ok(owedRow.note.length > 20, `${view.id}'s owed row does not say what it means`);
  }
});

// ---- base files ----

test('every base file Edwin has written reads as a description', () => {
  const files = fs.readdirSync(BASES).filter((f) => f.endsWith('.base'));
  assert.ok(files.length >= 12, `only ${files.length} base fixtures; twelve were measured`);
  for (const file of files) {
    const result = fromBaseFile(fs.readFileSync(path.join(BASES, file), 'utf-8'), file.replace(/\.base$/, ''));
    assert.ok(result.views.length > 0, `${file} produced no view at all`);
    for (const view of result.views) {
      assert.notEqual(view.description, null, `${file}: ${view.name} produced no description`);
      assert.equal(view.description.verbs, 'registry');
      assert.equal(view.description.source.kind, 'query');
    }
    // Every unsupported construct is NAMED. None is a generic failure.
    for (const refusal of [...result.refusals, ...result.views.flatMap((v) => v.refusals)]) {
      assert.ok(refusal.construct.length > 0, `${file} reported a construct with no name`);
      assert.ok(refusal.where.length > 0, `${file} reported ${refusal.construct} with no location`);
      assert.ok(refusal.reason.length > 15, `${file} reported ${refusal.construct} with no reason`);
      assert.doesNotMatch(refusal.reason, /^(error|failed|invalid)$/i, 'a generic failure is not a report');
    }
  }
});

test("the TaskNotes plugin's own view types are named, and do not stop the file", () => {
  const text = fs.readFileSync(path.join(BASES, 'tasknotes-kanban-default.base'), 'utf-8');
  const result = fromBaseFile(text, 'tasknotes-kanban-default');
  const named = [...result.refusals, ...result.views.flatMap((v) => v.refusals)];
  // This is the honest test of the extension namespace: a plugin's view types
  // and keys are somebody else's, exactly as Deck's own extension keys will be
  // to Obsidian. They come back named, and the rest of the file still parses.
  assert.ok(
    named.some((r) => /view type/i.test(r.construct) || /view type/i.test(r.reason)),
    `no view type was reported: ${JSON.stringify(named.map((r) => r.construct))}`,
  );
  assert.ok(result.views.length > 0, 'the whole file was thrown away over a plugin key');
});

test('the four Comic card views name the picture the file names', () => {
  const result = fromBaseFile(fs.readFileSync(path.join(BASES, 'comic-novel.base'), 'utf-8'), 'comic-novel');
  const images = Object.fromEntries(result.views.map((v) => [v.name, v.description?.face.default.image]));
  assert.deepEqual(images, {
    Characters: 'note.portrait',
    Chapters: 'note.cover',
    Locations: 'note.scene',
    Pages: 'note.image',
  });
});

test("the sidebar base's or-of-and filter parses", () => {
  const result = fromBaseFile(fs.readFileSync(path.join(BASES, 'comic-sidebar.base'), 'utf-8'), 'comic-sidebar');
  const details = result.views.find((v) => v.name.startsWith('Details'));
  assert.notEqual(details, undefined);
  const filter = details.description.source.filter;
  assert.ok(Array.isArray(filter.or), 'the or was not read as an or');
  assert.equal(filter.or.length, 3);
  for (const branch of filter.or) assert.equal(branch.and.length, 2, 'an and inside the or was flattened');
});

test('nothing in this suite writes to a base file', () => {
  // PHASE-0001 puts writing any file Obsidian owns out of scope, and the
  // reader is a reader. Asserted by the file times, which a read cannot move.
  const before = fs.readdirSync(BASES).map((f) => [f, fs.statSync(path.join(BASES, f)).mtimeMs]);
  for (const [file] of before) fromBaseFile(fs.readFileSync(path.join(BASES, file), 'utf-8'), file);
  for (const [file, at] of before) assert.equal(fs.statSync(path.join(BASES, file)).mtimeMs, at, `${file} was written`);
});
