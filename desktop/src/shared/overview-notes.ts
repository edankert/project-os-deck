/**
 * What the towers read from the notes beyond the index (TASK-0181): a note's first
 * paragraph, its owner as a word, the pictures kept beside the notes and the ticket each
 * belongs to, the feature a design stands with, the next-up board and the year as weeks.
 *
 * These began on DES-0005's towers page (`desktop/scripts/overview-towers-notes.mjs`,
 * TASK-0163 to TASK-0179). They live here so Deck's overview model and the page use one
 * copy; the page's script now loads them from the build. Pure: no files, no clock.
 */

/** A feature names its design in `design:`; `designs:` is kept for a note that writes the plural (TASK-0179). */
export const LIST_KEYS = ['tests', 'implements', 'design', 'designs', 'requirements', 'tasks'] as const;

/**
 * The ids a frontmatter value names. A link counts by the id it starts with, so
 * `[[TST-0094-DES-0005s-Plates]]` names TST-0094 and not DES-0005; an id written
 * bare (`"FEAT-0013"`) counts as itself.
 */
export function idsIn(value: string): string[] {
  const ids: string[] = [];
  const bare = value.replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_, target: string) => {
    const id = /^[A-Z]+-\d+/.exec(target.trim())?.[0];
    if (id) ids.push(id);
    return ' ';
  });
  for (const m of bare.matchAll(/(?<![\w-])[A-Z]+-\d+(?![\w-])/g)) ids.push(m[0]);
  return ids;
}

/** Markdown made plain for a pane: a link reads as its alias or its id, emphasis and code marks go. */
export function plainMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, alias: string | undefined) => alias ?? /^(?:[^#]*#)?([A-Z]+-\d+)/.exec(target)?.[1] ?? target)
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
export function leadOf(text: string, max = 280): string {
  const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replace(/<!--[\s\S]*?-->/g, '');
  let out = '';
  let fence: string | null = null;
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

export interface NoteFacts { lead: string; owner: string; updated: string }

/**
 * Each note's `parent:`, and the ticket lists a feature (or a task's `tests:`) names,
 * by id. The first note seen with an id wins, so a caller lists the notes it trusts first.
 * `facts` holds what the towers show of a selected ticket (TASK-0176): its first
 * paragraph, its `owner:` and its `updated:` date.
 */
export function relationsFrom(texts: Iterable<string>): { parent: Map<string, string>; named: Map<string, string[]>; facts: Map<string, NoteFacts>; implementsOf: Map<string, string[]> } {
  const parent = new Map<string, string>();
  const named = new Map<string, string[]>();
  const facts = new Map<string, NoteFacts>();
  const implementsOf = new Map<string, string[]>();
  const seen = new Set<string>();
  for (const text of texts) {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
    if (fm === undefined) continue;
    const id = /^id:\s*["']?([A-Z]+-\d+)["']?\s*$/m.exec(fm)?.[1];
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    const scalar = (key: string): string => new RegExp(`^${key}:[ \\t]*["']?([^"'\\r\\n]*?)["']?[ \\t]*$`, 'm').exec(fm)?.[1] ?? '';
    facts.set(id, { lead: leadOf(text), owner: scalar('owner'), updated: /^\d{4}-\d{2}-\d{2}/.exec(scalar('updated'))?.[0] ?? '' });
    const p = /^parent:\s*["']?(?:\[\[)?([A-Z]+-\d+)/m.exec(fm)?.[1];
    if (p !== undefined && !parent.has(id)) parent.set(id, p);
    // A design names the features it is for in its own `implements:` (TASK-0179). The towers
    // use them only when no feature names the design in `design:` or another list.
    if (id.startsWith('DES-')) {
      const m = new RegExp('^implements:(.*)((?:\\r?\\n[ \\t]*-.*)*)', 'm').exec(fm);
      const features = m ? idsIn(`${m[1]}${m[2]}`).filter((x) => x.startsWith('FEAT-')) : [];
      if (features.length > 0) implementsOf.set(id, features);
    }
    // A feature's lists, and a task's tests: a test named by a task belongs to the task's feature.
    if (id.startsWith('FEAT-') || id.startsWith('TASK-')) {
      const ids: string[] = [];
      for (const key of id.startsWith('TASK-') ? ['tests'] : LIST_KEYS) {
        // The list inline (`key: [...]`) or as the dash lines under the key, indented or not.
        const m = new RegExp(`^${key}:(.*)((?:\\r?\\n[ \\t]*-.*)*)`, 'm').exec(fm);
        if (m) ids.push(...idsIn(`${m[1]}${m[2]}`));
      }
      named.set(id, ids);
    }
  }
  return { parent, named, facts, implementsOf };
}

/**
 * An owner as the board and the card show it (TASK-0176): a person or an agent by name
 * ("Claude", "Edwin"), a team or group as one ("ios team"), nothing when unassigned.
 */
export function ownerWord(owner: unknown): string {
  const m = /^(system|user|agent|model|team|group):(.*)$/.exec(String(owner ?? '').trim());
  const who = (m ? m[2]! : String(owner ?? '')).trim();
  if (who === '' || who === 'unassigned') return '';
  if (m && (m[1] === 'team' || m[1] === 'group')) return `${who} ${m[1]}`;
  return who.charAt(0).toUpperCase() + who.slice(1);
}

/** A task as the board reads it: `[id, type, fill, needs, status, title, say, state]`. */
export type BoardTask = [string, string, string, number, string, string, string, string];
export type BoardKind = 'done' | 'next' | 'doing' | 'review' | 'queued';

/**
 * The next-up board's rows (TASK-0176), in the style of Rubric's routines, from a feature's
 * task rows, the next ticket's id and each ticket's last update. A cancelled task is not
 * counted. The last two finished are shown oldest first, then the next one, then up to
 * `room` more: in progress, at review, then waiting, each by id. What has no room is
 * counted by kind.
 */
export function boardOf(tasks: readonly BoardTask[], next: string | null, updatedOf: (id: string) => string | undefined, room = 6): { done: number; of: number; rows: Array<{ id: string; kind: BoardKind }>; more: Record<'doing' | 'review' | 'queued', number> } {
  const counted = tasks.filter((r) => r[7] !== 'dropped');
  const byId = (a: BoardTask, b: BoardTask): number => a[0].localeCompare(b[0], 'en', { numeric: true });
  const done = counted.filter((r) => r[7] === 'closed').sort((a, b) => (updatedOf(b[0]) ?? '').localeCompare(updatedOf(a[0]) ?? '') || byId(b, a));
  const kindOf = (r: BoardTask): 'doing' | 'review' | 'queued' => (r[4] === 'doing' ? 'doing' : r[4] === 'review' ? 'review' : 'queued');
  const rank = { doing: 0, review: 1, queued: 2 };
  const waiting = counted.filter((r) => r[7] !== 'closed' && r[0] !== next).sort((a, b) => rank[kindOf(a)] - rank[kindOf(b)] || byId(a, b));
  const more = { doing: 0, review: 0, queued: 0 };
  for (const r of waiting.slice(room)) more[kindOf(r)] += 1;
  return {
    done: done.length,
    of: counted.length,
    rows: [
      ...done.slice(0, 2).reverse().map((r) => ({ id: r[0], kind: 'done' as const })),
      ...(next !== null ? [{ id: next, kind: 'next' as const }] : []),
      ...waiting.slice(0, room).map((r) => ({ id: r[0], kind: kindOf(r) })),
    ],
    more,
  };
}

export const IMAGE = /\.(?:png|jpe?g|webp|gif)$/i;
const TICKET_IN_NAME = /(?<![a-z0-9])(feat|task|tst|iss|des|req|risk|adr)-(\d{1,4})(?![0-9])/i;

export interface Evidence { id: string; path: string; date: string }

/**
 * The pictures kept beside the notes (TASK-0177, TASK-0179), each tied to a ticket and
 * dated, newest first, at most `perTicket` for one ticket and `limit` in all. `images`
 * are `{ path, date }` (repository-relative, the date of the file's last commit); `notes`
 * are `{ path, text }`. A picture belongs to the note that names it (its `evidence:`
 * field, a Markdown link, or a wiki link by path, or by name when no other picture has
 * that name), else to the ticket its file name names, else to the feature whose folder
 * holds it; only tickets in `tickets` count, and a picture with none of these is left out.
 */
export function evidenceFrom(images: ReadonlyArray<{ path: string; date: string }>, notes: ReadonlyArray<{ path: string; text: string }>, tickets: ReadonlySet<string>, { perTicket = 3, limit = 18 }: { perTicket?: number; limit?: number } = {}): Evidence[] {
  const posix = (p: string): string => p.split('\\').join('/');
  // A segment that will not decode (a lone `%`) is kept as written, so one odd link cannot
  // stop the list being made (review of TASK-0177).
  const decode = (seg: string): string => {
    try {
      return decodeURIComponent(seg);
    } catch {
      return seg;
    }
  };
  /** A link from a note to a file: `docs/...` and `/...` from the workspace, anything else from the note's folder. */
  const resolve = (from: string, link: string): string => {
    const target = link.trim().replace(/^<|>$/g, '').replace(/[#?].*$/, '');
    const fromRoot = target.startsWith('docs/') || target.startsWith('/');
    const parts = fromRoot ? [] : posix(from).split('/').slice(0, -1);
    for (const seg of target.replace(/^\//, '').split('/').map(decode)) {
      if (seg === '..') parts.pop();
      else if (seg !== '.' && seg !== '') parts.push(seg);
    }
    return parts.join('/');
  };
  const frontmatter = (text: string): string => /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
  const idOf = (text: string): string | undefined => /^id:\s*["']?([A-Z]+-\d+)["']?\s*$/m.exec(frontmatter(text))?.[1];
  // A wiki link by name alone claims a picture only when no other picture has that name.
  const nameCount = new Map<string, number>();
  for (const { path: p } of images) {
    const name = posix(p).split('/').pop()!;
    nameCount.set(name, (nameCount.get(name) ?? 0) + 1);
  }
  const byPath = new Map<string, string>();
  const bySuffix = new Map<string, string>();
  const byName = new Map<string, string>();
  const featureOfFolder = new Map<string, string>();
  const claim = (map: Map<string, string>, key: string, id: string): void => {
    if (!map.has(key)) map.set(key, id);
  };
  for (const { path: p, text } of notes) {
    const id = idOf(text);
    if (id === undefined || !tickets.has(id)) continue;
    const m = /^docs\/features\/([^/]+)\/FEAT-\d+[^/]*\.md$/.exec(posix(p));
    if (m && id.startsWith('FEAT-')) featureOfFolder.set(m[1]!, id);
    // The note's `evidence:` field, as your-trainer lists a test's or an issue's pictures.
    const field = new RegExp('^evidence:(.*)((?:\\r?\\n[ \\t]*-.*)*)', 'm').exec(frontmatter(text));
    if (field) {
      // A dash line is one value, spaces and all; an inline list splits at its commas.
      const values = [
        ...field[1]!.trim().replace(/^\[|\]$/g, '').split(','),
        ...field[2]!.split(/\r?\n/).map((line) => line.replace(/^[ \t]*-[ \t]*/, '')),
      ].map((v) => v.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      for (const target of values) if (IMAGE.test(target.replace(/[#?].*$/, ''))) claim(byPath, resolve(p, target), id);
    }
    // A link inside a code block is an example, not a claim.
    const prose = text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
    // Markdown links and pictures in the body, angle-bracketed ones with spaces included.
    for (const link of prose.matchAll(/\]\(\s*(<[^>]+>|[^)\s]+)/g)) {
      const target = link[1]!;
      if (IMAGE.test(target.replace(/^<|>$/g, '').replace(/[#?].*$/, '')) && !/^<?[a-z]+:/i.test(target)) claim(byPath, resolve(p, target), id);
    }
    // Wiki links, embedded or not: by their path when they give one, else by name.
    for (const link of prose.matchAll(/\[\[([^\]|#]+)/g)) {
      const target = posix(link[1]!.trim());
      if (!IMAGE.test(target)) continue;
      if (target.includes('/')) claim(bySuffix, target.replace(/^\/+/, ''), id);
      else claim(byName, target, id);
    }
  }
  const owner = (p: string): string | undefined => {
    const path = posix(p);
    const name = path.split('/').pop()!;
    if (byPath.has(path)) return byPath.get(path);
    for (const [suffix, id] of bySuffix) if (path === suffix || path.endsWith('/' + suffix)) return id;
    if (byName.has(name) && nameCount.get(name) === 1) return byName.get(name);
    const named = TICKET_IN_NAME.exec(name);
    if (named) {
      const id = `${named[1]!.toUpperCase()}-${named[2]!.padStart(4, '0')}`;
      if (tickets.has(id)) return id;
    }
    const folder = /^docs\/features\/([^/]+)\//.exec(path)?.[1];
    return folder !== undefined ? featureOfFolder.get(folder) : undefined;
  };
  const taken = new Map<string, number>();
  const out: Evidence[] = [];
  for (const image of [...images].filter((i) => IMAGE.test(i.path)).sort((a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path))) {
    const id = owner(image.path);
    if (id === undefined || (taken.get(id) ?? 0) >= perTicket) continue;
    taken.set(id, (taken.get(id) ?? 0) + 1);
    out.push({ id, path: posix(image.path), date: image.date });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Each picture's last commit date from `git log --format=%x00%cs --name-only`, which lists
 * commits newest first: the first date seen for a file is its last commit (TASK-0177).
 */
export function lastDates(log: string): Map<string, string> {
  const dated = new Map<string, string>();
  let date = '';
  for (const line of log.split('\n')) {
    if (line.startsWith('\0')) date = line.slice(1);
    else if (line !== '' && IMAGE.test(line) && !dated.has(line)) dated.set(line, date);
  }
  return dated;
}

export interface Weeks { year: string; now: number; closed: string[][]; undated: number }

/**
 * The year as weeks (TASK-0177): `closed` is each closed ticket's id and its note's last
 * update. Weeks run from 1 January in sevens; the year's last day or two fold into the 52nd.
 * `now` is the week the data was read; a closed ticket with no date is counted apart.
 */
export function weeksOf(closed: Iterable<[string, string]>, dataDate: string): Weeks {
  const DAY = 86400000;
  const year = String(dataDate).slice(0, 4);
  const weekOf = (date: string): number => Math.min(51, Math.floor((Date.parse(date) - Date.parse(`${date.slice(0, 4)}-01-01`)) / DAY / 7));
  const weeks: Weeks = { year, now: dataDate ? weekOf(dataDate) : -1, closed: Array.from({ length: 52 }, () => []), undated: 0 };
  for (const [id, updated] of closed) {
    if (!updated) weeks.undated += 1;
    else if (updated.startsWith(year)) weeks.closed[weekOf(updated)]!.push(id);
  }
  return weeks;
}

/**
 * The feature a design stands with (TASK-0179): of the features that name it in their lists,
 * the one in focus if it is among them, else the lowest-numbered; with none, the same choice
 * among the features of the tasks that name it; with none, among the features its own
 * `implements:` names. `isFeature` says which ids are features of the workspace.
 */
export function designFeature({ namedBy = [], viaTasks = [], implementsList = [], focus = null, isFeature = () => true }: { namedBy?: readonly string[]; viaTasks?: readonly string[]; implementsList?: readonly string[]; focus?: string | null; isFeature?: (id: string) => boolean }): string | null {
  const prefer = (list: readonly string[]): string | undefined => {
    const features = [...new Set(list)].filter(isFeature);
    if (features.length === 0) return undefined;
    return focus !== null && features.includes(focus) ? focus : features.sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))[0];
  };
  return prefer(namedBy) ?? prefer(viaTasks) ?? prefer(implementsList) ?? null;
}
