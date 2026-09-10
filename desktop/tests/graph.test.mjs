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
