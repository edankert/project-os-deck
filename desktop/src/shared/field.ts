/**
 * The field's deal: which of a view's notes stand in which band (TASK-0029).
 *
 * The rule is the description's `band` table and the function that applies
 * it is `bandCards` (TASK-0044). This module is Glass's use of them: it turns
 * the groups the navigator already draws into one entry per note, fills in
 * what the desk and the hands say about each, orders the front band, and
 * counts what the front plane has to say out loud.
 *
 * Pure, so the whole deal is tested without a window.
 */
import type { CardGroup, CardModel } from './types.js';
import { type BandInputs, type BandTable, type HandInputs, NO_HAND, bandCards, bandInputsFor } from './description.js';

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
  deep: FieldEntry[];
  /** Front-band notes past the band's capacity. Counted and listed in the navigator, never demoted. */
  frontOverflow: number;
  /** Mid-band notes past its capacity. Counted, never sent behind. */
  midOverflow: number;
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
 * While a note is held, what it is joined to comes first: that is what the
 * person just asked to see. Owed notes come next, and past the capacity they
 * are COUNTED rather than demoted, so the front plane's pinned count still
 * says how many are waiting. What a hand pulled comes last, because a hand
 * does not outrank the record.
 */
function frontRank(entry: FieldEntry): number {
  if (entry.inputs.joinedToDesk) return 0;
  if (entry.inputs.owed) return 1;
  if (entry.inputs.pulled) return 2;
  return 3;
}

export function dealField(table: BandTable, entries: FieldEntry[]): FieldDeal {
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => frontRank(a.entry) - frontRank(b.entry) || a.index - b.index)
    .map((x) => x.entry);
  const banding = bandCards(
    table,
    ordered.map((entry) => ({ card: entry, inputs: entry.inputs })),
  );
  // The middle keeps the navigator's order, heading by heading, so a sector
  // is one heading and reads in the order the list does.
  const midOrder = new Map(entries.map((e, i) => [e.card.noteId, i]));
  const mid = [...banding.mid].sort((a, b) => (midOrder.get(a.card.noteId) ?? 0) - (midOrder.get(b.card.noteId) ?? 0));
  return {
    front: banding.front,
    mid,
    deep: banding.deep,
    frontOverflow: banding.frontOverflow,
    midOverflow: banding.midOverflow,
    owed: entries.filter((e) => e.inputs.owed).length,
    handPlaced: banding.front.filter((e) => e.inputs.pulled && !e.inputs.owed && !e.inputs.joinedToDesk).length,
    pushedBehind: banding.deep.filter((e) => e.inputs.pushed && !e.inputs.suppressed).length,
  };
}

/**
 * Whether a hand may push this note behind, and if not, why not in words.
 *
 * An owed note is the record's opinion that a person is needed, and a hand
 * does not overrule it (TASK-0053). The sentence is what the front plane says
 * when the card springs back, so it names the note and what it is owed.
 */
export function pushRefusal(entry: FieldEntry): string | null {
  if (!entry.inputs.owed) return null;
  const owed = entry.card.owedVerb ?? 'a decision';
  return `${entry.card.noteId} stays in front: it is owed ${owed}, and a hand does not overrule the record`;
}
