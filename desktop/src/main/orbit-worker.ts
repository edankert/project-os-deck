/**
 * The orbit's layout, solved off the main process (TASK-0002).
 *
 * The first solve of a large workspace takes seconds: 2.6 s for Your
 * Trainer's 2,714 notes on 2026-09-10. In the main process that is seconds in
 * which no window's store action is answered, so it runs here, in a worker
 * thread, and the main process waits for the answer without blocking.
 */
import { parentPort } from 'node:worker_threads';
import { layoutOrbit } from '../shared/orbit.js';
import type { Graph } from '../shared/graph.js';
import type { OrbitLayout } from '../shared/orbit.js';

parentPort?.on('message', (message: { id: number; graph: Graph; previous: OrbitLayout | null }) => {
  try {
    const started = Date.now();
    const solved = layoutOrbit(message.graph, message.previous);
    parentPort?.postMessage({ id: message.id, ok: true, solved, ms: Date.now() - started });
  } catch (err) {
    parentPort?.postMessage({ id: message.id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
