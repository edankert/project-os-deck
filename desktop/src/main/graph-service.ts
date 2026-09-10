/**
 * The orbit's data, served by Deck's own host (TASK-0001, TASK-0002).
 *
 * The graph is built from Deck's own index: the records it already keeps,
 * and each note's file read once more for its links, because a record carries
 * no body (TASK-0038 decided that for memory). It is kept per index revision,
 * so a second request in the same state of the workspace reads nothing.
 *
 * The layout is solved once and written to Deck's user data directory, one
 * file per workspace, so the orbit a person opens tomorrow is the one they
 * learned today. It is solved again from scratch only when the corpus has
 * changed materially; otherwise a new note is placed near its links and
 * nothing already placed moves.
 */
import fs from 'node:fs';
import path from 'node:path';
import { type Graph, type GraphSource, buildGraph, sentenceAt } from '../shared/graph.js';
import { type OrbitLayout, ORBIT_LAYOUT_VERSION, bridgesOf, layoutOrbit } from '../shared/orbit.js';
import type { IndexSnapshot } from './note-index.js';
import { readJsonFile, writeJsonFileAtomic } from './atomic-json.js';

interface Built {
  revision: number;
  graph: Graph;
  ms: number;
  texts: Map<string, string>;
}

export class GraphService {
  private readonly dir: string;
  private readonly built = new Map<string, Built>();
  private readonly layouts = new Map<string, { revision: number; layout: OrbitLayout; drift: number; solvedAgain: boolean; ms: number }>();

  constructor(dir: string) {
    this.dir = dir;
  }

  /** The graph for this state of the workspace, built at most once per index revision. */
  graphFor(snapshot: IndexSnapshot): Built {
    const known = this.built.get(snapshot.workspaceId);
    if (known !== undefined && known.revision === snapshot.revision) return known;
    const started = Date.now();
    const texts = new Map<string, string>();
    const sources: GraphSource[] = [];
    for (const record of snapshot.records) {
      let text = '';
      try {
        text = fs.readFileSync(path.join(snapshot.docsRoot, record.relPath), 'utf-8');
      } catch {
        // A file gone since the walk is a note with no links, not a failure.
      }
      texts.set(record.relPath, text);
      sources.push({
        relPath: record.relPath,
        fileName: record.fileName,
        id: record.id,
        hasId: typeof record.frontmatter['id'] === 'string' && (record.frontmatter['id'] as string).trim() !== '',
        title: record.title,
        aliases: record.aliases,
        types: record.types,
        status: record.status,
        frontmatter: record.frontmatter,
        text,
      });
    }
    const graph = buildGraph(sources);
    const out = { revision: snapshot.revision, graph, ms: Date.now() - started, texts };
    this.built.set(snapshot.workspaceId, out);
    return out;
  }

  private file(workspaceId: string): string {
    return path.join(this.dir, `deck-orbit-${workspaceId}.json`);
  }

  /** The layout, solved or read, and kept on disk. */
  layoutFor(snapshot: IndexSnapshot): { layout: OrbitLayout; drift: number; solvedAgain: boolean; ms: number } {
    const known = this.layouts.get(snapshot.workspaceId);
    if (known !== undefined && known.revision === snapshot.revision) return known;
    const { graph } = this.graphFor(snapshot);
    const stored = readJsonFile(this.file(snapshot.workspaceId)) as OrbitLayout | null;
    const previous = stored !== null && stored.version === ORBIT_LAYOUT_VERSION && typeof stored.places === 'object' ? stored : null;
    const started = Date.now();
    const solved = layoutOrbit(graph, previous);
    const same =
      previous !== null &&
      Object.keys(previous.places).length === Object.keys(solved.layout.places).length &&
      Object.entries(solved.layout.places).every(([id, p]) => previous.places[id]?.u === p.u && previous.places[id]?.v === p.v);
    if (!same) {
      try {
        writeJsonFileAtomic(this.file(snapshot.workspaceId), solved.layout);
      } catch {
        // A layout that cannot be kept is solved again next time; the orbit still draws.
      }
    }
    const out = { revision: snapshot.revision, ...solved, ms: Date.now() - started };
    this.layouts.set(snapshot.workspaceId, out);
    return out;
  }

  /** The sentence an edge's link sits in, for the callout. */
  sentence(snapshot: IndexSnapshot, sourceId: string, offset: number): string | null {
    const { texts, graph } = this.graphFor(snapshot);
    const node = graph.nodes.find((n) => n.id === sourceId);
    const text = node === undefined ? undefined : texts.get(node.rel);
    if (text === undefined) return null;
    return sentenceAt(text, offset);
  }

  /**
   * The answer to one of the three orbit reads, or undefined when the path is
   * not one of them. Null means "that workspace has no index", which the
   * host answers 404.
   */
  answer(pathname: string, search: URLSearchParams, snapshotFor: (id: string) => IndexSnapshot | null): unknown | undefined {
    const match = /^\/deck\/(graph|orbit)\/([a-z0-9]{4,64})(\/sentence)?$/.exec(pathname);
    if (match === null) return undefined;
    const [, what, workspaceId, sentence] = match as unknown as [string, string, string, string | undefined];
    const snapshot = snapshotFor(workspaceId);
    if (snapshot === null) return null;
    if (snapshot.building) return { workspaceId, building: true, revision: snapshot.revision };
    if (what === 'graph' && sentence !== undefined) {
      const text = this.sentence(snapshot, search.get('source') ?? '', Number(search.get('offset') ?? '-1'));
      return text === null ? null : { sentence: text };
    }
    if (what === 'graph') {
      const built = this.graphFor(snapshot);
      return { workspaceId, revision: built.revision, building: false, ms: built.ms, nodes: built.graph.nodes, edges: built.graph.edges };
    }
    const laid = this.layoutFor(snapshot);
    return {
      workspaceId,
      revision: snapshot.revision,
      building: false,
      ms: laid.ms,
      drift: laid.drift,
      solvedAgain: laid.solvedAgain,
      layout: laid.layout,
      bridges: bridgesOf(this.graphFor(snapshot).graph),
    };
  }
}
