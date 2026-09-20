// The smoke run's two decisions about itself.
//
// TST-0036. Nothing checked the smoke run, which is the only thing that drives
// Deck's renderer. On 2026-09-08 it reported two failures in a popped-out desk
// window; the window was fine, and what had happened was that `npm run smoke`
// carried no `--workspace`, opened none, and asserted against a workspace that
// did not exist (ISS-0022).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { desktopRoot, load } from './helpers.mjs';

const { defaultWorkspacePath, focusPolicy, smokeVerdict } = load('main/smoke-support.js');
const { describeWorkspace } = load('main/workspaces.js');

test('the default workspace is this repository, and it really is a workspace', () => {
  // Measured from where the BUILT module sits, which is what main.ts passes.
  const moduleDir = path.join(desktopRoot, 'dist', 'main');
  const resolved = defaultWorkspacePath(moduleDir);
  const workspace = describeWorkspace(resolved);
  assert.notEqual(workspace, null, `${resolved} carries no SNAPSHOT.yaml`);
  assert.equal(workspace.kind, 'project-os');
  // A directory count that drifts — one `..` too few or too many — leaves the
  // default naming `desktop/` or the folder above the repository, and the
  // check above is the one that notices.
  assert.equal(resolved, path.resolve(desktopRoot, '..'));
});

test('a run with no failures and nothing skipped is ok', () => {
  assert.deepEqual(smokeVerdict([], []), { ok: true, failures: [], skipped: [], notApplicable: [] });
});

test('a failure is not ok', () => {
  assert.equal(smokeVerdict(['the desk stayed empty'], []).ok, false);
});

test('a check belonging to ANOTHER CONFIGURATION does not count against the run', () => {
  // The tablet-shaped checks need `--lan`. A loopback run has not failed to
  // make them; it has made a different run. Calling that a skip would either
  // turn the ordinary smoke run red or make a skip mean nothing — and a skip
  // meaning nothing is the defect this whole distinction exists to keep fixed.
  const verdict = smokeVerdict([], [], ['the tablet-shaped checks: this run is on loopback']);
  assert.equal(verdict.ok, true);
  assert.deepEqual(verdict.notApplicable, ['the tablet-shaped checks: this run is on loopback']);
  // And it is PRINTED, so it hides nothing.
  assert.ok('notApplicable' in verdict);
  // A real skip still counts, even beside one of these.
  assert.equal(smokeVerdict([], ['no workspace was opened'], ['on loopback']).ok, false);
});

test('a SKIPPED check is not ok either, which is the whole lesson', () => {
  // A run that checks half of Deck and prints `ok: true` is what hid the
  // workspace half of the smoke run: every check needing a workspace was
  // quietly not run, and the two that ran without one failed for a reason
  // nothing in the output named.
  const verdict = smokeVerdict([], ['the panel windows: no workspace was opened']);
  assert.equal(verdict.ok, false);
  assert.deepEqual(verdict.skipped, ['the panel windows: no workspace was opened']);
});

// ---- which run this is (ISS-0075) ----

test('a run takes the keyboard by DEFAULT, because the keyboard checks need it', () => {
  // The default must not change: CI, and the container the Mac now hands over
  // to, both want the frontmost application. What changed is which runs reach
  // that path, and that decision lives in run-smoke.sh, checked below.
  const policy = focusPolicy(['electron', '.', '--smoke'], {});
  assert.equal(policy.takesKeyboard, true);
  assert.match(policy.why, /keyboard/);
});

test('--no-focus turns it off, and so does DECK_SMOKE_NO_FOCUS=1', () => {
  assert.equal(focusPolicy(['electron', '.', '--smoke', '--no-focus'], {}).takesKeyboard, false);
  assert.equal(focusPolicy(['electron', '.', '--smoke'], { DECK_SMOKE_NO_FOCUS: '1' }).takesKeyboard, false);
  // The env var is the one run-smoke.sh sets, and it must be the exact value:
  // an empty string left over from `export DECK_SMOKE_NO_FOCUS=` is not a yes.
  assert.equal(focusPolicy(['electron', '.', '--smoke'], { DECK_SMOKE_NO_FOCUS: '' }).takesKeyboard, true);
  assert.equal(focusPolicy(['electron', '.', '--smoke'], { DECK_SMOKE_NO_FOCUS: '0' }).takesKeyboard, true);
});

test('a no-focus run SAYS the keyboard checks will fail, rather than letting them read as defects', () => {
  const why = focusPolicy(['--no-focus'], {}).why;
  assert.match(why, /--no-focus/);
  assert.match(why, /fail/);
});

// ---- the runner's own decision, driven as a script (ISS-0075) ----

/**
 * Run `tools/scripts/run-smoke.sh` far enough to print what it would do.
 *
 * `DECK_SMOKE_PLAN=1` stops it after the mode line, so nothing opens a window,
 * builds an image or needs Electron. `uname` is stubbed on PATH, which is what
 * lets a Mac check the Linux branch and the other way round.
 */
function planSmoke(system, args) {
  const stub = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-uname-'));
  fs.writeFileSync(path.join(stub, 'uname'), `#!/bin/sh\necho ${system}\n`, { mode: 0o755 });
  const run = spawnSync('bash', [path.join(desktopRoot, '..', 'tools', 'scripts', 'run-smoke.sh'), ...args], {
    encoding: 'utf-8',
    env: { ...process.env, PATH: `${stub}:${process.env.PATH}`, DECK_SMOKE_PLAN: '1' },
  });
  return { out: `${run.stdout}${run.stderr}`, status: run.status };
}

test('on a Mac the ordinary run hands over to the container, where there is no keyboard to take', () => {
  const { out, status } = planSmoke('Darwin', ['loopback']);
  assert.equal(status, 0, out);
  assert.match(out, /smoke-in-a-box/, 'a plain macOS run still opens windows on the person\'s screen');
  assert.match(out, /loopback/);
});

test('on Linux nothing is handed over, so CI runs exactly what it ran before', () => {
  const { out, status } = planSmoke('Linux', ['both']);
  assert.equal(status, 0, out);
  assert.equal(/smoke-in-a-box/.test(out), false, 'CI was diverted into a container it cannot build');
});

test('--on-screen keeps the run here and says it will take the keyboard', () => {
  const { out } = planSmoke('Darwin', ['lan', '--on-screen']);
  assert.equal(/smoke-in-a-box/.test(out), false);
  assert.match(out, /take the keyboard/);
  assert.match(out, /lan/);
});

test('--no-focus keeps the run here, takes nothing, and says which checks that costs', () => {
  const { out } = planSmoke('Darwin', ['loopback', '--no-focus']);
  assert.equal(/smoke-in-a-box/.test(out), false);
  assert.match(out, /WITHOUT taking the keyboard/);
  assert.match(out, /will fail/);
});

test('a word the runner does not know is refused by name, not treated as a mode', () => {
  const { out, status } = planSmoke('Darwin', ['loopback', '--quietly']);
  assert.equal(status, 2);
  assert.match(out, /--quietly/);
});
