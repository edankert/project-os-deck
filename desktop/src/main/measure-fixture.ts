/** Isolated fixture diagnostic through the production GlassField. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { screen, type BrowserWindow } from 'electron';
import type { MeasureContext } from './measure.js';
import { docsRootFor, walkNotes } from './note-index.js';

interface Adapter {
  fixture: { id: string; content_sha256: string; source_revision: string; source_tree_sha256: string | null };
  input: { groups: unknown[]; view: { id: string } | null; faces: unknown; pending: number };
  census: { selected: number; placed: number; omitted: number; ids: Record<string, string[]>; remainders: Record<string, number> };
}

interface MatchedFixture {
  manifest: { expected_selected: number; compatibility?: { parent_fixture_sha256: string; adapter_sha256: string;
    production_selected: number; production_placed: number; production_omitted: number } };
  notes: Array<{ key: string; rel_path: string; band: string; title: string; note_type: string;
    status: string; outgoing: string[]; body: string }>;
}

interface NativeTrace {
  schema_version: number; name: string; fixture_sha256: string; duration_ms: number; expected_actions: number;
  actions: Array<{ at_ms: number; action: string; key?: string }>;
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const js = <T>(win: BrowserWindow, code: string): Promise<T> => win.webContents.executeJavaScript(code) as Promise<T>;
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
async function awaitOsObservation<T>(win: BrowserWindow, observation: Promise<T>, durationMs: number): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  let onNavigation: () => void = () => {};
  const navigation = new Promise<never>((_, reject) => {
    onNavigation = () => reject(new Error('production OS observer navigated away from Glass'));
    win.webContents.on('did-start-navigation', onNavigation);
  });
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('production OS observer did not finish before its deadline')),
      // A dense OS trace can spend several seconds exporting final visual
      // checkpoints after its declared observation interval has elapsed.
      durationMs + 10000);
  });
  try { return await Promise.race([observation, navigation, timeout]); }
  finally {
    win.webContents.off('did-start-navigation', onNavigation);
    if (timer !== null) clearTimeout(timer);
  }
}
const quantile = (values: number[], fraction: number): number | null => values.length
  ? [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * fraction))] ?? null
  : null;

export async function runFixtureDiagnostic(ctx: MeasureContext, adapterPath: string, workspaceRoot: string,
  durationMs = 5000, sourceRoot = workspaceRoot, probeReader = false,
  tracePath: string | null = null, matchedFixturePath: string | null = null,
  artifactPath: string | null = null, captureVisual = false, observeOS = false,
  visualInputStride = 1): Promise<unknown> {
  if (!Number.isInteger(durationMs) || durationMs < 1000 || durationMs > 300000) throw new Error('fixture turn duration must be 1,000–300,000 ms');
  if ((tracePath === null) !== (matchedFixturePath === null)) throw new Error('fixture trace and matched fixture must be supplied together');
  if (captureVisual && tracePath === null) throw new Error('visual checkpoints need a fixture trace and matched fixture');
  if (observeOS && (tracePath === null || artifactPath === null)) {
    throw new Error('OS observation needs a matched fixture trace and output path');
  }
  if (!Number.isInteger(visualInputStride) || visualInputStride < 1 || visualInputStride > 1000
    || (visualInputStride !== 1 && (!captureVisual || !observeOS))) {
    throw new Error('visual input stride needs OS visual observation and must be 1–1,000');
  }
  const adapterBytes = fs.readFileSync(adapterPath);
  const adapter = JSON.parse(adapterBytes.toString('utf8')) as Adapter;
  if (!adapter.fixture?.content_sha256 || !adapter.input?.groups || !adapter.input?.view) throw new Error('malformed fixture adapter');
  const traceBytes = tracePath === null ? null : fs.readFileSync(tracePath);
  const matchedBytes = matchedFixturePath === null ? null : fs.readFileSync(matchedFixturePath);
  const trace = traceBytes === null ? null : JSON.parse(traceBytes.toString('utf8')) as NativeTrace;
  const matched = matchedBytes === null ? null : JSON.parse(matchedBytes.toString('utf8')) as MatchedFixture;
  const fixtureReachContexts = matched === null ? null : (() => {
    const byKey = new Map(matched.notes.map((note) => [note.key, note]));
    const incoming = new Map(matched.notes.map((note) => [note.key, [] as string[]]));
    for (const note of matched.notes) for (const target of new Set(note.outgoing)) {
      incoming.get(target)?.push(note.key);
    }
    const item = (key: string) => {
      const note = byKey.get(key)!;
      return { id: note.key, title: note.title, status: note.status, type: note.note_type,
        rel: note.rel_path, severity: null };
    };
    return Object.fromEntries(matched.notes.map((note) => [note.key, {
      active: { id: note.key, title: note.title },
      linked: [...new Set(note.outgoing)].filter((key) => byKey.has(key)).map(item),
      backlinks: (incoming.get(note.key) ?? []).map(item),
    }]));
  })();
  const capturePaths = trace === null || artifactPath === null ? null : {
    start: artifactPath.replace(/\.json$/, '') + '.start.png',
    end: artifactPath.replace(/\.json$/, '') + '.end.png',
  };
  const readyPath = observeOS && artifactPath !== null ? artifactPath.replace(/\.json$/, '') + '.ready.json' : null;
  if (readyPath !== null && fs.existsSync(readyPath)) throw new Error('OS observation ready marker already exists');
  if (capturePaths !== null && (fs.existsSync(capturePaths.start) || fs.existsSync(capturePaths.end))) {
    throw new Error('fixture trace capture output already exists');
  }
  if (trace !== null && matched !== null && traceBytes !== null && matchedBytes !== null) {
    const compatible = matched.manifest.compatibility;
    if (trace.schema_version !== 1 || typeof trace.name !== 'string' || trace.fixture_sha256 !== sha256(matchedBytes)
      || trace.expected_actions !== trace.actions.length || trace.duration_ms < 1000
      || (trace.actions.at(-1)?.at_ms ?? -1) < trace.duration_ms - 100) throw new Error('matched trace is incomplete or names a different fixture');
    if (!compatible || compatible.adapter_sha256 !== sha256(adapterBytes)
      || compatible.production_selected !== adapter.census.selected
      || compatible.production_placed !== adapter.census.placed
      || compatible.production_omitted !== adapter.census.omitted
      || matched.manifest.expected_selected !== adapter.census.placed
      || matched.notes.length !== adapter.census.placed) throw new Error('matched fixture does not describe this production deal');
    const placed = new Map(Object.entries(adapter.census.ids).flatMap(([band, ids]) => ids.map((id) => [id, band])));
    if (placed.size !== adapter.census.placed || matched.notes.some((note) => placed.get(note.key) !== note.band
      || typeof note.body !== 'string' || !Array.isArray(note.outgoing)
      || typeof note.rel_path !== 'string' || note.rel_path.startsWith('/')
      || note.rel_path.split('/').some((part) => part === '' || part === '.' || part === '..'))
      || trace.actions.some((action) => action.key !== undefined && !placed.has(action.key))) {
      throw new Error('matched fixture or trace uses an identity not placed in production Glass');
    }
  }
  const materializedPath = path.join(workspaceRoot, 'fixture-workspace.json');
  const materializedBytes = fs.existsSync(materializedPath) ? fs.readFileSync(materializedPath) : null;
  const materialized = materializedBytes === null ? null : JSON.parse(materializedBytes.toString('utf8')) as {
    fixture_sha256: string; fixture_content_sha256: string; note_count: number; source_tree_sha256: string;
  };
  if (materialized !== null) {
    if (matched === null || path.resolve(workspaceRoot) !== path.resolve(sourceRoot)
      || materialized.fixture_sha256 !== matched.manifest.compatibility?.parent_fixture_sha256
      || materialized.fixture_content_sha256 !== adapter.fixture.content_sha256
      || materialized.note_count !== adapter.census.selected) {
      throw new Error('materialized reader workspace does not match the production fixture');
    }
    const docsRoot = docsRootFor(workspaceRoot);
    if (matched.notes.some((note) => fs.readFileSync(path.join(docsRoot, note.rel_path), 'utf8') !== note.body)) {
      throw new Error('materialized reader body differs from the matched fixture');
    }
  }
  const expectedSourceTreeHash = adapter.fixture.source_tree_sha256 ?? materialized?.source_tree_sha256 ?? null;
  const repo = path.resolve(__dirname, '../../..');
  const protocolFile = path.join(repo, 'docs/features/native-glass-evaluation/plan/BENCHMARK.md');
  const mainBundle = path.join(__dirname, 'main.js');
  const diagnosticBundle = path.join(__dirname, 'measure-fixture.js');
  const glassBundle = path.join(__dirname, '../web/renderer/glass.js');
  const observerBundle = path.join(__dirname, '../web/renderer/fixture-trace.js');
  const git = (...args: string[]): Buffer => execFileSync('git', ['-C', repo, ...args], { maxBuffer: 64 * 1024 * 1024 });
  const provenance = {
    adapter_sha256: sha256(adapterBytes),
    trace_sha256: traceBytes === null ? null : sha256(traceBytes),
    matched_fixture_sha256: matchedBytes === null ? null : sha256(matchedBytes),
    materialized_workspace_sha256: materializedBytes === null ? null : sha256(materializedBytes),
    protocol_sha256: sha256(fs.readFileSync(protocolFile)),
    main_bundle_sha256: sha256(fs.readFileSync(mainBundle)),
    diagnostic_bundle_sha256: sha256(fs.readFileSync(diagnosticBundle)),
    glass_bundle_sha256: sha256(fs.readFileSync(glassBundle)),
    observer_bundle_sha256: sha256(fs.readFileSync(observerBundle)),
    source_commit: git('rev-parse', 'HEAD').toString().trim(),
    source_diff_sha256: sha256(git('diff', '--binary', 'HEAD')),
    electron: process.versions.electron, chromium: process.versions.chrome,
    machine: { platform: os.platform(), release: os.release(), cpus: os.cpus()[0]?.model ?? 'unknown', memory_bytes: os.totalmem() },
  };
  const sourceTreeHash = (): string | null => {
    if (expectedSourceTreeHash === null) return null;
    const docsRoot = docsRootFor(sourceRoot);
    const walked = walkNotes(docsRoot);
    if (walked.problems.length) throw new Error(`measurement source has ${walked.problems.length} unreadable note(s)`);
    const content = walked.records.map((record) => `${record.relPath}\0${sha256(fs.readFileSync(path.join(docsRoot, record.relPath)))}`).join('\n');
    return sha256(Buffer.from(content));
  };
  const sourceAtLaunch = sourceTreeHash();
  if (sourceAtLaunch !== expectedSourceTreeHash) throw new Error('measurement source tree differs from exported fixture');
  const added = ctx.addWorkspace(workspaceRoot);
  if (!added.ok || !added.id) throw new Error(`measurement host workspace refused: ${added.reason}`);
  const opened = await ctx.openWorkspace(added.id);
  if (!opened.ok) throw new Error(`measurement host workspace failed to open: ${opened.error}`);
  ctx.store.dispatch({ type: 'open-workspace', workspaceId: added.id });
  ctx.store.dispatch({ type: 'clear-desk', scope: 'workspace' });
  ctx.store.dispatch({ type: 'select-surface', surface: 'glass' });
  const win = ctx.createWindow('focus', `deck://${added.id}/issues`, null);
  win.setContentSize(1440, 900);
  try {
    await new Promise<void>((resolve) => win.webContents.once('did-finish-load', () => resolve()));
    await ctx.untilBooted(win);
    ctx.focusApp(win);
    for (let i = 0; i < 30 && !(await js<boolean>(win, 'document.hasFocus()')); i += 1) {
      await pause(100);
      if (i % 5 === 4) ctx.focusApp(win);
    }
    if (!(await js<boolean>(win, 'document.hasFocus()'))) throw new Error('fixture window could not gain focus');
    const input = JSON.stringify(adapter.input);
    const reachContexts = JSON.stringify(fixtureReachContexts);
    const actual = await js<{
      selected: number; bands: Record<string, number>; remainders: Record<string, number>;
      drawn: string[]; counts: unknown; width: number; height: number;
      yaw: number; zoom: { scale: number; dx: number; dy: number };
      card_fields: Array<{ key: string; id: string; title: string; mark: string; face: string; owed: string; more: string }> | null;
      slots: Array<{ key: string; band: string; theta: number; depth: number; y: number;
        row: number; column: number; layer: number }>;
      shapes: Record<string, { depth: number; columns: number; rows: number; width: number; height: number }>;
    }>(win, `(() => {
      const glass = window.__deckGlass;
      const fixtureInput = ${input};
      const fixtureContexts = ${reachContexts};
      if (fixtureContexts !== null) glass.setFixtureReachContexts(fixtureContexts);
      const productionUpdate = glass.update.bind(glass);
      // Store changes normally redraw from the host view. Pin the fixture at
      // that one production entrypoint so a lift, pull or reader open keeps
      // the measured field populated with the same exported notes.
      glass.update = () => productionUpdate(fixtureInput);
      glass.update(fixtureInput);
      const state = window.__deckGlass.bandState();
      return { selected: state.dealt, bands: state.counts, remainders: state.remainders,
        drawn: window.__deckGlass.drawnNotes(), counts: window.__deckGlass.counts(),
        yaw: glass.model.yaw, zoom: glass.zoom(),
        card_fields: ${captureVisual} ? glass.cardFieldInventory() : null,
        slots: [...glass.model.current.slots].map(([key, slot]) => ({ key, ...slot })),
        shapes: state.shapes,
        width: innerWidth, height: innerHeight };
    })()`);
    const placed = Object.values(actual.bands).reduce((sum, n) => sum + n, 0);
    const omitted = Object.values(actual.remainders).reduce((sum, n) => sum + n, 0);
    const censusMatches = actual.selected === adapter.census.selected && placed === adapter.census.placed
      && omitted === adapter.census.omitted && Object.entries(adapter.census.remainders).every(([band, n]) => actual.remainders[band] === n);
    if (!censusMatches) throw new Error(`production renderer census differs from adapter: ${JSON.stringify({ actual, expected: adapter.census })}`);
    // Let initial card transforms settle before taking the geometry reference.
    // This wait belongs only to the opt-in visual diagnostic, outside timing.
    if (captureVisual) await pause(1200);
    const initialVisual = captureVisual ? await js<unknown>(win, 'window.__deckVisualCheckpoint()') : null;
    const startCapture = capturePaths === null ? null : (await win.webContents.capturePage()).toPNG();
    if (startCapture !== null && capturePaths !== null) fs.writeFileSync(capturePaths.start, startCapture);
    const turn = trace === null ? await js<{ focused: boolean; visible: boolean; focusLost: boolean; visibilityLost: boolean;
      rawFrames: Array<{ atMs: number; intervalMs: number; workMs: number; focused: boolean; visible: boolean }> }>(win,
      `window.__deckGlass.measureTurn(${durationMs}, Math.PI / 5, true)`) : null;
    const osPromise = observeOS && trace !== null ? js<{
      method: string; events: unknown[]; frames: Array<{ atMs: number; intervalMs: number; workMs: number; focused: boolean; visible: boolean }>;
      checkpoints: unknown[]; focus_lost: boolean; visibility_lost: boolean;
    }>(win, `window.__deckObserveOsFixture(${trace.duration_ms}, ${captureVisual}, ${visualInputStride})`) : null;
    if (osPromise !== null && readyPath !== null) {
      let ready = false;
      for (let i = 0; i < 100; i += 1) {
        ready = await js<boolean>(win, 'window.__deckOsReady === true');
        if (ready) break;
        await pause(10);
      }
      if (!ready) throw new Error('production OS observer did not become ready');
      fs.writeFileSync(readyPath, JSON.stringify({ kind: 'production-os-observer-ready', pid: process.pid,
        duration_ms: trace?.duration_ms, window_content_px: win.getContentSize(),
        trace_sha256: provenance.trace_sha256 }) + '\n', { flag: 'wx' });
    }
    let osObservation = null;
    if (osPromise !== null) {
      try { osObservation = await awaitOsObservation(win, osPromise, trace!.duration_ms); }
      catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const display = screen.getDisplayMatching(win.getBounds());
        return { kind: 'production-fixture-diagnostic', captured_at: new Date().toISOString(),
          fixture: adapter.fixture, provenance, duration_ms: trace?.duration_ms ?? durationMs,
          input_route: 'os-observed-unreconciled', source_root: sourceRoot,
          source_tree_sha256_at_launch: sourceAtLaunch, source_tree_sha256_after: sourceTreeHash(),
          display: { id: display.id, label: display.label, size: display.size,
            scale_factor: display.scaleFactor, refresh_hz: display.displayFrequency ?? null,
            content_px: win.getContentSize() },
          expected: adapter.census, actual: { ...actual, placed, omitted }, initial_visual: initialVisual,
          os_observation: null, os_observer_ready_file: readyPath === null ? null : path.basename(readyPath),
          captures: startCapture === null || capturePaths === null ? null : {
            start: { file: path.basename(capturePaths.start), sha256: sha256(startCapture), bytes: startCapture.length },
            end: null },
          errors: [reason], valid: false, comparable_to_native_timing: false,
          comparison_limit: 'The production OS observer left Glass or failed to finish; the sender report is retained separately and this run cannot pass parity or timing checks.' };
      }
    }
    const traceRun = trace === null || matched === null || observeOS ? null : await js<{
      actions_expected: number; actions_delivered: number; action_errors: string[]; action_lateness_ms: number[];
      frames: Array<{ atMs: number; intervalMs: number; workMs: number; focused: boolean; visible: boolean }>;
      checkpoints: Array<{ atMs: number; readerArticle: boolean; readerChars: number; readerKey: string | null;
        reaching: string | null; letGoVisible: boolean; yaw: number; zoom: number; selected: number; placed: number }>;
      focus_lost: boolean; visibility_lost: boolean; method: string;
    }>(win, `window.__deckFixtureTrace(${JSON.stringify(trace)}, ${JSON.stringify(Object.fromEntries(matched.notes.map((note) => [note.key, note.outgoing])))}, ${captureVisual})`);
    const scenario = trace === null ? null : ['turn', 'hover-selection', 'zoom', 'pull-locate', 'reader-neighbours']
      .find((name) => trace.name.startsWith(`${name}-`)) ?? null;
    const checkpoints = traceRun?.checkpoints ?? [];
    const range = (field: 'yaw' | 'zoom'): number => checkpoints.length
      ? Math.max(...checkpoints.map((point) => point[field])) - Math.min(...checkpoints.map((point) => point[field])) : 0;
    const scenarioCorrect = observeOS ? false : traceRun === null ? true : scenario === 'turn' ? range('yaw') > 0.01
      : scenario === 'zoom' ? range('zoom') > 0.01
        : scenario === 'hover-selection' ? checkpoints.some((point) => point.reaching !== null)
          && checkpoints.some((point) => point.readerArticle)
          : scenario === 'pull-locate' ? checkpoints.some((point) => point.letGoVisible)
            && checkpoints.at(-1)?.letGoVisible === false
            : scenario === 'reader-neighbours' ? checkpoints.some((point) => point.readerArticle && point.readerChars > 1000)
              && (trace?.actions.some((action) => action.action === 'follow_link') !== true
                || new Set(checkpoints.map((point) => point.readerKey).filter(Boolean)).size > 1)
              : false;
    const rawFrames = turn?.rawFrames ?? traceRun?.frames ?? osObservation?.frames ?? [];
    const actionLateness = traceRun?.action_lateness_ms ?? [];
    // Catch-up delivery changes the workload even when every action eventually
    // executes. Retain the run and its stalls; exclude it only from a matched
    // timing comparison, so slow application work cannot erase its own evidence.
    const traceScheduleCorrect = !observeOS && (traceRun === null || (actionLateness.length === traceRun.actions_expected
      && actionLateness.every((delay) => Number.isFinite(delay) && delay >= 0 && delay <= 100)));
    const active = rawFrames.slice(1).filter((frame) => frame.focused && frame.visible);
    const intervals = active.map((frame) => frame.intervalMs);
    const work = active.map((frame) => frame.workMs);
    const frameSummary = { samples: intervals.length, p50_ms: quantile(intervals, 0.5), p95_ms: quantile(intervals, 0.95),
      p99_ms: quantile(intervals, 0.99), max_ms: intervals.length ? Math.max(...intervals) : null,
      over_25: intervals.filter((value) => value > 25).length, work_p95_ms: quantile(work, 0.95) };
    const after = await js<{ selected: number; viewId: string | null; drawn: string[]; focused: boolean; visible: boolean }>(win,
      `({ selected: window.__deckGlass.bandState().dealt, viewId: window.__deckGlass.input.view?.id ?? null,
        drawn: window.__deckGlass.drawnNotes(),
        focused: document.hasFocus(), visible: document.visibilityState === 'visible' })`);
    const endCapture = capturePaths === null ? null : (await win.webContents.capturePage()).toPNG();
    if (endCapture !== null && capturePaths !== null) fs.writeFileSync(capturePaths.end, endCapture);
    // Probe only after the timed segment. A real lift goes through Deck's store,
    // reader and sidecar, so it reveals whether fixture injection survives the
    // interaction and whether the matching workspace supplied an actual body.
    const readerProbe = probeReader ? await js<{
      noteId: string; selectedAfterOpen: number; viewIdAfterOpen: string | null;
      hasArticle: boolean; readerText: string; error: string | null;
    }>(win, `(async () => {
      const glass = window.__deckGlass;
      const noteId = ${JSON.stringify(actual.drawn[0] ?? '')};
      const entry = glass.entryFor(noteId);
      if (!entry) return { noteId, selectedAfterOpen: glass.bandState().dealt,
        viewIdAfterOpen: glass.input.view?.id ?? null, hasArticle: false,
        readerText: '', error: 'first drawn note has no field entry' };
      let error = null;
      try { await glass.lift(entry.card); } catch (cause) { error = String(cause); }
      const reader = document.querySelector('#reader');
      return { noteId, selectedAfterOpen: glass.bandState().dealt,
        viewIdAfterOpen: glass.input.view?.id ?? null,
        hasArticle: reader?.querySelector('article') !== null,
        readerText: reader?.textContent ?? '', error };
    })()` ) : null;
    const display = screen.getDisplayMatching(win.getBounds());
    const sourceAfter = sourceTreeHash();
    const changedInputs = [
      sha256(fs.readFileSync(adapterPath)) !== provenance.adapter_sha256 && 'adapter changed during run',
      tracePath !== null && sha256(fs.readFileSync(tracePath)) !== provenance.trace_sha256 && 'trace changed during run',
      matchedFixturePath !== null && sha256(fs.readFileSync(matchedFixturePath)) !== provenance.matched_fixture_sha256 && 'matched fixture changed during run',
      materializedBytes !== null && sha256(fs.readFileSync(materializedPath)) !== provenance.materialized_workspace_sha256 && 'materialized workspace manifest changed during run',
      sha256(fs.readFileSync(protocolFile)) !== provenance.protocol_sha256 && 'protocol changed during run',
      sha256(fs.readFileSync(mainBundle)) !== provenance.main_bundle_sha256 && 'main bundle changed during run',
      sha256(fs.readFileSync(diagnosticBundle)) !== provenance.diagnostic_bundle_sha256 && 'diagnostic bundle changed during run',
      sha256(fs.readFileSync(glassBundle)) !== provenance.glass_bundle_sha256 && 'Glass bundle changed during run',
      sha256(fs.readFileSync(observerBundle)) !== provenance.observer_bundle_sha256 && 'OS observer bundle changed during run',
      sha256(git('diff', '--binary', 'HEAD')) !== provenance.source_diff_sha256 && 'source diff changed during run',
      sourceAfter !== sourceAtLaunch && 'source note tree changed during run',
    ].filter((value): value is string => Boolean(value));
    return { kind: 'production-fixture-diagnostic', captured_at: new Date().toISOString(),
      fixture: adapter.fixture, provenance, duration_ms: trace?.duration_ms ?? durationMs,
      input_route: observeOS ? 'os-observed-unreconciled' : 'internal-adapter',
      source_root: sourceRoot, source_tree_sha256_at_launch: sourceAtLaunch, source_tree_sha256_after: sourceAfter,
      changed_inputs: changedInputs,
      timing_method: osObservation !== null
        ? 'Chromium requestAnimationFrame callback intervals with trusted DOM input observation and optional visual inventory work; not scanout or physical input-to-photon latency'
        : traceRun?.method ?? 'Chromium requestAnimationFrame callback intervals and synchronous GlassField turn/render work; not scanout or physical input-to-photon latency',
      display: { id: display.id, label: display.label, size: display.size, scale_factor: display.scaleFactor,
        refresh_hz: display.displayFrequency ?? null, content_px: win.getContentSize() },
      expected: adapter.census,
      initial_visual: initialVisual,
      visual_checkpoint_collection: captureVisual
        ? observeOS
          ? `detailed DOM and canvas-state diagnostic at periodic frames and every ${visualInputStride}th input; included in measured callback work`
          : 'detailed DOM and canvas-state diagnostic at every trace checkpoint; included in measured callback work'
        : 'off',
      actual: { ...actual, placed, omitted }, turn, trace_run: traceRun, os_observation: osObservation,
      os_observer_ready_file: readyPath === null ? null : path.basename(readyPath), frame_summary: frameSummary, after,
      captures: capturePaths === null || startCapture === null || endCapture === null ? null : {
        start: { file: path.basename(capturePaths.start), sha256: sha256(startCapture), bytes: startCapture.length },
        end: { file: path.basename(capturePaths.end), sha256: sha256(endCapture), bytes: endCapture.length },
      },
      trace_scenario: scenario, trace_scenario_correct: scenarioCorrect,
      trace_schedule: traceRun === null ? null : {
        correct: traceScheduleCorrect,
        max_lateness_ms: actionLateness.length ? Math.max(...actionLateness) : null,
        p95_lateness_ms: quantile(actionLateness, 0.95),
        actions_over_100_ms: actionLateness.filter((delay) => delay > 100).length,
        limit_ms: 100,
      },
      reader_probe: readerProbe === null ? null : {
        note_id: readerProbe.noteId,
        selected_after_open: readerProbe.selectedAfterOpen,
        view_id_after_open: readerProbe.viewIdAfterOpen,
        has_article: readerProbe.hasArticle,
        reader_text_chars: readerProbe.readerText.length,
        reader_text_sha256: sha256(Buffer.from(readerProbe.readerText)),
        error: readerProbe.error,
      },
      valid: !observeOS && censusMatches && after.selected === actual.selected && after.viewId === adapter.input.view.id && after.focused && after.visible
        && (turn === null || (turn.focused && turn.visible && !turn.focusLost && !turn.visibilityLost))
        && (traceRun === null || (traceRun.actions_delivered === traceRun.actions_expected && traceRun.action_errors.length === 0
          && !traceRun.focus_lost && !traceRun.visibility_lost))
        && scenarioCorrect && changedInputs.length === 0 && rawFrames.length > 1
        && (rawFrames.at(-1)?.atMs ?? 0) >= (trace?.duration_ms ?? durationMs) - 100,
      comparable_to_native_timing: false,
      trace_schedule_comparison_eligible: traceScheduleCorrect,
      comparison_limit: observeOS
        ? 'Trusted OS events were observed in production Glass, but they have not been mapped to the frozen semantic actions or reconciled with the native run. This diagnostic cannot pass the parity gate.'
        : traceRun === null
        ? 'The current Glass turns a depth field, while the native trace pans a planar field. The populations, card detail and input sequences are not matched.'
        : 'The trace names the same placed keys, but production still projects a depth field and the native renderer a planar field. Named-note actions use internal methods and wheel events are synthetic DOM events, not OS-delivered input. Visible geometry and content checkpoints must be audited before any direct speed comparison.' };
  } finally {
    win.destroy();
  }
}
