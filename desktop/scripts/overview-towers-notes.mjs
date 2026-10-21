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

/** Markdown made plain for a pane: a link reads as its alias or its id, emphasis and code marks go. */
export function plainMarkdown(text) {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => alias ?? /^(?:[^#]*#)?([A-Z]+-\d+)/.exec(target)?.[1] ?? target)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // An address is shown without its scheme: the page loads nothing from outside, and
    // TST-0094 holds it to that by finding no address in it at all.
    .replace(/https?:\/\//g, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/\*([^*\s][^*]*?)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A list item's marker, and a checklist's box after it: `- `, `* `, `+ `, `1. `, `2) `, `[x] `. */
const ITEM = /^(?:[-*+]|\d+[.)])\s+(?:\[[ xX~-]\]\s+)?/;

/**
 * A note's first paragraph of prose (TASK-0176): the text after the frontmatter, past
 * headings, comments, pictures, code and callouts (`> [!note]`, an acceptance stamp or a
 * warning), up to the first blank line, made plain and cut to `max`. A paragraph that ends
 * in a colon takes the block after it too, so "Reproducible by:" keeps its steps. List
 * items lose their markers and checklist boxes and are joined with semicolons; a plain
 * quote is prose (a requirement's statement often is one).
 * Notes here put their point first, so this is the sentence the pane shows.
 */
export function leadOf(text, max = 280) {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replace(/<!--[\s\S]*?-->/g, '');
  let out = '';
  let fence = null;
  let callout = false;
  let more = false; // a colon asked for the next block
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim();
    // A code block is not prose: skipped from its opening fence to its closing one.
    const opens = /^(```|~~~)/.exec(t)?.[1];
    if (fence !== null) {
      if (opens === fence) fence = null;
      continue;
    }
    if (opens) {
      if (out !== '') break;
      fence = opens;
      continue;
    }
    if (t === '') {
      callout = false;
      if (out === '') continue;
      if (more) {
        more = false;
        continue;
      }
      break;
    }
    if (/^>\s*\[!/.test(t)) callout = true;
    if (callout && t.startsWith('>')) {
      if (out !== '') break;
      continue;
    }
    callout = false;
    // A heading, a picture, a table or a rule is not prose; a paragraph already begun ends there.
    if (/^(#|!\[|\||---|\*\*\*)/.test(t)) {
      if (out !== '') break;
      continue;
    }
    const quoted = t.replace(/^(?:>\s?)+/, '');
    const item = ITEM.test(quoted);
    const words = quoted.replace(ITEM, '');
    if (words === '') continue;
    // Items are joined with semicolons, unless an item already ends its sentence or a colon leads in.
    out += out === '' ? words : (item && !/[:.!?]$/.test(out) ? '; ' : ' ') + words;
    more = out.endsWith(':');
  }
  const s = plainMarkdown(out);
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/**
 * Each note's `parent:`, and the ticket lists a feature (or a task's `tests:`) names,
 * by id. The first note seen with an id wins, so a caller lists the notes it trusts first.
 * `facts` holds what the towers page shows of a selected ticket (TASK-0176): its first
 * paragraph, its `owner:` and its `updated:` date.
 */
export function relationsFrom(texts) {
  const parent = new Map();
  const named = new Map();
  const facts = new Map();
  const seen = new Set();
  for (const text of texts) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
    if (fm === undefined) continue;
    const id = /^id:\s*["']?([A-Z]+-\d+)["']?\s*$/m.exec(fm)?.[1];
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    const scalar = (key) => new RegExp(`^${key}:[ \\t]*["']?([^"'\\r\\n]*?)["']?[ \\t]*$`, 'm').exec(fm)?.[1] ?? '';
    facts.set(id, { lead: leadOf(text), owner: scalar('owner'), updated: /^\d{4}-\d{2}-\d{2}/.exec(scalar('updated'))?.[0] ?? '' });
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
  return { parent, named, facts };
}

/**
 * An owner as the board and the card show it (TASK-0176): a person or an agent by name
 * ("Claude", "Edwin"), a team or group as one ("ios team"), nothing when unassigned.
 */
export function ownerWord(owner) {
  const m = /^(system|user|agent|model|team|group):(.*)$/.exec(String(owner).trim());
  const who = (m ? m[2] : String(owner)).trim();
  if (who === '' || who === 'unassigned') return '';
  if (m && (m[1] === 'team' || m[1] === 'group')) return `${who} ${m[1]}`;
  return who.charAt(0).toUpperCase() + who.slice(1);
}

/**
 * The next-up board's rows (TASK-0176), in the style of Rubric's routines, from a feature's
 * task rows (`[id, type, fill, needs, status, title, say, state]`), the next ticket's id and
 * each ticket's last update. A cancelled task is not counted. The last two finished are
 * shown oldest first, then the next one, then up to `room` more: in progress, at review,
 * then waiting, each by id. What has no room is counted by kind.
 */
export function boardOf(tasks, next, updatedOf, room = 6) {
  const counted = tasks.filter((r) => r[7] !== 'dropped');
  const byId = (a, b) => a[0].localeCompare(b[0], 'en', { numeric: true });
  const done = counted.filter((r) => r[7] === 'closed').sort((a, b) => (updatedOf(b[0]) ?? '').localeCompare(updatedOf(a[0]) ?? '') || byId(b, a));
  const kindOf = (r) => (r[4] === 'doing' ? 'doing' : r[4] === 'review' ? 'review' : 'queued');
  const rank = { doing: 0, review: 1, queued: 2 };
  const waiting = counted.filter((r) => r[7] !== 'closed' && r[0] !== next).sort((a, b) => rank[kindOf(a)] - rank[kindOf(b)] || byId(a, b));
  const more = { doing: 0, review: 0, queued: 0 };
  for (const r of waiting.slice(room)) more[kindOf(r)] += 1;
  return {
    done: done.length,
    of: counted.length,
    rows: [
      ...done.slice(0, 2).reverse().map((r) => ({ id: r[0], kind: 'done' })),
      ...(next !== null ? [{ id: next, kind: 'next' }] : []),
      ...waiting.slice(0, room).map((r) => ({ id: r[0], kind: kindOf(r) })),
    ],
    more,
  };
}
