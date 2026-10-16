// TASK-0163 — reading which feature a ticket belongs to from the notes' frontmatter,
// for the towers page. Pure, so TST-0094 tests each case on small notes of its own
// (review of TASK-0163: a single-quoted `parent:` could not be told apart in the corpus).

export const LIST_KEYS = ['tests', 'implements', 'designs', 'requirements', 'tasks'];

/**
 * The ids a frontmatter value names. A link counts by the id it starts with, so
 * `[[TST-0094-DES-0005s-Plates]]` names TST-0094 and not DES-0005; an id written
 * bare (`"FEAT-0013"`) counts as itself.
 */
export function idsIn(value) {
  const ids = [];
  const bare = value.replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_, target) => {
    const id = /^[A-Z]+-\d+/.exec(target.trim())?.[0];
    if (id) ids.push(id);
    return ' ';
  });
  for (const m of bare.matchAll(/(?<![\w-])[A-Z]+-\d+(?![\w-])/g)) ids.push(m[0]);
  return ids;
}

/**
 * Each note's `parent:`, and the ticket lists a feature (or a task's `tests:`) names,
 * by id. The first note seen with an id wins, so a caller lists the notes it trusts first.
 */
export function relationsFrom(texts) {
  const parent = new Map();
  const named = new Map();
  const seen = new Set();
  for (const text of texts) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
    if (fm === undefined) continue;
    const id = /^id:\s*["']?([A-Z]+-\d+)["']?\s*$/m.exec(fm)?.[1];
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    const p = /^parent:\s*["']?(?:\[\[)?([A-Z]+-\d+)/m.exec(fm)?.[1];
    if (p !== undefined && !parent.has(id)) parent.set(id, p);
    // A feature's lists, and a task's tests: a test named by a task belongs to the task's feature.
    if (id.startsWith('FEAT-') || id.startsWith('TASK-')) {
      const ids = [];
      for (const key of id.startsWith('TASK-') ? ['tests'] : LIST_KEYS) {
        // The list inline (`key: [...]`) or as the dash lines under the key, indented or not.
        const m = new RegExp(`^${key}:(.*)((?:\\r?\\n[ \\t]*-.*)*)`, 'm').exec(fm);
        if (m) ids.push(...idsIn(`${m[1]}${m[2]}`));
      }
      named.set(id, ids);
    }
  }
  return { parent, named };
}
