/**
 * The field's deal: which of a view's notes stand in which band (TASK-0029).
 *
 * The rule is the description's `band` table, applied note by note with
 * `bandOf` (TASK-0044). `dealField` fills the bands itself rather than calling
 * `bandCards`, because the field adds two things the navigator's banding does
 * not have: the neighbourhood's order and a pull's spare slots. This module
 * is Glass's use of the table: it turns
 * the groups the navigator already draws into one entry per note, fills in
 * what the desk and the hands say about each, orders the front band, and
 * counts what the front plane has to say out loud.
 *
 * Pure, so the whole deal is tested without a window.
 */
import type { CardGroup, CardModel } from './types.js';
import { type BandInputs, type BandTable, type HandInputs, NO_HAND, bandInputsFor, bandOf } from './description.js';

/** One note in the field, with the heading it is dealt under. */
export interface FieldEntry {
  card: CardModel;
  /** The navigator's heading the note sits under, which is its sector in the mid band. */
  groupKey: string;
  groupLabel: string;
  inputs: BandInputs;
}

export interface FieldDeal {
  front: FieldEntry[];
  mid: FieldEntry[];
  outer: FieldEntry[];
  deep: FieldEntry[];
  /** Front-band notes past the band's capacity. Counted and listed in the navigator, never demoted. */
  frontOverflow: number;
  /**
   * Mid-band notes past the middle AND the outer field.
   *
   * Was "counted, never sent behind" when the middle had nowhere to overflow
   * to. The middle's remainder is now PLACED, in the outer field (ADR-0005),
   * and this counts only what neither band had room for.
   */
  midOverflow: number;
  /** Notes a view's own rows sent to the outer field, past its capacity. Zero for every description here. */
  outerOverflow: number;
  /** Quiet-band notes past its capacity. The quiet band no longer promises to draw all of it. */
  deepOverflow: number;
  /** Every owed note the field holds, drawn or not: the count the front plane pins in place. */
  owed: number;
  /** Notes in the front band because a hand put them there and nothing else did. */
  handPlaced: number;
  /** Notes behind the person because a hand pushed them there. */
  pushedBehind: number;
}

/** The heading a neighbour from outside the view is dealt under. */
export const JOINED_GROUP = { key: 'deck:joined', label: 'joined to what you are holding' };

/**
 * One entry per note, in the navigator's order.
 *
 * The sidecar sends a note that needs a person twice, once in Needs-you and
 * once under its phase (ISS-0015). The field deals it once: owed if either
 * copy says so, and under its phase rather than under Needs-you, so it lands
 * in its own sector if a hand ever lets it into the middle.
 *
 * Only the groups' own cards are dealt, not their children: the navigator
 * folds a feature's tasks under it and the field shows them as the feature's
 * progress bar. A child is dealt on its own only when the desk or a hand names
 * it, because then a person has asked for that note in particular.
 *
 * `extra` is the neighbourhood from outside the view: a held note links to
 * notes the view does not hold, and they still take the front band.
 */
export function fieldEntries(groups: CardGroup[], hand: HandInputs = NO_HAND, extra: CardModel[] = []): FieldEntry[] {
  const entries = new Map<string, FieldEntry>();
  /** Which notes are, so far, filed under a Needs-you heading. */
  const underNeedsYou = new Set<string>();
  const named = (id: string): boolean => hand.joined.has(id) || hand.pulled.has(id) || hand.pushed.has(id) || hand.held.has(id);
  const add = (group: CardGroup, card: CardModel): void => {
    const inputs = bandInputsFor(group, card, hand);
    const existing = entries.get(card.noteId);
    if (existing === undefined) {
      entries.set(card.noteId, { card, groupKey: group.key, groupLabel: group.label, inputs });
      if (group.needsHuman) underNeedsYou.add(card.noteId);
      return;
    }
    const owed = existing.inputs.owed || inputs.owed;
    // The subject heading wins over the Needs-you heading, so the note keeps
    // a sector of its own.
    const moveHeading = underNeedsYou.has(card.noteId) && !group.needsHuman;
    existing.inputs = {
      ...existing.inputs,
      owed,
      suppressed: existing.inputs.suppressed && inputs.suppressed,
      inSubject: !owed && !(existing.inputs.suppressed && inputs.suppressed),
    };
    if (moveHeading) {
      existing.groupKey = group.key;
      existing.groupLabel = group.label;
      underNeedsYou.delete(card.noteId);
    }
  };
  for (const group of groups) {
    for (const card of group.cards) {
      add(group, card);
      const walk = (children: CardModel[]): void => {
        for (const child of children) {
          if (named(child.noteId)) add(group, child);
          if (child.children.length > 0) walk(child.children);
        }
      };
      walk(card.children);
    }
  }
  const joinedGroup: CardGroup = { key: JOINED_GROUP.key, label: JOINED_GROUP.label, needsHuman: false, suppressed: false, cards: [] };
  for (const card of extra) {
    if (entries.has(card.noteId)) continue;
    add(joinedGroup, card);
  }
  return [...entries.values()];
}

/**
 * The order the front band is filled in.
 *
 * While a note is held, what it is joined to comes first, and among those the
 * notes joined to more than one held note come before the rest: they answer
 * the question two held notes ask, and a front band that dealt them last hid
 * six of the eight on the first real run (ISS-0059). Owed notes come next,
 * and past the capacity they are COUNTED rather than demoted, so the front
 * plane's pinned count still says how many are waiting. What a hand pulled
 * comes last, because a hand does not outrank the record, and it has the
 * band's spare slots to itself (see `dealField`).
 */
function frontRank(entry: FieldEntry, first: ReadonlySet<string>): number {
  if (entry.inputs.joinedToDesk) return first.has(entry.card.noteId) ? 0 : 1;
  if (entry.inputs.owed) return 2;
  if (entry.inputs.pulled) return 3;
  return 4;
}

/** How many of the front band's spare slots a hand's pulls may use beyond its capacity. */
export const PULL_SPARES = 8;

export interface DealOptions {
  /** Notes dealt first among the neighbourhood: what the held notes share. */
  first?: ReadonlySet<string>;
  /** Spare front slots a pulled note may take past the capacity. */
  spares?: number;
}

export function dealField(table: BandTable, entries: FieldEntry[], options: DealOptions = {}): FieldDeal {
  const first = options.first ?? new Set<string>();
  const spares = options.spares ?? PULL_SPARES;
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => frontRank(a.entry, first) - frontRank(b.entry, first) || a.index - b.index)
    .map((x) => x.entry);
  const front: FieldEntry[] = [];
  const mid: FieldEntry[] = [];
  const subject: FieldEntry[] = [];
  const outer: FieldEntry[] = [];
  const deep: FieldEntry[] = [];
  const pushedAside: FieldEntry[] = [];
  const overflowing: FieldEntry[] = [];
  let midOverflow = 0;
  let outerOverflow = 0;
  let deepOverflow = 0;
  for (const entry of ordered) {
    const band = bandOf(table, entry.inputs);
    if (band === 'front') {
      if (front.length < table.frontCapacity) front.push(entry);
      else overflowing.push(entry);
    } else if (band === 'mid') {
      // Collected whole and split below, AFTER the navigator's order is
      // restored, so the outer field continues the middle rather than holding
      // whichever notes happened to be dealt last.
      subject.push(entry);
    } else if (band === 'outer') {
      if (outer.length < table.outerCapacity) outer.push(entry);
      else outerOverflow += 1;
    } else {
      // A hand's push is a deliberate act and the capacity never drops it:
      // pushed notes are held back and placed first, so the quiet band's
      // remainder is the far end of the record's own ordering (FEAT-0014).
      if (entry.inputs.pushed === true) pushedAside.push(entry);
      else deep.push(entry);
    }
  }
  // Every pushed note first, then as much of the rest as the band holds.
  const quiet = [...pushedAside, ...deep];
  deep.length = 0;
  for (const entry of quiet) {
    if (deep.length < table.deepCapacity) deep.push(entry);
    else deepOverflow += 1;
  }
  // A pull the full band would swallow takes a spare slot instead: a gesture
  // that changes nothing a person can see is worse than a band one card
  // wider. An owed note past the capacity stays counted, as before; a hand
  // does not push the record's notes out of view to make room (ISS-0059).
  let used = 0;
  const counted: FieldEntry[] = [];
  for (const entry of overflowing) {
    if (entry.inputs.pulled && !entry.inputs.owed && !entry.inputs.joinedToDesk && used < spares) {
      front.push(entry);
      used += 1;
    } else {
      counted.push(entry);
    }
  }
  // The middle keeps the navigator's order, heading by heading, so a sector
  // is one heading and reads in the order the list does, and the OUTER FIELD
  // CONTINUES IT: the two bands are one ordered sequence cut at the middle's
  // capacity (ADR-0005). A note is counted only when neither band had room.
  const midOrder = new Map(entries.map((e, i) => [e.card.noteId, i]));
  subject.sort((a, b) => (midOrder.get(a.card.noteId) ?? 0) - (midOrder.get(b.card.noteId) ?? 0));
  for (const entry of subject) {
    if (mid.length < table.midCapacity) mid.push(entry);
    else if (outer.length < table.outerCapacity) outer.push(entry);
    else midOverflow += 1;
  }
  outer.sort((a, b) => (midOrder.get(a.card.noteId) ?? 0) - (midOrder.get(b.card.noteId) ?? 0));
  return {
    front,
    mid,
    outer,
    deep,
    frontOverflow: counted.length,
    midOverflow,
    outerOverflow,
    deepOverflow,
    owed: entries.filter((e) => e.inputs.owed).length,
    handPlaced: front.filter((e) => e.inputs.pulled && !e.inputs.owed && !e.inputs.joinedToDesk).length,
    pushedBehind: deep.filter((e) => e.inputs.pushed && !e.inputs.suppressed).length,
  };
}

/**
 * The order the front band takes its SLOTS in, which is not the order it was
 * filled in: the neighbourhood, then what a hand pulled, then what is owed.
 *
 * When panes leave fewer front slots than the band holds, the note a person
 * just pulled stays in view and an owed note is counted instead; the owed
 * count on the bar and the navigator still show every owed note. Dealt the
 * other way, a pull beside a pane vanished while the label counted it
 * (ISS-0064).
 */
export function frontForSlots(front: readonly FieldEntry[]): FieldEntry[] {
  const rank = (e: FieldEntry): number => (e.inputs.joinedToDesk ? 0 : e.inputs.pulled && !e.inputs.owed ? 1 : 2);
  return front
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i)
    .map((x) => x.e);
}

/**
 * Whether a hand may push this note behind, and if not, why not in words.
 *
 * An owed note is the record's opinion that a person is needed, and a hand
 * does not overrule it (TASK-0053). The sentence is what the front plane says
 * when the card springs back, so it names the note and what it is owed.
 */
export function pushRefusal(entry: FieldEntry): string | null {
  if (entry.inputs.owed) {
    const owed = entry.card.owedVerb ?? 'a decision';
    return `${entry.card.noteId} stays in front: it is owed ${owed}, and a hand does not overrule the record`;
  }
  // A neighbour is in front because a person is holding what it is joined
  // to. Pushing it was announced and not done, because the neighbourhood
  // rule comes first (ISS-0059); it is refused in words instead.
  if (entry.inputs.joinedToDesk) {
    return `${entry.card.noteId} stays in front while you hold a note it is joined to; put that note back first`;
  }
  return null;
}
