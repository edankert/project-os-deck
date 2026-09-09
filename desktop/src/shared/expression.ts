/**
 * The seeded expression language: what a filter, a sort key and a formula are
 * written in.
 *
 * The seed is the subset of Obsidian's Bases language MEASURED across the
 * twelve live base files — ten in `~/Notes`, two in the cockpit's
 * `docs/__bases__/` — on 2026-09-08. It is Deck's language, not Obsidian's:
 * Edwin's answer that day was that the subset "is a subset which we know
 * cannot represent everything ... we will need to be able to extend it probably
 * significantly", so what this module owes is a NAMED boundary rather than a
 * complete one.
 *
 * **Unsupported is a result, not a failure.** A construct outside the seed
 * returns the notes the evaluator could still select plus a report naming the
 * construct and where it appeared. It never returns an empty list on its own,
 * because an empty view and a broken view look identical on screen and only
 * one of them is a bug (RISK-0003: two programs now evaluate this language over
 * the same files, and they can disagree — the mitigation is that the seed is
 * named and what falls outside it is reported).
 */
import { linkTarget, type NoteRecord } from './records.js';

// ---- the tokens ----

type TokenKind = 'number' | 'string' | 'name' | 'punct' | 'end';

interface Token {
  kind: TokenKind;
  text: string;
  /** Character offset, so a report can say where. */
  at: number;
}

const PUNCT = [
  '&&', '||', '==', '!=', '<=', '>=',
  '(', ')', '[', ']', ',', '.', '+', '-', '*', '/', '<', '>', '!',
];

export class ExpressionError extends Error {
  readonly at: number;
  constructor(message: string, at: number) {
    super(message);
    this.name = 'ExpressionError';
    this.at = at;
  }
}

function tokenise(source: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i] as string;
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const start = i;
      i += 1;
      let text = '';
      while (i < source.length && source[i] !== ch) {
        if (source[i] === '\\' && ch === '"') {
          i += 1;
          text += source[i] ?? '';
        } else {
          text += source[i];
        }
        i += 1;
      }
      if (i >= source.length) throw new ExpressionError('a string that is never closed', start);
      i += 1;
      out.push({ kind: 'string', text, at: start });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      const start = i;
      while (i < source.length && /[0-9.]/.test(source[i] as string)) i += 1;
      out.push({ kind: 'number', text: source.slice(start, i), at: start });
      continue;
    }
    if (/[A-Za-z_@]/.test(ch)) {
      const start = i;
      while (i < source.length && /[A-Za-z0-9_@-]/.test(source[i] as string)) i += 1;
      out.push({ kind: 'name', text: source.slice(start, i), at: start });
      continue;
    }
    const two = source.slice(i, i + 2);
    if (PUNCT.includes(two)) {
      out.push({ kind: 'punct', text: two, at: i });
      i += 2;
      continue;
    }
    if (PUNCT.includes(ch)) {
      out.push({ kind: 'punct', text: ch, at: i });
      i += 1;
      continue;
    }
    throw new ExpressionError(`"${ch}" has no meaning here`, i);
  }
  out.push({ kind: 'end', text: '', at: source.length });
  return out;
}

// ---- the tree ----

export type Node =
  | { kind: 'literal'; value: unknown }
  | { kind: 'name'; name: string; at: number }
  | { kind: 'property'; of: Node; name: string; at: number }
  | { kind: 'call'; callee: Node; args: Node[]; at: number }
  | { kind: 'method'; of: Node; name: string; args: Node[]; at: number }
  | { kind: 'unary'; op: string; operand: Node; at: number }
  | { kind: 'binary'; op: string; left: Node; right: Node; at: number }
  | { kind: 'list'; items: Node[]; at: number };

const BINDING: Record<string, number> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
};

class Parser {
  private readonly tokens: Token[];
  private at = 0;

  constructor(source: string) {
    this.tokens = tokenise(source);
  }

  private peek(): Token {
    return this.tokens[this.at] as Token;
  }

  private take(): Token {
    const token = this.peek();
    this.at += 1;
    return token;
  }

  private expect(text: string): Token {
    const token = this.take();
    if (token.text !== text) throw new ExpressionError(`expected "${text}" and found "${token.text}"`, token.at);
    return token;
  }

  parse(): Node {
    const node = this.expression(0);
    const rest = this.peek();
    if (rest.kind !== 'end') throw new ExpressionError(`"${rest.text}" is left over at the end`, rest.at);
    return node;
  }

  private expression(minBinding: number): Node {
    let left = this.unary();
    for (;;) {
      const token = this.peek();
      if (token.kind !== 'punct') break;
      const binding = BINDING[token.text];
      if (binding === undefined || binding < minBinding) break;
      this.take();
      const right = this.expression(binding + 1);
      left = { kind: 'binary', op: token.text, left, right, at: token.at };
    }
    return left;
  }

  private unary(): Node {
    const token = this.peek();
    if (token.kind === 'punct' && (token.text === '!' || token.text === '-')) {
      this.take();
      return { kind: 'unary', op: token.text, operand: this.unary(), at: token.at };
    }
    return this.postfix(this.primary());
  }

  private postfix(node: Node): Node {
    let current = node;
    for (;;) {
      const token = this.peek();
      if (token.kind === 'punct' && token.text === '.') {
        this.take();
        const name = this.take();
        if (name.kind !== 'name') throw new ExpressionError('a property name was expected after "."', name.at);
        if (this.peek().text === '(') {
          const args = this.arguments();
          current = { kind: 'method', of: current, name: name.text, args, at: name.at };
        } else {
          current = { kind: 'property', of: current, name: name.text, at: name.at };
        }
        continue;
      }
      if (token.kind === 'punct' && token.text === '(') {
        const args = this.arguments();
        current = { kind: 'call', callee: current, args, at: token.at };
        continue;
      }
      return current;
    }
  }

  private arguments(): Node[] {
    this.expect('(');
    const args: Node[] = [];
    if (this.peek().text === ')') {
      this.take();
      return args;
    }
    for (;;) {
      args.push(this.expression(0));
      const next = this.take();
      if (next.text === ')') return args;
      if (next.text !== ',') throw new ExpressionError(`expected "," or ")" and found "${next.text}"`, next.at);
    }
  }

  private primary(): Node {
    const token = this.take();
    if (token.kind === 'number') return { kind: 'literal', value: Number(token.text) };
    if (token.kind === 'string') return { kind: 'literal', value: token.text };
    if (token.kind === 'name') {
      if (token.text === 'true') return { kind: 'literal', value: true };
      if (token.text === 'false') return { kind: 'literal', value: false };
      if (token.text === 'null') return { kind: 'literal', value: null };
      return { kind: 'name', name: token.text, at: token.at };
    }
    if (token.text === '(') {
      const inner = this.expression(0);
      this.expect(')');
      return inner;
    }
    if (token.text === '[') {
      const items: Node[] = [];
      if (this.peek().text === ']') {
        this.take();
        return { kind: 'list', items, at: token.at };
      }
      for (;;) {
        items.push(this.expression(0));
        const next = this.take();
        if (next.text === ']') return { kind: 'list', items, at: token.at };
        if (next.text !== ',') throw new ExpressionError(`expected "," or "]" and found "${next.text}"`, next.at);
      }
    }
    throw new ExpressionError(`"${token.text}" cannot start an expression`, token.at);
  }
}

export function parseExpression(source: string): Node {
  return new Parser(source).parse();
}

// ---- the seed ----

/**
 * Every function the twelve measured base files call.
 *
 * The list is exported so the suite can walk IT rather than a list somebody
 * wrote beside the suite: a function nobody implemented then fails by being in
 * this list and unsupported, instead of passing by being in neither.
 */
export const SEED_FUNCTIONS: readonly string[] = Object.freeze([
  // Implemented.
  'link', 'date', 'today', 'now', 'number', 'list', 'if', 'min', 'max',
  'contains', 'containsAny', 'containsAll', 'isEmpty', 'notEmpty',
  'inFolder', 'hasLink', 'asLink', 'startsWith', 'endsWith', 'length',
  'floor', 'round', 'abs', 'toString', 'lower', 'upper',
  // Named and NOT implemented, each for a reason the report gives:
  // the TaskNotes formula block's list pipeline and date formatting.
  'map', 'filter', 'reduce', 'format', 'image', 'icon', 'sort', 'unique', 'slice', 'split', 'join',
]);

/** The functions this build evaluates. Anything else in the seed is reported. */
const IMPLEMENTED = new Set([
  'link', 'date', 'today', 'now', 'number', 'list', 'if', 'min', 'max',
  'contains', 'containsAny', 'containsAll', 'isEmpty', 'notEmpty',
  'inFolder', 'hasLink', 'asLink', 'startsWith', 'endsWith', 'length',
  'floor', 'round', 'abs', 'toString', 'lower', 'upper',
]);

export function isImplemented(name: string): boolean {
  return IMPLEMENTED.has(name);
}

/** A construct the evaluator met and could not run. */
export interface Unsupported {
  construct: string;
  where: string;
  reason: string;
}

export interface EvalContext {
  record: NoteRecord;
  /** Formulas by name, already parsed, for `formula.x`. */
  formulas: Record<string, Node>;
  /**
   * The note a view is embedded in, for `this.`.
   *
   * Null on every Deck surface today. A `this.`-relative filter is then
   * REPORTED by name rather than evaluated against nothing — the vault's
   * sidebar base filters relative to the note it is embedded in, and Deck has
   * no such note until a surface gives `this.` a meaning.
   */
  this: NoteRecord | null;
  /** Today, injectable so a suite is not a clock. */
  today?: Date;
  /**
   * What sits between the workspace root and a record's path, usually `docs`.
   *
   * A base file's `inFolder` is written against the vault, whose root is the
   * repository; a record's path is relative to the docs root. Without this the
   * two never line up (ISS-0027).
   */
  pathPrefix?: string;
  unsupported: Unsupported[];
  /** Where in the description this expression came from, for a report. */
  where: string;
}

/** A value the evaluator could not produce, told apart from a real `null`. */
export const UNSUPPORTED = Symbol('unsupported');

export function evaluate(node: Node, context: EvalContext): unknown {
  switch (node.kind) {
    case 'literal':
      return node.value;
    case 'list':
      return node.items.map((item) => evaluate(item, context));
    case 'name':
      return readName(node.name, context);
    case 'property':
      return readProperty(node, context);
    case 'unary': {
      const value = evaluate(node.operand, context);
      if (value === UNSUPPORTED) return UNSUPPORTED;
      if (node.op === '!') return !truthy(value);
      return -Number(value);
    }
    case 'binary':
      return binary(node, context);
    case 'call':
      return call(node, context);
    case 'method':
      return method(node, context);
    default:
      return UNSUPPORTED;
  }
}

function report(context: EvalContext, construct: string, reason: string): typeof UNSUPPORTED {
  // One report per construct per expression: a filter run over 2715 notes must
  // not produce 2715 identical lines.
  if (!context.unsupported.some((u) => u.construct === construct && u.where === context.where)) {
    context.unsupported.push({ construct, where: context.where, reason });
  }
  return UNSUPPORTED;
}

/**
 * A bare name is a frontmatter key.
 *
 * `note.` is the same place, spelled explicitly; the namespace is how a base
 * file disambiguates, not a second place to look.
 */
function readName(name: string, context: EvalContext): unknown {
  if (name === 'file') return fileOf(context.record, context.pathPrefix ?? '');
  if (name === 'note') return context.record.frontmatter;
  if (name === 'this') {
    if (context.this === null) {
      return report(
        context,
        'this.',
        'a `this.`-relative filter names the note a view is embedded in, and no Deck surface has one yet',
      );
    }
    return { file: fileOf(context.this, context.pathPrefix ?? ''), ...context.this.frontmatter };
  }
  if (name === 'formula') return { __formulas: true };
  return context.record.frontmatter[name] ?? null;
}

/**
 * The `file` object, with the path Obsidian would show.
 *
 * A record's `relPath` is relative to the DOCS root, mirroring the sidecar. A
 * base file is written against the VAULT, whose root is the repository, so the
 * cockpit's own `NAVIGATION.base` says `file.inFolder("docs/__templates__")`
 * and Deck's paths start `__templates__/` — the exclusion never matched, and
 * that view selected fourteen notes here where the cockpit shows thirteen
 * (ISS-0027). `pathPrefix` is the docs root's own name, so a filter a person
 * wrote against their vault means the same thing in Deck.
 */
function fileOf(record: NoteRecord, prefix: string): Record<string, unknown> {
  const full = prefix === '' ? record.relPath : `${prefix}/${record.relPath}`;
  const folder = full.includes('/') ? full.slice(0, full.lastIndexOf('/')) : '';
  return {
    name: record.fileName,
    path: full,
    folder,
    ext: 'md',
    mtime: record.mtimeMs,
    ctime: record.mtimeMs,
    properties: record.frontmatter,
  };
}

function readProperty(node: Extract<Node, { kind: 'property' }>, context: EvalContext): unknown {
  if (node.of.kind === 'name' && node.of.name === 'formula') {
    const formula = context.formulas[node.name];
    if (formula === undefined) {
      return report(context, `formula.${node.name}`, `no formula called "${node.name}" is defined in this view`);
    }
    return evaluate(formula, context);
  }
  const target = evaluate(node.of, context);
  if (target === UNSUPPORTED) return UNSUPPORTED;
  if (target === null || target === undefined) return null;
  if (typeof target !== 'object') return null;
  return (target as Record<string, unknown>)[node.name] ?? null;
}

function binary(node: Extract<Node, { kind: 'binary' }>, context: EvalContext): unknown {
  const left = evaluate(node.left, context);
  if (left === UNSUPPORTED) return UNSUPPORTED;
  // `&&` and `||` still evaluate the right side, because an unsupported
  // construct on either side has to be reported even when the answer is
  // already known: the point is to name it, not to be fast.
  const right = evaluate(node.right, context);
  if (right === UNSUPPORTED) return UNSUPPORTED;
  switch (node.op) {
    case '&&':
      return truthy(left) && truthy(right);
    case '||':
      return truthy(left) || truthy(right);
    case '==':
      return same(left, right);
    case '!=':
      return !same(left, right);
    case '+':
      return add(left, right);
    case '-':
      return subtract(left, right);
    case '*':
      return Number(left) * Number(right);
    case '/':
      return Number(left) / Number(right);
    default:
      return compare(node.op, left, right);
  }
}

function call(node: Extract<Node, { kind: 'call' }>, context: EvalContext): unknown {
  if (node.callee.kind !== 'name') {
    return report(context, 'a call on something that is not a function', 'only a named function can be called');
  }
  const name = node.callee.name;
  if (!IMPLEMENTED.has(name)) {
    return report(
      context,
      `${name}()`,
      SEED_FUNCTIONS.includes(name)
        ? `${name}() is in the measured language and this build does not evaluate it`
        : `${name}() is not part of the language Deck reads`,
    );
  }
  // `if` chooses a branch, so its arguments cannot all be evaluated first.
  if (name === 'if') {
    const condition = evaluate(node.args[0] as Node, context);
    if (condition === UNSUPPORTED) return UNSUPPORTED;
    const branch = truthy(condition) ? node.args[1] : node.args[2];
    return branch === undefined ? null : evaluate(branch, context);
  }
  const args = node.args.map((a) => evaluate(a, context));
  if (args.some((a) => a === UNSUPPORTED)) return UNSUPPORTED;
  return apply(name, null, args, context);
}

function method(node: Extract<Node, { kind: 'method' }>, context: EvalContext): unknown {
  const target = evaluate(node.of, context);
  if (target === UNSUPPORTED) return UNSUPPORTED;
  if (!IMPLEMENTED.has(node.name)) {
    return report(
      context,
      `.${node.name}()`,
      SEED_FUNCTIONS.includes(node.name)
        ? `.${node.name}() is in the measured language and this build does not evaluate it`
        : `.${node.name}() is not part of the language Deck reads`,
    );
  }
  const args = node.args.map((a) => evaluate(a, context));
  if (args.some((a) => a === UNSUPPORTED)) return UNSUPPORTED;
  return apply(node.name, target, args, context);
}

const DAY = 86_400_000;

function apply(name: string, target: unknown, args: unknown[], context: EvalContext): unknown {
  const first = target === null ? args[0] : target;
  const rest = target === null ? args.slice(1) : args;
  switch (name) {
    // `link("Chapter")` and `"[[Chapter]]"` and `[[Chapter|shown]]` are one
    // thing. Which spelling is canonical is decided HERE, once, and every
    // comparison goes through it — three branches is how they drift.
    case 'link':
      return { link: linkTarget(String(first ?? '')) };
    case 'date':
      return toDate(first);
    case 'today': {
      const now = context.today ?? new Date();
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    }
    case 'now':
      return (context.today ?? new Date()).getTime();
    case 'number':
      return toNumber(first);
    case 'list':
      return asList(first);
    case 'min':
      return Math.min(...[first, ...rest].map((v) => Number(v)));
    case 'max':
      return Math.max(...[first, ...rest].map((v) => Number(v)));
    // `contains` means two things and both are Obsidian's: membership in a
    // list, and a SUBSTRING of a string. Treating every receiver as a list
    // made `title.contains("Draft")` false over `title: "Draft One"`
    // (ISS-0027), which is a wrong answer produced confidently.
    case 'contains':
      return containsOne(first, rest[0]);
    case 'containsAny':
      return rest.some((wanted) => containsOne(first, wanted));
    case 'containsAll':
      return rest.every((wanted) => containsOne(first, wanted));
    case 'isEmpty':
      return first === null || first === undefined || first === '' || (Array.isArray(first) && first.length === 0);
    case 'notEmpty':
      return !(first === null || first === undefined || first === '' || (Array.isArray(first) && first.length === 0));
    case 'inFolder': {
      const folder = String(rest[0] ?? '');
      const path = String((first as Record<string, unknown>)?.['path'] ?? first ?? '');
      return path === folder || path.startsWith(`${folder}/`);
    }
    // `file.hasLink(x)` asks whether THIS FILE links to x, and
    // `field.hasLink(x)` asks about that field. It used to search the whole
    // record whatever the receiver was, so `owner.hasLink(link("Zed"))` was
    // true when `owner` was `[[Ann]]` and some other field held `[[Zed]]`
    // (ISS-0027).
    case 'hasLink': {
      const wanted = linkTarget(nameOf(rest[0]));
      if (wanted === '') return false;
      const receiver = target === null ? args[0] : target;
      if (isFileObject(receiver)) return linksIn(context.record).includes(wanted);
      return linksUnder(receiver).includes(wanted);
    }
    case 'asLink':
      return `[[${nameOf(first)}]]`;
    case 'startsWith':
      return String(first ?? '').startsWith(String(rest[0] ?? ''));
    case 'endsWith':
      return String(first ?? '').endsWith(String(rest[0] ?? ''));
    case 'length':
      return Array.isArray(first) ? first.length : String(first ?? '').length;
    case 'floor':
      return Math.floor(Number(first));
    case 'round':
      return Math.round(Number(first));
    case 'abs':
      return Math.abs(Number(first));
    case 'toString':
      return String(first ?? '');
    case 'lower':
      return String(first ?? '').toLowerCase();
    case 'upper':
      return String(first ?? '').toUpperCase();
    default:
      return UNSUPPORTED;
  }
}

/**
 * Whether a value contains another: membership for a list, a substring for a
 * string, and equality for anything else.
 */
function containsOne(haystack: unknown, needle: unknown): boolean {
  if (Array.isArray(haystack)) return haystack.some((v) => same(v, needle));
  if (typeof haystack === 'string') {
    const inner = comparable(needle);
    // A link compares as its target, so `type.contains(link("Chapter"))` still
    // matches `type: "[[Chapter]]"` — the wikilink brackets are not part of
    // what either side means.
    if (typeof inner === 'string') {
      return linkTarget(haystack).includes(inner) || haystack.includes(inner);
    }
    return same(haystack, needle);
  }
  return same(haystack, needle);
}

/** Whether this is the `file` object rather than one of the note's own fields. */
function isFileObject(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof (value as Record<string, unknown>)['path'] === 'string' &&
    'properties' in (value as Record<string, unknown>)
  );
}

/** Every wikilink a record's frontmatter names, for `file.hasLink`. */
function linksIn(record: NoteRecord): string[] {
  return linksUnder(record.frontmatter);
}

/** Every wikilink under one value, however deeply it is nested. */
function linksUnder(value: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === 'string') {
      if (v.trim().startsWith('[[')) out.push(linkTarget(v));
      return;
    }
    if (Array.isArray(v)) {
      for (const entry of v) walk(entry);
      return;
    }
    if (v !== null && typeof v === 'object') for (const entry of Object.values(v)) walk(entry);
  };
  walk(value);
  return out;
}

function nameOf(value: unknown): string {
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj['link'] === 'string') return obj['link'];
    if (typeof obj['name'] === 'string') return obj['name'];
  }
  return String(value ?? '');
}

/** A date as milliseconds, from an ISO string or a number. */
function toDate(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(parsed) ? null : parsed;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const date = toDate(value);
    if (date !== null && /^\d{4}-\d{2}/.test(value)) return date;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function asList(value: unknown): unknown[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function truthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (value === '' || value === 0) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Equality, with the three spellings of "this note is of type X" normalised.
 *
 * `type.contains(link("Chapter"))`, `type == link("Task")` and
 * `note.type == "[[Task]]"` all appear in the vault and mean one thing to a
 * person. They mean one thing here too, and the rule is this function rather
 * than three branches.
 */
export function same(a: unknown, b: unknown): boolean {
  const left = comparable(a);
  const right = comparable(b);
  if (Array.isArray(left) && !Array.isArray(right)) return left.some((v) => same(v, right));
  if (!Array.isArray(left) && Array.isArray(right)) return right.some((v) => same(left, v));
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((v, i) => same(v, right[i]));
  }
  // Case-SENSITIVE, because Obsidian's is. Lower-casing both sides made
  // `status == "Done"` match `status: done` (ISS-0027), and it bought nothing:
  // the three type spellings agree because `comparable` reduces a wikilink to
  // its target, not because of case.
  return left === right;
}

/** A value reduced to what it compares as: a link becomes its target. */
function comparable(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(comparable);
  if (value !== null && typeof value === 'object') {
    const link = (value as Record<string, unknown>)['link'];
    if (typeof link === 'string') return link;
    return value;
  }
  if (typeof value === 'string') return linkTarget(value);
  return value;
}

function compare(op: string, a: unknown, b: unknown): boolean {
  const left = toNumber(a) ?? (typeof a === 'string' ? a : null);
  const right = toNumber(b) ?? (typeof b === 'string' ? b : null);
  if (left === null || right === null) return false;
  switch (op) {
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    default:
      return left >= right;
  }
}

/**
 * Addition, which is also date arithmetic: `today() + "1 week"`.
 *
 * The durations are the ones the measured files use — days and weeks, written
 * either as `"1 week"` or as `"7d"`. Anything else falls through to ordinary
 * addition rather than being invented.
 */
function add(a: unknown, b: unknown): unknown {
  if (typeof a === 'number' && typeof b === 'string') {
    const ms = duration(b);
    if (ms !== null) return a + ms;
  }
  if (typeof a === 'string' && typeof b === 'string' && duration(b) === null) return a + b;
  if (typeof a === 'number' && typeof b === 'number') return a + b;
  return String(a ?? '') + String(b ?? '');
}

function subtract(a: unknown, b: unknown): unknown {
  if (typeof a === 'number' && typeof b === 'string') {
    const ms = duration(b);
    if (ms !== null) return a - ms;
  }
  return Number(a) - Number(b);
}

export function duration(text: string): number | null {
  const match = /^(-?\d+)\s*(d|day|days|w|week|weeks|h|hour|hours|m|month|months|y|year|years)$/i.exec(text.trim());
  if (match === null) return null;
  const n = Number(match[1]);
  const unit = (match[2] ?? '').toLowerCase();
  if (unit.startsWith('d')) return n * DAY;
  if (unit.startsWith('w')) return n * 7 * DAY;
  if (unit.startsWith('h')) return n * 3_600_000;
  if (unit.startsWith('mo') || unit === 'm' || unit.startsWith('month')) return n * 30 * DAY;
  if (unit.startsWith('y')) return n * 365 * DAY;
  return null;
}

/** Whether a record passes a filter expression. Unsupported never selects. */
export function matches(node: Node, context: EvalContext): boolean {
  const value = evaluate(node, context);
  if (value === UNSUPPORTED) return false;
  return truthy(value);
}
