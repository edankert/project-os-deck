// TST-0006 — views come from the provider, match the cockpit's list, and
// appear nowhere as literals in the renderer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load, desktopRoot } from './helpers.mjs';

const { ViewRegistry, projectOsProvider, DEFAULT_VIEW_ID, sourceOf } = load('shared/views.js');

const fixture = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'fixtures', 'cockpit-views.json'), 'utf-8'));
const WORKSPACE = { id: 'aaaa1111', root: '/repo', name: 'a repo', kind: 'project-os' };

test("the project-os provider offers exactly the cockpit's views, in the cockpit's order", () => {
  // When the cockpit adds or renames a view, this fails, and that failure is
  // the signal that docs/reference/cockpit-adoption.md needs a row.
  const views = projectOsProvider.views(WORKSPACE);
  assert.deepEqual(
    views.map((v) => ({ id: v.id, label: v.label })),
    fixture.views,
  );
});

test('a view carries where its contents come from, so the renderer names no route', () => {
  // A view is a DESCRIPTION now (FEAT-0012), and `sourceOf` is what turns its
  // source section into the route the renderer follows. The claim is
  // unchanged: the renderer asks, and never names a sidecar path itself.
  for (const view of projectOsProvider.views(WORKSPACE)) {
    const source = sourceOf(view);
    assert.ok(
      source.kind === 'nav' || source.kind === 'stats' || source.kind === 'query',
      `${view.id} has no source`,
    );
    if (source.kind === 'nav') assert.equal(typeof source.mode, 'string');
  }
});

test('the provider hands out copies, so a caller cannot edit the list for everyone', () => {
  const first = projectOsProvider.views(WORKSPACE);
  first[0].label = 'vandalised';
  assert.notEqual(projectOsProvider.views(WORKSPACE)[0].label, 'vandalised');
});

test('a second provider changes the views with no change to the renderer', () => {
  const registry = new ViewRegistry();
  registry.register({
    kind: 'vault',
    views: () => [
      {
        version: '1',
        id: 'characters',
        label: 'Characters',
        source: { kind: 'mode', mode: 'base:characters' },
        band: { rows: [{ when: {}, band: 'mid' }], frontCapacity: 12, midCapacity: 40, gathersOwed: false },
        face: { default: { title: 'title', subtitle: null, image: null, fields: [], measure: 'none' }, byType: {} },
        surfaces: ['list'],
        verbs: 'registry',
        extensions: {},
      },
    ],
  });
  const vault = { id: 'bbbb2222', root: '/vault', name: 'Notes', kind: 'vault' };
  assert.deepEqual(registry.viewsFor(vault).views.map((v) => v.id), ['characters']);
  assert.equal(registry.viewsFor(WORKSPACE).views.length, fixture.views.length);
});

test('a workspace kind with no provider yields no views, and says so', () => {
  const registry = new ViewRegistry([]);
  const result = registry.viewsFor(WORKSPACE);
  assert.deepEqual(result.views, []);
  assert.match(result.reason, /no view provider/);
});

test('a view the provider did not return cannot be resolved', () => {
  const registry = new ViewRegistry();
  assert.equal(registry.resolve(WORKSPACE, 'not-a-view'), null);
  assert.notEqual(registry.resolve(WORKSPACE, DEFAULT_VIEW_ID), null);
});

test('no view id is written into the renderer', () => {
  // Crude on purpose. It is the only kind of check that catches the failure
  // this rule exists to prevent: someone adding one convenient hard-coded
  // button, which then survives every provider change.
  const dir = path.join(desktopRoot, 'dist', 'web', 'renderer');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
  assert.ok(files.length > 0, 'the renderer was not built');
  const offences = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(dir, file), 'utf-8');
    for (const view of fixture.views) {
      if (source.includes(`'${view.id}'`) || source.includes(`"${view.id}"`) || source.includes(`\`${view.id}\``)) {
        offences.push(`${file} names the view "${view.id}"`);
      }
    }
  }
  assert.deepEqual(offences, []);
});
