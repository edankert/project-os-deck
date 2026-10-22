// TASK-0181 — adds to the overview fixtures what the model now carries of each note: its
// first paragraph (`lead`), its owner as a word, its `updated:` date, the feature a design
// stands with, and the pictures beside the notes. Read from the notes at the fixture's own
// commit, as DES-0005's towers page reads them, so the page and the fixture agree; nothing
// else in a fixture changes. Your Trainer's fixture cannot be rebuilt from its commit (its
// README says why), which is why the fields are added rather than the fixture rebuilt.
//
//   cd desktop && npm run build && node scripts/overview-fixture-notes.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.DECK_TOWERS_NO_DEFAULT = '1';
const { notesAt, imagesAt, focusOf } = await import('./overview-towers.mjs');
const { relationsFrom, ownerWord, designFeature, evidenceFrom } = await import('./overview-towers-notes.mjs');

const desktop = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = path.join(desktop, 'fixtures', 'overview');
const ROOTS = { deck: path.join(desktop, '..'), 'your-trainer': path.join(desktop, '..', '..', 'your-trainer') };
const byNumber = (a, b) => a.localeCompare(b, 'en', { numeric: true });

for (const [ws, root] of Object.entries(ROOTS)) {
  const file = path.join(fixtures, `${ws}.json`);
  const model = JSON.parse(fs.readFileSync(file, 'utf-8'));
  const { notes, from } = notesAt(root, model.head, model.dirty === true);
  if (from !== 'commit') throw new Error(`${ws}: the notes at ${model.head} cannot be read (${from}); the fixture is left as it is`);
  const { parent, named, facts, implementsOf } = relationsFrom(notes.map((n) => n.text));
  const tickets = model.tickets;
  for (const t of Object.values(tickets)) {
    delete t.lead;
    delete t.owner;
    delete t.updated;
    const f = facts.get(t.id);
    if (f === undefined) continue;
    const owner = ownerWord(f.owner);
    if (f.lead !== '') t.lead = f.lead;
    if (owner !== '') t.owner = owner;
    if (f.updated !== '') t.updated = f.updated;
  }
  // The design rule the builder now follows (TASK-0179): the feature in focus among those that
  // name it, else the lowest-numbered; then via the tasks that name it; then its own implements:.
  const focus = focusOf(root, model.head);
  const claimedBy = new Map();
  const claimedByTask = new Map();
  const namedBy = new Map();
  for (const [owner, list] of [...named].sort(([a], [b]) => byNumber(a, b))) {
    const into = owner.startsWith('FEAT-') ? claimedBy : claimedByTask;
    for (const id of list) {
      if (id === owner) continue;
      (into.get(id) ?? into.set(id, []).get(id)).push(owner);
      if (owner.startsWith('FEAT-') && !namedBy.has(id)) namedBy.set(id, owner);
    }
  }
  const upToFeature = (id) => {
    let p = parent.get(id);
    for (let i = 0; i < 6 && p !== undefined && tickets[p]?.kind !== 'feat'; i += 1) p = parent.get(p);
    return p !== undefined && tickets[p]?.kind === 'feat' ? p : undefined;
  };
  let moved = 0;
  for (const t of Object.values(tickets)) {
    if (t.type !== 'design' || parent.has(t.id)) continue;
    const viaTasks = (claimedByTask.get(t.id) ?? []).map((x) => upToFeature(x) ?? namedBy.get(x)).filter(Boolean);
    const f = designFeature({ namedBy: claimedBy.get(t.id) ?? [], viaTasks, implementsList: implementsOf.get(t.id) ?? [], focus: focus.feature, isFeature: (x) => tickets[x]?.kind === 'feat' });
    if (f !== null && f !== t.feature) {
      t.feature = f;
      moved += 1;
    }
  }
  // Every picture that belongs to a ticket, newest first; its path under docs/, as the model holds it.
  const images = imagesAt(root, model.head);
  model.pictures = evidenceFrom(images, notes, new Set(Object.keys(tickets)), { perTicket: Infinity, limit: Infinity })
    .map((e) => ({ ticket: e.id, path: e.path.replace(/^docs\//, ''), date: e.date }));
  fs.writeFileSync(file, `${JSON.stringify(model, null, 2)}\n`);
  const count = (key) => Object.values(tickets).filter((t) => t[key] !== undefined).length;
  console.log(`${ws}: ${Object.keys(tickets).length} tickets, ${count('lead')} with a lead, ${count('owner')} with an owner, ${count('updated')} with a date; ${moved} designs moved to another feature; ${model.pictures.length} pictures`);
}
