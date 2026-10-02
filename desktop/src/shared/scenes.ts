/**
 * Scenes: a named, saved arrangement of one view's Glass desk (FEAT-0023,
 * ADR-0007).
 *
 * A scene extends the saved desk Spread already had. It keeps where things
 * stand and how they are shown: the view, the search and the filters, the
 * collection's layout, each open document's place, size and stacking, and
 * where each was being read. It keeps nothing that is derived: no row, no id
 * of a collection member, no count and no note text. Reopened next week, the
 * collection lists next week's notes and each document shows next week's
 * text. It also keeps nothing of the session: not the way the field was
 * turned, the zoom, which document was the focus, an open list, an emphasis
 * or an undo (DES-0003: "Do not save yaw, focus or the undo history under the
 * label of a scene").
 *
 * Everything here is pure: what a scene holds, how a reading position is
 * kept and found again, and what a reopened scene has to say about what
 * changed since it was saved. `ReadingWait` keeps state, the documents still
 * waiting for their text, and like the rest it touches no window and no
 * clock, so a node suite can hold its rules.
 */
import type { CollectionLayout } from './collection.js';
import { readingSizeFor } from './panes.js';
import type { DeskCard, Desk, Filters, ReadingAnchor } from './types.js';

export type { ReadingAnchor };

/** The shape this Deck writes. A saved desk with no version is a desk from before scenes, and still opens. */
export const SCENE_VERSION = 2;

/** One heading of a document as it is laid out now. */
export interface HeadingAt {
  text: string;
  /** Its top edge, in the document's scroll coordinates. */
  top: number;
}

/** What a window knows about itself that the store does not, handed over when a scene is saved. */
export interface SceneExtras {
  anchors: Record<string, ReadingAnchor>;
  field: { w: number; h: number };
  savedAt: string;
}

/** What a scene is built from: the parts of the state it keeps. */
export interface SceneSource {
  workspaceId: string;
  view: string;
  query: string;
  filters: Filters;
  collection: CollectionLayout | null;
  /** The view's desk as it is drawn, lowest first. */
  cards: readonly DeskCard[];
}

function plain(card: DeskCard): DeskCard {
  const copy: DeskCard = { noteId: card.noteId, x: card.x, y: card.y };
  if (card.w !== undefined) copy.w = card.w;
  if (card.h !== undefined) copy.h = card.h;
  if (card.wide === true) copy.wide = true;
  return copy;
}

/** Build a scene from what is on the desk now. Only what a scene keeps is read. */
export function sceneFrom(source: SceneSource, name: string, extras: SceneExtras): Desk {
  const open = new Set(source.cards.map((c) => c.noteId));
  const anchors: Record<string, ReadingAnchor> = {};
  for (const [noteId, anchor] of Object.entries(extras.anchors)) {
    // An anchor for a note that is not on the desk is not part of the scene.
    if (open.has(noteId)) anchors[noteId] = plainAnchor(anchor.heading, anchor.occurrence, Math.round(anchor.past), anchor.fraction);
  }
  const scene: Desk = {
    name,
    workspaceId: source.workspaceId,
    cards: source.cards.map(plain),
    version: SCENE_VERSION,
    view: source.view,
    query: source.query,
    filters: { statuses: [...source.filters.statuses], types: [...source.filters.types] },
    anchors,
    field: { w: Math.round(extras.field.w), h: Math.round(extras.field.h) },
    savedAt: extras.savedAt,
  };
  if (source.collection !== null) scene.collection = { ...source.collection };
  return scene;
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/** Which heading with its words a position names, counted from 1, or null when it records none or something that is not a count. */
function occurrenceOf(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

/**
 * A reading position as a scene keeps it. Which heading it is, is kept where
 * it was recorded and there is a heading to count. A position saved before
 * that was recorded is kept without it, and is read as the first.
 */
function plainAnchor(heading: string | null, occurrence: unknown, past: number, fraction: number): ReadingAnchor {
  const anchor: ReadingAnchor = { heading, past, fraction: clamp01(fraction) };
  const nth = heading === null ? null : occurrenceOf(occurrence);
  if (nth !== null) anchor.occurrence = nth;
  return anchor;
}

/** What kind of saved thing this is, for the list and for deciding whether it can be opened. */
export type SceneKind = 'scene' | 'desk' | 'unreadable';

export function sceneKind(desk: Desk): SceneKind {
  if (desk.version === undefined) return 'desk';
  return desk.version === SCENE_VERSION ? 'scene' : 'unreadable';
}

/**
 * What the scene controls offer for an entry. One this Deck cannot read is
 * never changed: it is not opened and not renamed, since both would have this
 * Deck handle fields it does not know. It can still be deleted, and a delete
 * can be restored, because both move the entry whole.
 */
export function actsFor(kind: SceneKind): { open: boolean; rename: boolean; remove: boolean } {
  return { open: kind !== 'unreadable', rename: kind !== 'unreadable', remove: true };
}

/**
 * Who saved an entry this Deck cannot read, as the words every refusal uses.
 * "A different Deck", not "a newer one": a version of 1, or the text "2", is
 * not this Deck's either, and neither is newer. The version is written as it
 * is stored, so the text "2" reads `"2"` and is not taken for the number.
 */
export function savedByOther(desk: Desk): string {
  return `saved by a different Deck (version ${JSON.stringify(desk.version)})`;
}

/**
 * The view whose desk and list opening this replaces. A scene opens on the
 * view it was saved on, whichever view is on screen. A desk from before
 * scenes has no view of its own and opens on the one on screen. The window
 * keeps that view's desk before it opens anything, so one press puts it back.
 */
export function viewReplacedBy(desk: Desk, viewNow: string | null): string | null {
  return sceneKind(desk) === 'scene' && typeof desk.view === 'string' ? desk.view : viewNow;
}

export interface SceneEntry {
  name: string;
  kind: SceneKind;
  /** The view it was saved on; null for a desk from before scenes, which opens on whatever view is on screen. */
  view: string | null;
  notes: number;
  savedAt: string | null;
  /** For one that cannot be opened: why, in a sentence. */
  why: string | null;
}

/** Every saved desk and scene of a workspace, by name. */
export function listScenes(desks: Readonly<Record<string, Desk>>, workspaceId: string): SceneEntry[] {
  return Object.values(desks)
    .filter((d) => d.workspaceId === workspaceId)
    .map((d) => {
      const kind = sceneKind(d);
      return {
        name: d.name,
        kind,
        view: typeof d.view === 'string' ? d.view : null,
        notes: Array.isArray(d.cards) ? d.cards.length : 0,
        savedAt: typeof d.savedAt === 'string' ? d.savedAt : null,
        why: kind === 'unreadable' ? `${savedByOther(d)}; this one reads version ${SCENE_VERSION}, so it is kept and not opened` : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Where a document is being read. `headings` are in document order; the
 * anchor is the last one whose top is at or above the top of the view.
 */
export function readingAnchorAt(headings: readonly HeadingAt[], scrollTop: number, scrollMax: number): ReadingAnchor {
  let at: HeadingAt | null = null;
  // How many headings with each text have been passed: the same words may head more than one section.
  const passed = new Map<string, number>();
  for (const heading of headings) {
    if (heading.top > scrollTop + 0.5) break;
    at = heading;
    passed.set(heading.text, (passed.get(heading.text) ?? 0) + 1);
  }
  const fraction = scrollMax <= 0 ? 0 : scrollTop / scrollMax;
  if (at === null) return plainAnchor(null, undefined, Math.round(scrollTop), fraction);
  return plainAnchor(at.text, passed.get(at.text), Math.round(scrollTop - at.top), fraction);
}

/**
 * Where to scroll a document so it is read where the anchor says.
 *
 * By the heading when the text still has it: the passage is found by what it
 * says, so text added or removed above it does not move the reader. Where
 * the same words head more than one section, it is the one the position
 * names, counted from the top. When the heading is gone, or the text has
 * fewer headings with those words than the position counts, the share of the
 * text is used instead and `moved` says so, so the scene can report that the
 * passage is not where it was. The first heading with those words is not
 * taken in its place: that would put the reader under another section and
 * say nothing had moved.
 */
export function scrollTopForAnchor(anchor: ReadingAnchor, headings: readonly HeadingAt[], scrollMax: number): { top: number; moved: boolean } {
  const limit = Math.max(0, scrollMax);
  if (anchor.heading === null) return { top: Math.max(0, Math.min(limit, anchor.past)), moved: false };
  const found = headings.filter((h) => h.text === anchor.heading)[(occurrenceOf(anchor.occurrence) ?? 1) - 1];
  if (found !== undefined) return { top: Math.max(0, Math.min(limit, found.top + anchor.past)), moved: false };
  return { top: Math.round(clamp01(anchor.fraction) * limit), moved: true };
}

/**
 * Reading positions waiting for their documents' text.
 *
 * A reopened scene, and a note that arrived from another window, each ask
 * for documents to be put back where they were being read, and each is told
 * once which of them could not be found by their heading. A document's text
 * may come later than the request, or never. This keeps who is waiting for
 * what, with no window and no clock: the window scrolls the documents and
 * owns the timer.
 *
 * Two rules live here. Every request is answered: one that asks for nothing
 * is answered at once, so a scene with no document that had text still gets
 * its message. And a request made while an earlier one is still waiting
 * does not drop the earlier one: that one is answered first, with what was
 * found so far, and its documents still unread keep their place for when
 * they are read.
 */
export class ReadingWait {
  private wanted = new Map<string, ReadingAnchor>();
  /**
   * Positions whose wait ended with the document still on the desk and
   * unread: a document that could not be read and offers a retry. The
   * position is kept for as long as the document is, so a retry pressed a
   * minute later still opens it where it was being read.
   */
  private readonly owed = new Map<string, ReadingAnchor>();
  private moved: string[] = [];
  private done: ((moved: string[]) => void) | null = null;

  /** `onDesk` says whether a note still has a document on the desk: one that is gone never gets text, and keeps no place. */
  constructor(private readonly onDesk: (noteId: string) => boolean) {}

  /** Whether a request has not been answered yet. */
  get waiting(): boolean {
    return this.done !== null;
  }

  /** Ask for these documents to be put back. `done` is told which could not be found by their heading, once. */
  begin(anchors: Readonly<Record<string, ReadingAnchor>>, done: (moved: string[]) => void): void {
    this.settle();
    this.moved = [];
    this.wanted = new Map(Object.entries(anchors));
    // A position asked for now replaces one kept from an earlier wait.
    for (const noteId of this.wanted.keys()) this.owed.delete(noteId);
    this.done = done;
    if (this.wanted.size === 0) this.settle();
  }

  /**
   * The position a document goes to now that its text is on screen, or null
   * when none is kept for it. `counted` is false for one whose wait ended
   * before it could be read: it still goes to its place, and the answer has
   * been given without it.
   */
  take(noteId: string): { anchor: ReadingAnchor; counted: boolean } | null {
    const wanted = this.wanted.get(noteId);
    if (wanted !== undefined) {
      this.wanted.delete(noteId);
      return { anchor: wanted, counted: true };
    }
    const owed = this.owed.get(noteId);
    if (owed === undefined) return null;
    this.owed.delete(noteId);
    return { anchor: owed, counted: false };
  }

  /** A counted document was put at its place; `moved` when its heading was not found. The last one answers the request. */
  placed(noteId: string, moved: boolean): void {
    if (this.done === null) return;
    if (moved) this.moved.push(noteId);
    if (this.wanted.size === 0) this.settle();
  }

  /** The wait is over: the request is answered with what was found, and documents still unread keep their place. */
  settle(): void {
    for (const [noteId, anchor] of this.wanted) if (this.onDesk(noteId)) this.owed.set(noteId, anchor);
    this.wanted.clear();
    const done = this.done;
    this.done = null;
    done?.([...this.moved]);
  }

  /** A document left the desk: no place is kept for it. */
  forget(noteId: string): void {
    this.owed.delete(noteId);
  }
}

export interface SceneReportInput {
  scene: Desk;
  /** The scene's notes that exist in the workspace now. */
  present: ReadonlySet<string>;
  /** The field the scene is being reopened in. */
  field: { w: number; h: number };
  /**
   * The size the scene's view gives a document that has none of its own: the
   * last size a person gave a note there, or null when nobody has, and the
   * first-use size applies. A document with no stored size is drawn at it,
   * so it is the size it counts at when the report says what fits.
   */
  readingSize: { w: number; h: number } | null;
  /** Documents whose reading passage could not be found again by its heading. */
  movedPassages: readonly string[];
}

/**
 * What a reopened scene has to say: what is not as it was saved. One sentence
 * each, empty when nothing changed. How many notes the collection lists is
 * never one of them: that is live by definition, and saying it changed would
 * suggest the scene had kept a count.
 */
export function sceneReport(input: SceneReportInput): string[] {
  const { scene, present, field } = input;
  const out: string[] = [];
  const cards = Array.isArray(scene.cards) ? scene.cards : [];
  const gone = cards.map((c) => c.noteId).filter((id) => !present.has(id));
  if (gone.length > 0) {
    out.push(
      `${listOf(gone)} ${gone.length === 1 ? 'is' : 'are'} no longer in this workspace. ${gone.length === 1 ? 'Its document is' : 'Their documents are'} kept, labelled, and can be closed.`,
    );
  }
  const saved = scene.field;
  if (saved !== undefined && (field.w < saved.w - 1 || field.h < saved.h - 1)) {
    // A document with no size of its own is not zero wide: it is drawn at the view's reading size.
    const outside = cards
      .filter((c) => {
        const size = readingSizeFor(c, input.readingSize);
        return c.x + size.w > field.w || c.y + size.h > field.h;
      })
      .map((c) => c.noteId);
    out.push(
      `This window's field is ${Math.round(field.w)} by ${Math.round(field.h)}; the scene was arranged in ${saved.w} by ${saved.h}.` +
        (outside.length > 0 ? ` ${listOf(outside)} ${outside.length === 1 ? 'is' : 'are'} drawn inside this field; the saved ${outside.length === 1 ? 'place is' : 'places are'} not changed.` : ' Everything still fits.'),
    );
  }
  if (input.movedPassages.length > 0) {
    out.push(`The passage being read in ${listOf(input.movedPassages)} is not under the heading it was: the text changed, so ${input.movedPassages.length === 1 ? 'it is' : 'they are'} opened as far down as before instead.`);
  }
  return out;
}

function listOf(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * A scene read from a state file, kept whole or refused.
 *
 * A desk with no version is a desk from before scenes: only its cards are
 * read, as they always were. Version 2 is read field by field, and a field
 * that is not what it should be is dropped rather than guessed at. A version
 * this Deck does not know is returned exactly as it was found, so another
 * Deck's scene survives being loaded and saved by this one. That includes
 * `cards`: missing, or something other than a list, it is written back
 * missing or as that other thing, so nothing reads an unreadable entry's
 * cards without checking they are a list.
 */
export function normaliseScene(
  value: unknown,
  normaliseCards: (cards: unknown) => DeskCard[],
  normaliseCollection: (layout: unknown) => CollectionLayout | null,
  /** The desk that was on screen before a scene was opened has no name of its own. Nothing saved is unnamed. */
  unnamed = false,
): Desk | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const name = typeof raw['name'] === 'string' && (raw['name'] !== '' || unnamed) ? raw['name'] : null;
  const workspaceId = typeof raw['workspaceId'] === 'string' && raw['workspaceId'] !== '' ? raw['workspaceId'] : null;
  if (name === null || workspaceId === null) return null;
  const version = raw['version'];
  if (version === undefined) return { name, workspaceId, cards: normaliseCards(raw['cards']) };
  if (version !== SCENE_VERSION) {
    // Not ours to interpret. Kept untouched; `sceneKind` says it cannot be opened.
    return { ...(raw as unknown as Desk) };
  }
  const scene: Desk = { name, workspaceId, cards: normaliseCards(raw['cards']), version: SCENE_VERSION };
  if (typeof raw['view'] === 'string' && raw['view'] !== '') scene.view = raw['view'];
  if (typeof raw['query'] === 'string') scene.query = raw['query'];
  const filters = raw['filters'];
  if (typeof filters === 'object' && filters !== null) {
    const f = filters as Record<string, unknown>;
    const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    scene.filters = { statuses: strings(f['statuses']), types: strings(f['types']) };
  }
  const collection = normaliseCollection(raw['collection']);
  if (collection !== null) scene.collection = collection;
  const open = new Set(scene.cards.map((c) => c.noteId));
  const anchors: Record<string, ReadingAnchor> = {};
  if (typeof raw['anchors'] === 'object' && raw['anchors'] !== null) {
    for (const [noteId, a] of Object.entries(raw['anchors'] as Record<string, unknown>)) {
      if (!open.has(noteId) || typeof a !== 'object' || a === null) continue;
      const r = a as Record<string, unknown>;
      const past = typeof r['past'] === 'number' && Number.isFinite(r['past']) ? Math.round(r['past']) : 0;
      anchors[noteId] = plainAnchor(typeof r['heading'] === 'string' ? r['heading'] : null, r['occurrence'], past, typeof r['fraction'] === 'number' ? r['fraction'] : 0);
    }
  }
  scene.anchors = anchors;
  const field = raw['field'];
  if (typeof field === 'object' && field !== null) {
    const f = field as Record<string, unknown>;
    if (typeof f['w'] === 'number' && typeof f['h'] === 'number' && Number.isFinite(f['w']) && Number.isFinite(f['h']) && f['w'] > 0 && f['h'] > 0) scene.field = { w: Math.round(f['w']), h: Math.round(f['h']) };
  }
  if (typeof raw['savedAt'] === 'string') scene.savedAt = raw['savedAt'];
  return scene;
}
