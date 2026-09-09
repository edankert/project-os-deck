/**
 * A named vocabulary that a phase adds to.
 *
 * The address grammar guarantees one thing: an address cannot name something
 * Deck cannot draw. That guarantee used to come from a literal list of three
 * panel kinds in a module the parser read. A literal list keeps the guarantee
 * and loses the ability to grow — Glass adds a surface, Parity adds pages, and
 * each would have to remember to edit somebody else's file (TASK-0052).
 *
 * A vocabulary keeps exactly the same guarantee and moves the direction round.
 * The parser asks the vocabulary; the phase that BUILDS a kind registers it,
 * beside the thing it built. An unregistered value is refused by name, and the
 * refusal says what is registered, so a person reading it learns what Deck can
 * actually draw today rather than what somebody wrote down once.
 *
 * This is the shape FEAT-0007 already uses for views, where a provider chosen
 * by workspace kind returns the list and the renderer holds no names.
 */

/** One entry: the token an address carries, and what a person calls it. */
export interface VocabularyEntry {
  id: string;
  label: string;
}

/**
 * Ids are lower-case words joined by hyphens. Anything else cannot round-trip
 * through an address without being encoded, and a kind whose written form
 * needs encoding is a kind whose address a person cannot read.
 */
const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

export class Vocabulary {
  /** What this vocabulary is called in a refusal, e.g. "panel" or "surface". */
  readonly noun: string;
  private readonly entries = new Map<string, VocabularyEntry>();

  constructor(noun: string) {
    this.noun = noun;
  }

  /**
   * Add a kind. Registering the same id twice with the same label is a
   * no-operation, so a module loaded by both the main process and the renderer
   * can register what it built without either caring which ran first.
   */
  register(entry: VocabularyEntry): void {
    if (!ID_RE.test(entry.id)) {
      throw new Error(`"${entry.id}" cannot be a ${this.noun} id: lower case, digits and hyphens`);
    }
    const existing = this.entries.get(entry.id);
    if (existing !== undefined && existing.label !== entry.label) {
      throw new Error(`the ${this.noun} "${entry.id}" is already registered as "${existing.label}"`);
    }
    this.entries.set(entry.id, { id: entry.id, label: entry.label });
  }

  has(value: unknown): value is string {
    return typeof value === 'string' && this.entries.has(value);
  }

  label(id: string): string | null {
    return this.entries.get(id)?.label ?? null;
  }

  /** Registration order, which is the order a person is offered them in. */
  ids(): string[] {
    return [...this.entries.keys()];
  }

  all(): VocabularyEntry[] {
    return [...this.entries.values()].map((e) => ({ ...e }));
  }

  /**
   * Why an address may not carry this value, in a sentence.
   *
   * Naming what IS registered matters more than naming what is not: a phase
   * that has not registered its kind yet reads "no surface is registered",
   * which is the actual state of the program, rather than a list that happens
   * to be empty for a reason nobody wrote down.
   */
  refusal(value: string): string {
    const known = this.ids();
    if (known.length === 0) return `not a ${this.noun}: "${value}" (no ${this.noun} is registered)`;
    return `not a ${this.noun}: "${value}" (one of ${known.join(', ')})`;
  }
}
