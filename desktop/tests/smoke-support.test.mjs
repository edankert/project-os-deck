// The smoke run's two decisions about itself.
//
// TST-0036. Nothing checked the smoke run, which is the only thing that drives
// Deck's renderer. On 2026-09-08 it reported two failures in a popped-out desk
// window; the window was fine, and what had happened was that `npm run smoke`
// carried no `--workspace`, opened none, and asserted against a workspace that
// did not exist (ISS-0022).
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { desktopRoot, load } from './helpers.mjs';

const { defaultWorkspacePath, smokeVerdict } = load('main/smoke-support.js');
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
  assert.deepEqual(smokeVerdict([], []), { ok: true, failures: [], skipped: [] });
});

test('a failure is not ok', () => {
  assert.equal(smokeVerdict(['the desk stayed empty'], []).ok, false);
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
