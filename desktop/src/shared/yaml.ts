/**
 * A YAML subset, read without a dependency.
 *
 * Deck has no bundler and no runtime dependencies, and it needs to read two
 * kinds of YAML: the frontmatter of every note in a workspace (FEAT-0011) and
 * the `.base` files a vault keeps its views in (FEAT-0012). Both are written by
 * hand or by Obsidian, and both stay inside a small part of the language.
 *
 * **What this reads.** Block mappings and block sequences, nested by
 * indentation. Flow sequences (`[a, b]`) and flow mappings (`{a: 1}`). Quoted
 * scalars, single and double, with the escapes each form allows. Plain scalars,
 * with numbers, booleans and nulls recognised. Literal and folded block scalars
 * (`|`, `>`). Comments, whole-line and trailing. Keys containing dots, which is
 * how a base file writes `note.number` and `formula.character.summary`.
 *
 * **What it does not read, and says so.** Anchors and aliases (`&x`, `*x`),
 * tags (`!!str`), explicit keys (`? `), multiple documents in one file, and
 * merge keys. Each is REPORTED BY NAME with the line it was on, and the parse
 * continues. That rule is the same one the description parser and the evaluator
 * follow, and it is worth stating once: an unreadable construct that returns
 * nothing looks exactly like a file that is empty, and only one of the two is a
 * problem.
 *
 * **Dates stay strings.** A record travels to the renderer as JSON, where a
 * `Date` becomes an ISO string anyway; parsing one here would mean the same
 * value had two types depending on which side of the host it was read on. So a
 * date is the text that was written, and the evaluator's own `date()` is what
 * gives it a meaning.
 */

export interface YamlProblem {
  /** The construct, named: "an anchor", "a tag", "a second document". */
  construct: string;
  /** One-based, so it matches what an editor shows. */
  line: number;
  /** What was on that line, trimmed, for a person reading the report. */
  text: string;
}

export interface YamlResult {
  value: unknown;
  problems: YamlProblem[];
}

interface Line {
  indent: number;
  text: string;
  /** One-based line number in the original document. */
  number: number;
  /**
   * A blank line or a whole-line comment: nothing OUTSIDE a block scalar, and
   * content INSIDE one.
   *
   * These used to be dropped by the scan, before any reader ran, and a `|`
   * block scalar therefore lost every blank line and every line beginning with
   * a hash — silently, which is the worst way to be wrong (ISS-0025). They are
   * kept now and skipped where they mean nothing.
   */
  skip: boolean;
}

/** Read a YAML document. Never throws; what it cannot read, it names. */
export function parseYaml(source: string): YamlResult {
  const problems: YamlProblem[] = [];
  const lines = scan(source, problems);
  if (lines.length === 0) return { value: null, problems };
  const reader = new Reader(lines, problems);
  const value = reader.block(lines[0]?.indent ?? 0);
  // Anything the reader walked away from is REPORTED, never dropped in
  // silence. Seven notes in Your Trainer put a second list at column zero
  // under a key that already had one; the reader stops at the first of them,
  // and without this line every key after that point would vanish with
  // nothing said — which is the failure this whole module is written against.
  reader.reportLeftovers();
  return { value, problems };
}

/**
 * The frontmatter of a Markdown file, and the body after it.
 *
 * A file with no frontmatter is not an error: most of a vault has none, and a
 * note without it is still a note. `frontmatter` is then an empty object, which
 * is what "this note declares nothing" means.
 */
export interface Frontmatter {
  frontmatter: Record<string, unknown>;
  body: string;
  problems: YamlProblem[];
}

export function parseFrontmatter(text: string): Frontmatter {
  const normalised = text.replace(/^﻿/, '');
  if (!/^---[ \t]*\r?\n/.test(normalised)) {
    return { frontmatter: {}, body: normalised, problems: [] };
  }
  const firstBreak = normalised.indexOf('\n');
  const rest = normalised.slice(firstBreak + 1);
  // The closing fence is a line of exactly `---` or `...`, which is what every
  // writer of these files emits. A file whose fence never closes is reported
  // rather than read to the end as though the whole note were frontmatter.
  const close = /^(?:---|\.\.\.)[ \t]*$/m.exec(rest);
  if (close === null || close.index === undefined) {
    return {
      frontmatter: {},
      body: normalised,
      problems: [{ construct: 'frontmatter that is never closed', line: 1, text: '---' }],
    };
  }
  const block = rest.slice(0, close.index);
  const afterFence = rest.slice(close.index + close[0].length);
  const body = afterFence.startsWith('\n') ? afterFence.slice(1) : afterFence.replace(/^\r?\n/, '');
  const parsed = parseYaml(block);
  // Line numbers inside the block are one behind the file's, because of the
  // opening fence. A report a person cannot find in their editor is no report.
  const problems = parsed.problems.map((p) => ({ ...p, line: p.line + 1 }));
  if (parsed.value === null) return { frontmatter: {}, body, problems };
  if (typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    return {
      frontmatter: {},
      body,
      problems: [...problems, { construct: 'frontmatter that is not a set of keys', line: 2, text: '' }],
    };
  }
  return { frontmatter: parsed.value as Record<string, unknown>, body, problems };
}

/** The first `# ` heading in a body, which is a note's title when it declares none. */
export function firstHeading(body: string): string | null {
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      const title = trimmed.slice(2).trim();
      if (title !== '') return title;
    }
  }
  return null;
}

// ---- the reader ----

function scan(source: string, problems: YamlProblem[]): Line[] {
  const out: Line[] = [];
  const raw = source.split(/\r?\n/);
  for (let i = 0; i < raw.length; i += 1) {
    const text = raw[i] as string;
    const trimmed = text.trim();
    const skip = trimmed === '' || trimmed.startsWith('#');
    if (!skip && (trimmed === '---' || trimmed === '...')) {
      // A second document in one file. Deck reads the first and says so.
      problems.push({ construct: 'a second document in one file', line: i + 1, text: trimmed });
      break;
    }
    // Every line, including the blank ones and the comments: inside a block
    // scalar they are content, and only the reader knows where it is.
    out.push({
      indent: text.length - text.trimStart().length,
      text: skip ? text : trimmed,
      number: i + 1,
      skip,
    });
  }
  return out;
}

class Reader {
  private readonly lines: Line[];
  private readonly problems: YamlProblem[];
  private at = 0;

  constructor(lines: Line[], problems: YamlProblem[]) {
    this.lines = lines;
    this.problems = problems;
  }

  /**
   * The next line that means something, skipping blanks and comments.
   *
   * Every reader but `blockScalar` goes through here. That one walks the raw
   * array instead, because inside a block scalar a blank line and a line
   * starting with a hash are content (ISS-0025).
   */
  private peek(): Line | null {
    while (this.at < this.lines.length && (this.lines[this.at] as Line).skip) this.at += 1;
    return this.lines[this.at] ?? null;
  }

  /** Name every line the reader never consumed. */
  reportLeftovers(): void {
    for (; this.at < this.lines.length; this.at += 1) {
      const line = this.lines[this.at] as Line;
      if (line.skip) continue;
      this.problems.push({
        construct: 'a line the document has no place for',
        line: line.number,
        text: line.text,
      });
    }
  }

  /** A mapping or a sequence at this indentation, whichever the next line is. */
  block(indent: number): unknown {
    const line = this.peek();
    if (line === null) return null;
    if (line.text.startsWith('- ') || line.text === '-') return this.sequence(indent);
    return this.mapping(indent);
  }

  private sequence(indent: number): unknown[] {
    const out: unknown[] = [];
    for (;;) {
      const line = this.peek();
      if (line === null || line.indent < indent) break;
      if (!(line.text.startsWith('- ') || line.text === '-')) break;
      this.at += 1;
      // Where the item's content actually starts, which is not always two
      // columns in: `-   key: value` is legal and its continuation lines line
      // up under the key, not under a column this code assumed.
      const afterDash = line.text.slice(1);
      const lead = afterDash.length - afterDash.trimStart().length;
      const contentIndent = line.indent + 1 + lead;
      const rest = afterDash.trim();
      if (rest === '') {
        // The item's content is on the lines below it.
        const next = this.peek();
        if (next !== null && next.indent > line.indent) out.push(this.block(next.indent));
        else out.push(null);
        continue;
      }
      // `- key: value` opens a mapping whose first line is this one. The
      // mapping's indentation is where that first key starts, two columns in
      // from the dash, which is what makes its continuation lines line up.
      // `- key: value` opens a mapping and `- - 1` opens a nested sequence.
      // Both are the same trick: rewrite this line as though its content
      // started at its own column, and read a block there.
      if (isMappingStart(rest) || rest.startsWith('- ') || rest === '-') {
        this.lines[this.at - 1] = { indent: contentIndent, text: rest, number: line.number, skip: false };
        this.at -= 1;
        out.push(this.block(contentIndent));
        continue;
      }
      out.push(this.inlineValue(rest, line));
    }
    return out;
  }

  private mapping(indent: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (;;) {
      const line = this.peek();
      if (line === null || line.indent < indent) break;
      if (line.text.startsWith('- ') || line.text === '-') break;
      if (line.indent > indent) {
        // Deeper than the mapping it is in, and not the value of anything:
        // this is a file whose indentation does not describe a shape.
        this.problems.push({ construct: 'a line indented under nothing', line: line.number, text: line.text });
        this.at += 1;
        continue;
      }
      const split = splitKey(line.text);
      if (split === null) {
        this.problems.push({ construct: 'a line that is neither a key nor an item', line: line.number, text: line.text });
        this.at += 1;
        continue;
      }
      this.at += 1;
      const [key, rest] = split;
      if (rest === '') {
        out[key] = this.valueBelow(line, indent);
        continue;
      }
      if (rest === '|' || rest === '>' || /^[|>][-+]?\d*$/.test(rest)) {
        out[key] = this.blockScalar(rest.startsWith('>'), line.indent);
        continue;
      }
      out[key] = this.inlineValue(this.folded(rest, line), line);
    }
    return out;
  }

  /**
   * A plain scalar continued on the lines below it, joined with spaces.
   *
   * YAML calls this line folding, and Obsidian writes it whenever a value is
   * long: a `summary:` running to three lines is one sentence, not one line
   * and two orphans. Only a PLAIN scalar folds — a flow collection and a
   * quoted scalar are already delimited — and a continuation line is one that
   * is more indented and is neither a key nor a sequence item, which is
   * exactly what YAML's own rule comes to here.
   */
  private folded(first: string, line: Line): string {
    // A flow collection may run over several lines: `tasks: [` and then one
    // quoted wikilink per line. Twenty-seven notes in Your Trainer are written
    // that way, so this is a shape Deck meets rather than one it imagines.
    if (first.startsWith('[') || first.startsWith('{')) return this.flowAcross(first, line);
    if (first.startsWith('"') || first.startsWith("'")) return first;
    const parts = [first];
    for (;;) {
      const next = this.peek();
      if (next === null || next.indent <= line.indent) break;
      if (splitKey(next.text) !== null) break;
      // A more-indented `- ` line is NOT a sequence item here. This key
      // already has a scalar value, and YAML has no way for it to have a
      // sequence as well, so the line continues the scalar — which is what
      // PyYAML does. Breaking here instead abandoned the rest of the document
      // and cost twenty-two of Your Trainer's notes their relationship fields
      // (ISS-0024).
      parts.push(next.text);
      this.at += 1;
    }
    return parts.join(' ');
  }

  /**
   * Gather a flow collection that spans lines, until its brackets balance.
   *
   * Stops at the end of the document rather than running away: an unbalanced
   * collection comes back as the text it was, which `parseScalarOrFlow` then
   * keeps as a string instead of inventing a shape the file does not have.
   */
  private flowAcross(first: string, line: Line): string {
    if (balanced(first)) return first;
    const parts = [first];
    for (;;) {
      const next = this.peek();
      // `>=`, not `>`: the closing bracket is routinely written back at the
      // key's own column, and PyYAML refuses those files. Deck reads them,
      // which is a difference the type-count fixture records by name rather
      // than one that silently makes two applications disagree.
      if (next === null || next.indent < line.indent) break;
      parts.push(next.text);
      this.at += 1;
      if (balanced(parts.join(' '))) break;
    }
    return parts.join(' ');
  }

  /** What follows a `key:` with nothing after it. */
  private valueBelow(line: Line, indent: number): unknown {
    const next = this.peek();
    if (next === null) return null;
    // A sequence may sit at the key's OWN indentation, which is legal YAML and
    // is how most of this repository's notes are written.
    if (next.indent === indent && (next.text.startsWith('- ') || next.text === '-')) {
      return this.sequence(indent);
    }
    if (next.indent > line.indent) return this.block(next.indent);
    return null;
  }

  /**
   * The lines under a `|` or `>`, as content.
   *
   * Walks the RAW array rather than `peek`, because inside a block scalar
   * there are no comments and no blank-line elision: a blank line is a
   * paragraph break and a line starting with a hash is a Markdown heading.
   *
   * Indentation is measured from the first non-blank line and stripped from
   * every line, which is what YAML calls the block's indentation indicator
   * when it is detected rather than written. A blank line inside the block
   * belongs to the block even though it is not indented at all.
   */
  private blockScalar(folded: boolean, ownerIndent: number): string {
    const parts: string[] = [];
    let base: number | null = null;
    for (;;) {
      const line = this.lines[this.at];
      if (line === undefined) break;
      const blank = line.skip && line.text.trim() === '';
      if (!blank && line.indent <= ownerIndent) break;
      if (blank) {
        // A blank line is inside the block only if the block continues after
        // it; trailing blanks belong to whatever comes next.
        const resumes = this.lines
          .slice(this.at + 1)
          .find((l) => !(l.skip && l.text.trim() === ''));
        if (resumes === undefined || resumes.indent <= ownerIndent) break;
        parts.push('');
        this.at += 1;
        continue;
      }
      if (base === null) base = line.indent;
      parts.push(' '.repeat(Math.max(0, line.indent - base)) + line.text.trim());
      this.at += 1;
    }
    // A literal scalar keeps its line breaks and its trailing newline, which
    // is YAML's default "clip" behaviour. A folded one joins its lines with
    // spaces and keeps its paragraph breaks.
    if (parts.length === 0) return '';
    if (!folded) return `${parts.join('\n')}\n`;
    const paragraphs: string[] = [];
    let current: string[] = [];
    for (const part of parts) {
      if (part === '') {
        paragraphs.push(current.join(' '));
        current = [];
        continue;
      }
      current.push(part);
    }
    paragraphs.push(current.join(' '));
    return `${paragraphs.join('\n\n')}\n`;
  }

  private inlineValue(text: string, line: Line): unknown {
    const flagged = named(text);
    if (flagged !== null) {
      this.problems.push({ construct: flagged, line: line.number, text });
      return null;
    }
    // A flow collection that will not parse comes back as the TEXT it was,
    // which is the safe answer and a silent one. Saying so is the point: a
    // note in Your Trainer has `tasks: ["[[A, "[[B]]"]]", ...]` — one quote in
    // the wrong place — and read as text it becomes a list of no tasks with
    // nothing to read about why.
    const trimmed = text.trim();
    if ((trimmed.startsWith('[') || trimmed.startsWith('{')) && typeof parseScalarOrFlow(trimmed) === 'string') {
      this.problems.push({ construct: 'a list or map that will not parse', line: line.number, text: trimmed });
    }
    return parseScalarOrFlow(text);
  }
}

/** Whether every bracket a flow collection opened has been closed. */
function balanced(text: string): boolean {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] as string;
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '[' || ch === '{') depth += 1;
    else if (ch === ']' || ch === '}') depth -= 1;
  }
  return depth <= 0;
}

/** Constructs this reader does not implement, named rather than guessed at. */
function named(text: string): string | null {
  if (/^&\S/.test(text)) return 'an anchor';
  if (/^\*\S/.test(text)) return 'an alias';
  if (/^!/.test(text)) return 'a tag';
  if (/^\?\s/.test(text)) return 'an explicit key';
  return null;
}

function isMappingStart(text: string): boolean {
  return splitKey(text) !== null;
}

/**
 * Split `key: value` into its two halves, or return null when the line is not
 * a mapping entry at all.
 *
 * The colon that separates them is the first one followed by a space or end of
 * line, and never one inside quotes. `a: b: c` is a key `a` with the value
 * `b: c`, which is what YAML says and what a formula like
 * `if(x, "a: b", "c")` needs.
 */
export function splitKey(text: string): [string, string] | null {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    // A flow collection in the KEY position is not something these files use,
    // and stopping here keeps `[a, b]` from being read as a key.
    if (i === 0 && (ch === '[' || ch === '{')) return null;
    if (ch !== ':') continue;
    const after = text[i + 1];
    if (after !== undefined && after !== ' ' && after !== '\t') continue;
    const key = text.slice(0, i).trim();
    if (key === '') return null;
    return [unquote(key), stripTrailingComment(text.slice(i + 1)).trim()];
  }
  return null;
}

/**
 * Drop a trailing comment, which YAML says is a `#` preceded by a space and
 * outside quotes.
 *
 * The "preceded by a space" part is what keeps a URL fragment and a colour
 * (`#ff0000`) intact.
 */
function stripTrailingComment(text: string): string {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '#' && (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\t')) {
      return text.slice(0, i);
    }
  }
  return text;
}

/** A scalar, a flow sequence or a flow mapping — whatever this text is. */
export function parseScalarOrFlow(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = parseFlow(trimmed);
    if (parsed !== undefined) return parsed;
    // An unclosed flow collection is text, not a collection. Reading it as one
    // would invent a shape the file does not have.
    return trimmed;
  }
  return parseScalar(trimmed);
}

function parseFlow(text: string): unknown | undefined {
  const state = { at: 0, text };
  const value = readFlow(state);
  if (value === undefined) return undefined;
  skipSpace(state);
  return state.at === text.length ? value : undefined;
}

interface Cursor {
  at: number;
  text: string;
}

function skipSpace(cursor: Cursor): void {
  while (cursor.at < cursor.text.length && /\s/.test(cursor.text[cursor.at] as string)) cursor.at += 1;
}

function readFlow(cursor: Cursor): unknown | undefined {
  skipSpace(cursor);
  const ch = cursor.text[cursor.at];
  if (ch === '[') return readFlowSequence(cursor);
  if (ch === '{') return readFlowMapping(cursor);
  return readFlowScalar(cursor);
}

function readFlowSequence(cursor: Cursor): unknown[] | undefined {
  cursor.at += 1;
  const out: unknown[] = [];
  for (;;) {
    skipSpace(cursor);
    if (cursor.at >= cursor.text.length) return undefined;
    if (cursor.text[cursor.at] === ']') {
      cursor.at += 1;
      return out;
    }
    const value = readFlow(cursor);
    if (value === undefined) return undefined;
    out.push(value);
    skipSpace(cursor);
    if (cursor.text[cursor.at] === ',') {
      cursor.at += 1;
      continue;
    }
    if (cursor.text[cursor.at] === ']') {
      cursor.at += 1;
      return out;
    }
    return undefined;
  }
}

function readFlowMapping(cursor: Cursor): Record<string, unknown> | undefined {
  cursor.at += 1;
  const out: Record<string, unknown> = {};
  for (;;) {
    skipSpace(cursor);
    if (cursor.at >= cursor.text.length) return undefined;
    if (cursor.text[cursor.at] === '}') {
      cursor.at += 1;
      return out;
    }
    const key = readFlow(cursor);
    if (key === undefined) return undefined;
    skipSpace(cursor);
    if (cursor.text[cursor.at] !== ':') return undefined;
    cursor.at += 1;
    const value = readFlow(cursor);
    if (value === undefined) return undefined;
    out[String(key)] = value;
    skipSpace(cursor);
    if (cursor.text[cursor.at] === ',') {
      cursor.at += 1;
      continue;
    }
    if (cursor.text[cursor.at] === '}') {
      cursor.at += 1;
      return out;
    }
    return undefined;
  }
}

function readFlowScalar(cursor: Cursor): unknown | undefined {
  const quote = cursor.text[cursor.at];
  if (quote === '"' || quote === "'") {
    const end = findClosingQuote(cursor.text, cursor.at);
    if (end === -1) return undefined;
    const raw = cursor.text.slice(cursor.at, end + 1);
    cursor.at = end + 1;
    return unquote(raw);
  }
  const start = cursor.at;
  while (cursor.at < cursor.text.length && !',]}:'.includes(cursor.text[cursor.at] as string)) cursor.at += 1;
  const raw = cursor.text.slice(start, cursor.at).trim();
  if (raw === '') return undefined;
  return parseScalar(raw);
}

function findClosingQuote(text: string, start: number): number {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === '\\' && quote === '"') {
      i += 1;
      continue;
    }
    if (text[i] !== quote) continue;
    if (quote === "'" && text[i + 1] === "'") {
      i += 1;
      continue;
    }
    return i;
  }
  return -1;
}

const NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/;

/**
 * A plain scalar's type.
 *
 * `true` and `false` are booleans; `yes`, `no`, `on` and `off` are NOT, because
 * YAML 1.2 dropped them and a note whose `status: no` became `false` would be a
 * note nobody could find. That is the kind of quiet re-typing this parser has
 * to avoid rather than replicate.
 */
export function parseScalar(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === '' || trimmed === '~' || trimmed === 'null' || trimmed === 'Null' || trimmed === 'NULL') return null;
  if (trimmed === 'true' || trimmed === 'True' || trimmed === 'TRUE') return true;
  if (trimmed === 'false' || trimmed === 'False' || trimmed === 'FALSE') return false;
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) return unquote(trimmed);
  if (NUMBER_RE.test(trimmed)) return Number(trimmed);
  return trimmed;
}

/** Strip the quotes a scalar was written with, and undo their escapes. */
export function unquote(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    // ONE pass, not a chain of replacements. A chain reads `\\n` — an escaped
    // backslash followed by the letter n — as an escaped newline, because the
    // `\n` rule runs before the `\\` rule and there is no order that fixes
    // it: whichever runs first eats the other's input (ISS-0025).
    const source = trimmed.slice(1, -1);
    let out = '';
    for (let i = 0; i < source.length; i += 1) {
      if (source[i] !== '\\') {
        out += source[i];
        continue;
      }
      const next = source[i + 1];
      i += 1;
      switch (next) {
        case 'n':
          out += '\n';
          break;
        case 't':
          out += '\t';
          break;
        case 'r':
          out += '\r';
          break;
        case '0':
          out += '\0';
          break;
        case 'u': {
          const hex = source.slice(i + 1, i + 5);
          if (/^[0-9a-fA-F]{4}$/.test(hex)) {
            out += String.fromCharCode(parseInt(hex, 16));
            i += 4;
          } else {
            out += 'u';
          }
          break;
        }
        case undefined:
          out += '\\';
          break;
        default:
          // `\\`, `\"`, `\/` and anything else: the character itself. YAML
          // refuses an unknown escape and Deck keeps it, which is the
          // forgiving direction and the one the index needs.
          out += next;
      }
    }
    return out;
  }
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}
