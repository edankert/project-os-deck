// One directory, one workspace, one sidecar — however the path is spelled.
//
// TST-0035. The defect this guards is ISS-0023: Deck compared two path strings
// where it meant to compare two directories, so a repository the cockpit had
// open as `/Users/edwin/...` and Deck held as `/Users/Edwin/...` was treated as
// two repositories. Deck started a second sidecar on it and left that
// repository's `.cockpit/url` naming a port nobody was listening on.
//
// Every check here drives REAL paths on the real file system, because the bug
// lives in the difference between a string and a directory and a stub of the
// file system cannot have that difference.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { HEALTH, fakeSidecar, load } from './helpers.mjs';

const { realDirectory, sameDirectory } = load('main/paths.js');
const { describeWorkspace, workspaceIdFor, WorkspaceBook } = load('main/workspaces.js');
const { SidecarSupervisor } = load('main/sidecar.js');

/** A temporary project-os workspace, and the two spellings of its path. */
function makeWorkspace() {
  const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-paths-')));
  fs.writeFileSync(path.join(root, 'SNAPSHOT.yaml'), 'project:\n  name: "spelled"\n');
  // The same directory reached through a differently-cased parent. macOS and
  // Windows resolve it; a case-SENSITIVE filesystem does not, and there the
  // second spelling is a different directory and these checks do not apply.
  const shouted = path.join(path.dirname(root), path.basename(root).toUpperCase());
  const caseInsensitive = fs.existsSync(path.join(shouted, 'SNAPSHOT.yaml'));
  return { root, shouted, caseInsensitive };
}

test('the real spelling of a directory is the one on disk, not the one that was typed', () => {
  const { root, shouted, caseInsensitive } = makeWorkspace();
  if (!caseInsensitive) return;
  assert.notEqual(shouted, root, 'the two spellings differ as text');
  assert.equal(realDirectory(shouted), root, 'and name one directory');
  assert.ok(sameDirectory(root, shouted));
  assert.ok(sameDirectory(shouted, root));
});

test('a path that does not exist still compares, by its text', () => {
  // The fallback matters: a workspace on an unplugged drive must not throw
  // while Deck is deciding whether it already knows about it.
  const missing = path.join(os.tmpdir(), 'deck-paths-there-is-no-such-directory');
  assert.equal(realDirectory(missing), path.resolve(missing));
  assert.ok(sameDirectory(missing, `${missing}/`));
  assert.ok(!sameDirectory(missing, `${missing}-other`));
});

test('two spellings of one directory are one workspace with one id', () => {
  const { root, shouted, caseInsensitive } = makeWorkspace();
  if (!caseInsensitive) return;
  assert.equal(workspaceIdFor(shouted), workspaceIdFor(root));
  const a = describeWorkspace(root);
  const b = describeWorkspace(shouted);
  assert.equal(b?.id, a?.id);
  assert.equal(b?.root, a?.root, 'the workspace carries the spelling on disk');
});

test('adding a workspace twice under two spellings adds it once', () => {
  const { root, shouted, caseInsensitive } = makeWorkspace();
  if (!caseInsensitive) return;
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'deck-book-')), 'workspaces.json');
  const book = new WorkspaceBook(file);
  assert.equal(book.add(root).ok, true);
  assert.equal(book.add(shouted).ok, true);
  assert.equal(book.list().length, 1, 'one directory is one row in the rail');
});

test('a sidecar that spells its root differently is BORROWED, not duplicated', async () => {
  const { root, shouted, caseInsensitive } = makeWorkspace();
  if (!caseInsensitive) return;
  // The sidecar reports the spelling whoever launched it used. This is the
  // exact shape of ISS-0023: the cockpit's `/Users/edwin/...` against Deck's
  // `/Users/Edwin/...`.
  const sidecar = await fakeSidecar({
    '/healthz': HEALTH,
    '/api/cockpit/identity': { root: shouted, docs_root: path.join(shouted, 'docs'), pid: 1 },
  });
  fs.mkdirSync(path.join(root, '.cockpit'), { recursive: true });
  fs.writeFileSync(path.join(root, '.cockpit', 'url'), sidecar.base);
  try {
    const supervisor = new SidecarSupervisor('/bin/false');
    const workspace = describeWorkspace(root);
    const handle = await supervisor.resolve(workspace);
    assert.equal(handle.base, sidecar.base, 'Deck borrowed the sidecar that was already running');
    assert.equal(handle.ownedByDeck, false, 'and did not start one of its own');
    supervisor.stopAll();
  } finally {
    await sidecar.close();
  }
});

test('a sidecar serving a DIFFERENT directory is still refused', async () => {
  // The fix must not turn the guard off. A sidecar on another repository is
  // not this repository's sidecar, whatever the case of its path.
  const mine = makeWorkspace();
  const theirs = makeWorkspace();
  const sidecar = await fakeSidecar({
    '/healthz': HEALTH,
    '/api/cockpit/identity': { root: theirs.root, docs_root: path.join(theirs.root, 'docs'), pid: 1 },
  });
  fs.mkdirSync(path.join(mine.root, '.cockpit'), { recursive: true });
  fs.writeFileSync(path.join(mine.root, '.cockpit', 'url'), sidecar.base);
  try {
    // `/bin/false` as the interpreter: starting a sidecar fails at once, so a
    // refusal to borrow shows up as a throw rather than as a hang.
    const supervisor = new SidecarSupervisor('/bin/false');
    await assert.rejects(supervisor.resolve(describeWorkspace(mine.root)));
    supervisor.stopAll();
  } finally {
    await sidecar.close();
  }
});
