// TST-0046 — the whole link graph from Deck's own index: every link with the
// offset that lets its callout quote the sentence, resolved the way the
// cockpit's index resolves it (TASK-0001).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { desktopRoot, load } from './helpers.mjs';

const { linksIn, Resolver, buildGraph, sentenceAt, frontmatterLength, LINK_BEARING_FIELDS } = load('shared/graph.js');
const { walkNotes } = load('main/note-index.js');
const { bandFor } = load('shared/statuses.js');

function source(relPath, text, extra = {}) {
  const fileName = path.basename(relPath, '.md');
  const id = extra.id ?? fileName;
  return {
    relPath,
    fileName,
    id,
    hasId: extra.hasId ?? true,
    title: extra.title ?? null,
    aliases: extra.aliases ?? [],
    types: extra.types ?? ['issue'],
    status: extra.status ?? 'open',
    frontmatter: extra.frontmatter ?? {},
    text,
  };
}

test('a link is [[target]] or [[target|shown]], and its offset is where it starts', () => {
  const text = 'See [[ISS-0001]] and [[FEAT-0002|the shell]], not ![[picture.png]].';
  const links = linksIn(text);
  assert.deepEqual(links.map((l) => l.target), ['ISS-0001', 'FEAT-0002']);
  assert.equal(text.slice(links[0].offset, links[0].offset + 2), '[[');
  assert.equal(text.slice(links[1].offset, links[1].offset + 13), '[[FEAT-0002|t');
});

test('a bare id counts only in a frontmatter key meant to point at notes', () => {
  const text = '---\nid: ISS-0009\nparent: FEAT-0002\nrelated: ["[[TASK-0001]]", TASK-0002]\nsummary: supersedes FEAT-0003\n---\n# Body mentions FEAT-0004 bare\n';
  const targets = linksIn(text).map((l) => l.target);
  assert.deepEqual(targets.sort(), ['FEAT-0002', 'TASK-0001', 'TASK-0002'].sort());
  assert.ok(LINK_BEARING_FIELDS.has('related') && !LINK_BEARING_FIELDS.has('summary'));
  const parent = linksIn(text).find((l) => l.target === 'FEAT-0002');
  assert.equal(text.slice(parent.offset, parent.offset + 9), 'FEAT-0002');
  assert.equal(frontmatterLength(text), text.indexOf('# Body'), 'the frontmatter ends where the body begins');
});

test('a link carries the frontmatter key it was written under, and a link in the text carries none', () => {
  // The key is the only place a note says what a link MEANS (FEAT-0020,
  // DES-0003): it is recorded as written and never guessed from prose.
  const text = [
    '---',
    'id: TASK-0009',
    'parent: "[[FEAT-0002-The-Shell]]"',
    'tests: ["[[TST-0001]]", "[[TST-0002]]"]',
    'related:',
    '  - "[[ISS-0003]]"',
    '  - ISS-0004',
    'depends: FEAT-0005',
    'summary: "see [[ISS-0006]], the parent of nothing"',
    '---',
    '# Body',
    'The parent of this task is [[FEAT-0002-The-Shell]], and it tests [[TST-0001]].',
    '',
  ].join('\n');
  const fields = (target) => linksIn(text).filter((l) => l.target === target).map((l) => l.field);
  assert.deepEqual(fields('FEAT-0002-The-Shell'), ['parent', null], 'the same note is linked once under parent and once in a sentence');
  assert.deepEqual(fields('TST-0001'), ['tests', null]);
  assert.deepEqual(fields('TST-0002'), ['tests']);
  // The items of a list belong to the key the list hangs from, wrapped or bare.
  assert.deepEqual(fields('ISS-0003'), ['related']);
  assert.deepEqual(fields('ISS-0004'), ['related']);
  assert.deepEqual(fields('FEAT-0005'), ['depends']);
  // A wikilink under a key that is not link-bearing is still a link, under that key.
  assert.deepEqual(fields('ISS-0006'), ['summary']);
  // Every link in the body has no field, whatever its sentence says.
  const bodyStart = text.indexOf('# Body');
  for (const link of linksIn(text)) assert.equal(link.field === null, link.offset >= bodyStart, `${link.target} at ${link.offset}`);
});

test('a list written at the margin, and a key with a space, give their links the key', () => {
  // Both are plain YAML: a list's items need no indent under their key, and a
  // key may hold a space. Read as no key, each was shown as a plain "link".
  const text = [
    '---',
    'id: FEAT-0001',
    'tasks:',
    '- "[[TASK-0001]]"',
    '- "[[TASK-0002]]"',
    'verified by: "[[TST-0001]]"',
    'related:',
    '- ISS-0004',
    '-',
    '  "[[ISS-0005]]"',
    'depends on:',
    '  - "[[FEAT-0002]]"',
    '# a comment at the margin ends the list above it',
    '- "[[ISS-0007]]"',
    'parent: "[[PHASE-0001]]"',
    '---',
    'A link in the text after such a list: [[ISS-0006]], and [[TASK-0001]] again.',
    '- "[[ISS-0008]]"',
    'verified by: "[[TST-0002]]"',
    '',
  ].join('\n');
  const links = linksIn(text);
  const fields = (target) => links.filter((l) => l.target === target).map((l) => l.field);
  assert.deepEqual(fields('TASK-0001'), ['tasks', null], 'the item at the margin has its list\'s key, and the same note in the text has none');
  assert.deepEqual(fields('TASK-0002'), ['tasks']);
  assert.deepEqual(fields('TST-0001'), ['verified by'], 'the key is given as it was written, space included');
  // A bare id in a list at the margin, under a key meant to point at notes.
  assert.deepEqual(fields('ISS-0004'), ['related']);
  assert.deepEqual(fields('ISS-0005'), ['related']);
  assert.deepEqual(fields('FEAT-0002'), ['depends on']);
  // Nothing is invented: an item that follows no key has none.
  assert.deepEqual(fields('ISS-0007'), [null]);
  // The key after a list at the margin is its own.
  assert.deepEqual(fields('PHASE-0001'), ['parent']);
  // The body is the body, whatever its lines look like.
  assert.deepEqual(fields('ISS-0006'), [null]);
  assert.deepEqual(fields('ISS-0008'), [null]);
  assert.deepEqual(fields('TST-0002'), [null]);
  const bodyStart = text.indexOf('A link in the text');
  for (const link of links) if (link.offset >= bodyStart) assert.equal(link.field, null, `${link.target} at ${link.offset}`);
  // A key with a space is its own key for a bare id too: `verified by` is not
  // one of the keys meant to point at notes, so its bare id is no link, and
  // it is not read as belonging to the key above it.
  const bare = linksIn('---\nrelated:\n- ISS-0001\nverified by: TST-0009\n---\n');
  assert.deepEqual(bare.map((l) => `${l.target}:${l.field}`), ['ISS-0001:related']);
  // The same file with Windows line ends.
  const crlf = linksIn('---\r\ntasks:\r\n- "[[TASK-0001]]"\r\nverified by: "[[TST-0001]]"\r\n---\r\nbody [[ISS-0001]]\r\n');
  assert.deepEqual(crlf.map((l) => `${l.target}:${l.field}`), ['TASK-0001:tasks', 'TST-0001:verified by', 'ISS-0001:null']);
});

test('an edge keeps the field of the link that made it', () => {
  const graph = buildGraph([
    source('TASK-0009.md', '---\nid: TASK-0009\nparent: "[[FEAT-0002]]"\ntests: ["[[TST-0001]]"]\n---\nSee [[FEAT-0002]] and [[ISS-0003]].\n', { id: 'TASK-0009' }),
    source('FEAT-0002.md', '---\nid: FEAT-0002\n---\n', { id: 'FEAT-0002' }),
    source('TST-0001.md', '---\nid: TST-0001\n---\n', { id: 'TST-0001' }),
    source('ISS-0003.md', '---\nid: ISS-0003\n---\n', { id: 'ISS-0003' }),
  ]);
  const made = graph.edges.filter((e) => e.source === 'TASK-0009').map((e) => `${e.target}:${e.field}`);
  assert.deepEqual(made.sort(), ['FEAT-0002:null', 'FEAT-0002:parent', 'ISS-0003:null', 'TST-0001:tests']);
});

test('a target resolves by id, then alias, then file name, then title, then the id in a drifted slug', () => {
  const r = new Resolver([
    source('a/FEAT-0085-BleReliabilityLayer.md', '', { id: 'FEAT-0085', aliases: ['Ble'], title: 'The BLE layer' }),
    source('b/Ble.md', '', { id: 'Ble', hasId: false }),
    source('c/Title.md', '', { id: 'NOTE-X', title: 'FEAT-0085' }),
  ]);
  assert.equal(r.resolve('FEAT-0085'), 'a/FEAT-0085-BleReliabilityLayer.md', 'the id table first');
  assert.equal(r.resolve('Ble'), 'a/FEAT-0085-BleReliabilityLayer.md', 'an alias before a file name');
  assert.equal(r.resolve('The BLE layer'), 'a/FEAT-0085-BleReliabilityLayer.md');
  assert.equal(r.resolve('FEAT-0085-BleHardening'), 'a/FEAT-0085-BleReliabilityLayer.md', 'a drifted slug still reaches the id');
  assert.equal(r.resolve('Nothing'), null);
  // One note's id and another's alias: the id wins.
  const both = new Resolver([
    source('x/Other.md', '', { id: 'OTHER-0001', aliases: ['ISS-0007'] }),
    source('y/ISS-0007.md', '', { id: 'ISS-0007' }),
  ]);
  assert.equal(both.resolve('ISS-0007'), 'y/ISS-0007.md', 'an alias outranked an id');
});

test('self-links and templates are no edge, a dangling link is kept, and a cross-repository one says so', () => {
  const graph = buildGraph([
    source('issues/ISS-0001.md', 'Me [[ISS-0001]], you [[ISS-0002]], [[ISS-0002]] again, [[GONE-0001]], [[project-os-cockpit#ISS-0023]], [[T]].'),
    source('issues/ISS-0002.md', '[[ISS-0001]]', { status: 'fixed' }),
    source('__templates__/T.md', '[[ISS-0001]]'),
  ]);
  assert.deepEqual(graph.nodes.map((n) => n.id).sort(), ['ISS-0001', 'ISS-0002'], 'a template is not a node');
  const from1 = graph.edges.filter((e) => e.source === 'ISS-0001');
  assert.equal(from1.filter((e) => e.target === 'ISS-0002').length, 2, 'each mention is its own edge, with its own sentence');
  assert.equal(from1.some((e) => e.target === 'ISS-0001'), false, 'a self-link is not an edge');
  const gone = from1.find((e) => e.wrote === 'GONE-0001');
  assert.deepEqual([gone.resolved, gone.target, gone.crossRepo], [false, null, false], 'a dangling link is a finding, kept');
  assert.equal(from1.find((e) => e.wrote.startsWith('project-os-cockpit#')).crossRepo, true);
  assert.equal(from1.some((e) => e.wrote === 'T'), false, 'a link to a template is no edge');
  const inbound = Object.fromEntries(graph.nodes.map((n) => [n.id, n.inbound]));
  assert.deepEqual(inbound, { 'ISS-0001': 1, 'ISS-0002': 1 }, 'inbound counts distinct notes, not mentions');
  assert.equal(graph.nodes.find((n) => n.id === 'ISS-0002').band, bandFor('fixed'));
});

test('an id claimed by two notes keys each of them by its path', () => {
  const graph = buildGraph([
    source('a/plan/PLAN.md', '[[ISS-0001]]', { id: 'PLAN', hasId: false }),
    source('b/plan/PLAN.md', '[[ISS-0001]]', { id: 'PLAN', hasId: false }),
    source('issues/ISS-0001.md', ''),
  ]);
  assert.deepEqual(graph.nodes.map((n) => n.id).sort(), ['ISS-0001', 'a/plan/PLAN', 'b/plan/PLAN']);
  assert.equal(graph.nodes.find((n) => n.id === 'ISS-0001').inbound, 2);
});

test('a note’s phase is the note its phase link resolves to, and a phase belongs to itself', () => {
  const graph = buildGraph([
    source('phases/PHASE-0001-Deck.md', '', { id: 'PHASE-0001', types: ['phase'] }),
    source('f/FEAT-0002.md', '', { types: ['feature'], frontmatter: { phase: '[[PHASE-0001-Deck]]' } }),
    source('f/FEAT-0003.md', '', { types: ['feature'], frontmatter: {} }),
  ]);
  const phase = Object.fromEntries(graph.nodes.map((n) => [n.id, n.phase]));
  assert.deepEqual(phase, { 'PHASE-0001': 'PHASE-0001', 'FEAT-0002': 'PHASE-0001', 'FEAT-0003': null });
});

test('the sentence a link sits in, from a paragraph and from a frontmatter line', () => {
  const text = '---\nparent: "[[FEAT-0002]]"\n---\nThe first sentence. This one links [[ISS-0009]] here. The last.\n- a list item with [[TASK-0001]] in it\n';
  const at = (target) => text.indexOf(`[[${target}]]`);
  assert.equal(sentenceAt(text, at('ISS-0009')), 'This one links [[ISS-0009]] here.');
  assert.equal(sentenceAt(text, at('TASK-0001')), 'a list item with [[TASK-0001]] in it');
  assert.equal(sentenceAt(text, at('FEAT-0002')), 'parent: "[[FEAT-0002]]"');
  assert.equal(sentenceAt(text, -1), '');
});

test('over this repository, every note is a node and its band is the one the reader shows for its status', () => {
  const docs = path.join(desktopRoot, '..', 'docs');
  const { records } = walkNotes(docs);
  const graph = buildGraph(
    records.map((r) => ({
      relPath: r.relPath,
      fileName: r.fileName,
      id: r.id,
      hasId: typeof r.frontmatter.id === 'string',
      title: r.title,
      aliases: r.aliases,
      types: r.types,
      status: r.status,
      frontmatter: r.frontmatter,
      text: fs.readFileSync(path.join(docs, r.relPath), 'utf-8'),
    })),
  );
  const notTemplates = records.filter((r) => !r.relPath.startsWith('__templates__/'));
  assert.equal(graph.nodes.length, notTemplates.length);
  assert.equal(new Set(graph.nodes.map((n) => n.id)).size, graph.nodes.length, 'two notes share a node');
  for (const node of graph.nodes) {
    const record = notTemplates.find((r) => r.relPath === node.rel);
    assert.equal(node.band, bandFor(record.status ?? ''), `${node.id}'s band is not its status's`);
  }
  // A plan with no id of its own is keyed by its path, not collapsed into "PLAN".
  assert.ok(graph.nodes.some((n) => n.id === 'features/glass-field/plan/PLAN'), 'the plans collapsed into one node');
  assert.ok(graph.edges.filter((e) => e.resolved).length > graph.nodes.length, 'this repository is dense with links');
  // The phase note of this phase is among the most linked-to.
  const phase = graph.nodes.find((n) => n.id === 'PHASE-0002');
  assert.ok(phase.inbound >= 10, `PHASE-0002 has ${phase.inbound} notes pointing at it`);
});
