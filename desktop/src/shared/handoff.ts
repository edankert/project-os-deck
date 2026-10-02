/**
 * Handing a note from one Deck window to another (FEAT-0023, ADR-0007).
 *
 * Until this, a throw was done the moment it was asked for: the main process
 * put the note somewhere and told the source "ok". Nothing confirmed the
 * destination had drawn it, the document's size and reading place were not
 * carried, and there was no way back.
 *
 * A handoff is one of two acts, and they are named differently everywhere:
 *
 *   move   the note leaves this desk and stands on that one
 *   show   that window shows it too, and this desk keeps it
 *
 * The destination must say it is showing the note before a move takes it off
 * the source desk. No answer, a refusal or a window that closed undoes the
 * landing and leaves the source as it was. A move is never half done.
 *
 * This module is the rule, without a window: which acts a destination takes,
 * what is said before release, what a landing does, and what each answer
 * from the destination leads to. The main process carries it out.
 */
import type { ReadingAnchor } from './types.js';

export type HandoffMode = 'move' | 'show';

/**
 * What a note can be handed to. A desk panel and the main window each draw a
 * desk a note can stand on. A reader shows one note and is not a desk. The
 * tablet follows the main window's desk and cannot answer.
 */
export type DestinationKind = 'desk' | 'main' | 'reader' | 'new-reader' | 'tablet';

export interface Destination {
  kind: DestinationKind;
  /** As the target strip and the chooser name it: "desk on Display 2". */
  label: string;
  /** The window, when there is one already. */
  windowId: number | null;
  /** The view whose desk the note lands on, for a desk, the main window and the tablet. */
  view: string | null;
}

export interface HandoffRequest {
  noteId: string;
  workspaceId: string;
  mode: HandoffMode;
  /** The window that is letting go, and the view whose desk holds the note there (null when it is on no desk: a card thrown from the field). */
  source: { windowId: number; view: string | null; label: string; kind: 'desk' | 'main' | 'reader' };
  destination: Destination;
  /** The size the document is read at, and where it is being read, so both arrive with it. */
  size: { w: number; h: number } | null;
  anchor: ReadingAnchor | null;
}

/** How long the destination has to say it is showing the note. */
export const HANDOFF_ACK_MS = 4000;

/** Which acts a destination takes. Only something that is a desk can have a note moved onto it. */
export function modesFor(kind: DestinationKind): HandoffMode[] {
  return kind === 'desk' || kind === 'main' ? ['move', 'show'] : ['show'];
}

export interface OfferFacts {
  /** The view whose desk holds the note at the source, or null when it is on no desk. */
  sourceView: string | null;
  /** The note is kept on every view: it is on every desk already, and taking it off one takes it off all. */
  everyView: boolean;
}

/**
 * Which acts a destination is OFFERED for one note. Narrower than what its
 * kind takes: a destination drawing the same view's desk as the source is
 * not offered a move, because source and destination are one desk and the
 * move would take the note off it; and a note kept on every view is offered
 * "also show" only, for the same reason on every desk at once.
 */
export function offeredModes(destination: Destination, facts: OfferFacts): HandoffMode[] {
  return modesFor(destination.kind).filter((mode) => {
    if (mode !== 'move') return true;
    if (facts.everyView) return false;
    return !(destination.view !== null && destination.view === facts.sourceView);
  });
}

/** Whether the destination can say it drew the note. A served page has no route back. */
export function canAcknowledge(kind: DestinationKind): boolean {
  return kind !== 'tablet';
}

/** What is said before release: the act, the note, where it goes, and what happens here. */
export function describeHandoff(noteId: string, mode: HandoffMode, destination: Destination): string {
  if (destination.kind === 'tablet') return `Also show ${noteId} on the tablet: it goes on the desk the tablet follows, this desk keeps it, and a tablet cannot confirm it arrived`;
  if (mode === 'move') return `Move ${noteId} to the ${destination.label}: it leaves this desk once that window shows it`;
  return `Also show ${noteId} in the ${destination.label}: this desk keeps it`;
}

/** The short name of the act, for a button or a row of a chooser. */
export function handoffLabel(mode: HandoffMode, destination: Destination): string {
  return `${mode === 'move' ? 'Move to' : 'Also show in'} the ${destination.kind === 'tablet' ? 'tablet' : destination.label}`;
}

export interface LandingFacts {
  /** The note is already on the destination's desk. */
  alreadyThere: boolean;
}

export type Landing =
  /** Nothing is done, and this is why. */
  | { refused: string }
  /** What the main process does to land it. `put` is whether the note is put on the destination's desk by this handoff. */
  | { put: boolean; reload: boolean; open: boolean; awaits: boolean };

/**
 * What landing a request means, or why it is refused.
 *
 * Two refusals keep a handoff from damaging a desk. A mode the destination
 * does not take is refused, never downgraded silently. And a move onto the
 * desk the note is already on is refused: source and destination would be
 * the same desk, the "move" would take the note off it, and nothing would
 * be left.
 */
export function planLanding(request: HandoffRequest, facts: LandingFacts): Landing {
  const { destination, mode, source, noteId } = request;
  if (!modesFor(destination.kind).includes(mode)) {
    return { refused: `${noteId} cannot be moved to the ${destination.label}: it is not a desk. It can be shown there as well.` };
  }
  const sameDesk = destination.view !== null && destination.view === source.view && (destination.kind === 'desk' || destination.kind === 'main' || destination.kind === 'tablet');
  if (sameDesk && mode === 'move') {
    return { refused: `The ${destination.label} shows this same desk, so ${noteId} is already there. Nothing was moved.` };
  }
  if (destination.kind === 'reader') return { put: false, reload: true, open: false, awaits: true };
  if (destination.kind === 'new-reader') return { put: false, reload: false, open: true, awaits: true };
  // A desk: the note goes on it unless it is there already, and is never put there twice.
  return { put: !facts.alreadyThere, reload: false, open: false, awaits: canAcknowledge(destination.kind) };
}

export type HandoffState = 'awaiting' | 'done' | 'unconfirmed' | 'failed';

export interface HandoffRecord extends HandoffRequest {
  id: string;
  state: HandoffState;
  /** Whether this handoff put the note on the destination's desk, and so must take it off again if it fails. */
  put: boolean;
  /** For a reader that was re-addressed: what it showed before, so a failed handoff can give it back. */
  previousAddress?: string | null;
  /** For a new reader: the window this handoff opened, so a failed handoff can close it. */
  openedWindowId?: number | null;
}

export type HandoffAnswer =
  /** The destination says it is showing the note, or says why it could not. */
  | { type: 'ack'; ok: boolean; error?: string }
  | { type: 'timeout' }
  /** The destination window closed before it answered. */
  | { type: 'closed' }
  /** The display the destination is on was disconnected before it answered. */
  | { type: 'display-removed' };

/** What the main process then does: to the store, and to a window the landing changed or opened. */
export type HandoffEffect =
  | { type: 'take-off'; view: string; noteId: string }
  | { type: 'readdress'; windowId: number; address: string }
  | { type: 'close-window'; windowId: number };

export interface HandoffReply {
  ok: boolean;
  /** True when the destination said it is showing the note. False for the tablet, which cannot. */
  acknowledged: boolean;
  mode: HandoffMode;
  /** What to say at the source. */
  said: string;
}

/** A landing that needs no answer: the tablet. It is done, and said to be unconfirmed. */
export function settleUnconfirmed(record: HandoffRecord): { record: HandoffRecord; effects: HandoffEffect[]; reply: HandoffReply } {
  return {
    record: { ...record, state: 'unconfirmed' },
    effects: [],
    reply: { ok: true, acknowledged: false, mode: record.mode, said: `${record.noteId} is on the desk the tablet follows. A tablet cannot confirm it arrived; this desk keeps it.` },
  };
}

/**
 * The destination answered, did not, or went away.
 *
 * Shown: a move takes the note off the source desk now, and not before. A
 * show changes nothing at the source. Anything else: whatever the landing
 * put on the destination's desk is taken off again, the source is untouched,
 * and the reply says the note is still here.
 */
export function settle(record: HandoffRecord, answer: HandoffAnswer): { record: HandoffRecord; effects: HandoffEffect[]; reply: HandoffReply } {
  if (record.state !== 'awaiting') {
    // A second answer, or one after the wait ended: the first one stands.
    return { record, effects: [], reply: { ok: record.state === 'done', acknowledged: record.state === 'done', mode: record.mode, said: '' } };
  }
  const { noteId, destination, source, mode } = record;
  if (answer.type === 'ack' && answer.ok) {
    const effects: HandoffEffect[] = mode === 'move' && source.view !== null ? [{ type: 'take-off', view: source.view, noteId }] : [];
    return {
      record: { ...record, state: 'done' },
      effects,
      reply: {
        ok: true,
        acknowledged: true,
        mode,
        said: mode === 'move' ? `${noteId} moved to the ${destination.label}, which is showing it` : `${noteId} is also shown in the ${destination.label}; this desk keeps it`,
      },
    };
  }
  const why =
    answer.type === 'timeout'
      ? `the ${destination.label} did not answer`
      : answer.type === 'closed'
        ? `the ${destination.label} closed`
        : answer.type === 'display-removed'
          ? `the display the ${destination.label} is on was disconnected`
          : `the ${destination.label} could not show it${answer.error === undefined || answer.error === '' ? '' : `: ${answer.error}`}`;
  // Exactly what the landing added is removed, and nothing else: a note the
  // destination's desk already held stays there, a reader goes back to what
  // it showed, and a reader this handoff opened is closed. A window that has
  // itself closed needs neither.
  const effects: HandoffEffect[] = [];
  if (record.put && destination.view !== null) effects.push({ type: 'take-off', view: destination.view, noteId });
  if (answer.type !== 'closed') {
    if (destination.kind === 'reader' && destination.windowId !== null && typeof record.previousAddress === 'string') effects.push({ type: 'readdress', windowId: destination.windowId, address: record.previousAddress });
    if (destination.kind === 'new-reader' && typeof record.openedWindowId === 'number') effects.push({ type: 'close-window', windowId: record.openedWindowId });
  }
  return {
    record: { ...record, state: 'failed' },
    effects,
    reply: { ok: false, acknowledged: false, mode, said: `${noteId} stays here: ${why}. Nothing was ${mode === 'move' ? 'moved' : 'changed'}.` },
  };
}

/**
 * The way back: the same handoff in reverse, for a note that arrived here.
 * Null when there is nothing to go back to: it arrived at something that is
 * not a window (the tablet cannot send anything), or it came from the field
 * and was on no desk, or it did not arrive.
 */
export function returnOf(record: HandoffRecord, anchorNow: ReadingAnchor | null, sizeNow: { w: number; h: number } | null): HandoffRequest | null {
  if (record.destination.windowId === null || record.state !== 'done') return null;
  if (record.source.view === null || record.source.kind === 'reader') return null;
  const here = record.destination.kind === 'desk' || record.destination.kind === 'main' ? record.destination.kind : 'reader';
  return {
    noteId: record.noteId,
    workspaceId: record.workspaceId,
    // From a desk it is moved back: it leaves this desk once the other shows
    // it. A reader holds no desk to move it off, so from there it is shown.
    mode: here === 'reader' ? 'show' : 'move',
    source: { windowId: record.destination.windowId, view: record.destination.view, label: record.destination.label, kind: here },
    destination: { kind: record.source.kind, label: record.source.label, windowId: record.source.windowId, view: record.source.view },
    size: sizeNow ?? record.size,
    // Where it was read at the destination, when it was read there; else where it was being read when it left.
    anchor: anchorNow ?? record.anchor,
  };
}
