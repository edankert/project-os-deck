// A handoff is acknowledged before the source lets go (FEAT-0023, ADR-0007).
// The rule without a window: which acts a destination takes, what is said
// before release, what landing does, and what each answer leads to.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from './helpers.mjs';

const { modesFor, offeredModes, canAcknowledge, describeHandoff, handoffLabel, named, consequence, planLanding, settle, settleUnconfirmed, returnOf, HANDOFF_ACK_MS } = load('shared/handoff.js');
const { reduce, initialState, deskCardsOf, persistable } = load('shared/store-state.js');

const desk = { kind: 'desk', label: 'desk on Display 2', windowId: 7, view: 'issues' };
const main = { kind: 'main', label: 'Deck on Built-in Display', windowId: 1, view: 'features' };
const reader = { kind: 'reader', label: 'reader on Display 2', windowId: 9, view: null };
const fresh = { kind: 'new-reader', label: 'a new reader on Display 3', windowId: null, view: null };
const tablet = { kind: 'tablet', label: 'tablet', windowId: null, view: 'features' };
const anchor = { heading: 'Scope', past: 40, fraction: 0.3 };
const request = (mode, destination, over = {}) => ({ noteId: 'FEAT-0002', workspaceId: 'w', mode, source: { windowId: 1, view: 'features', label: 'Deck on Built-in Display', kind: 'main' }, destination, size: { w: 640, h: 560 }, anchor, ...over });
const record = (mode, destination, put, over = {}) => ({ ...request(mode, destination, over), id: 'h1', state: 'awaiting', put });

test('only something that is a desk can have a note moved onto it', () => {
  assert.deepEqual(modesFor('desk'), ['move', 'show']);
  assert.deepEqual(modesFor('main'), ['move', 'show']);
  assert.deepEqual(modesFor('reader'), ['show']);
  assert.deepEqual(modesFor('new-reader'), ['show']);
  assert.deepEqual(modesFor('tablet'), ['show']);
  assert.equal(canAcknowledge('tablet'), false);
  assert.equal(canAcknowledge('desk'), true);
  assert.ok(HANDOFF_ACK_MS >= 2000 && HANDOFF_ACK_MS <= 10000);
});

test('what is said before release names the act, the note, the place and what happens here', () => {
  assert.equal(describeHandoff('FEAT-0002', 'move', desk), 'Move FEAT-0002 to the desk on Display 2: it leaves this desk once that window shows it');
  assert.equal(describeHandoff('FEAT-0002', 'show', reader), 'Also show FEAT-0002 in the reader on Display 2: this desk keeps it');
  assert.match(describeHandoff('FEAT-0002', 'show', tablet), /a tablet cannot confirm it arrived/);
  assert.equal(handoffLabel('move', desk), 'Move to the desk on Display 2');
  assert.equal(handoffLabel('show', desk), 'Also show in the desk on Display 2');
  assert.equal(handoffLabel('show', tablet), 'Also show in the tablet');
});

test('an empty display is offered "Also show in" only, and its entry reads as a sentence', () => {
  // A reader that does not exist yet is already named with its article: not "the a new reader".
  assert.deepEqual(offeredModes(fresh, { sourceView: 'features', everyView: false }), ['show']);
  assert.equal(handoffLabel('show', fresh), 'Also show in a new reader on Display 3');
  assert.equal(describeHandoff('FEAT-0002', 'show', fresh), 'Also show FEAT-0002 in a new reader on Display 3: this desk keeps it');
  assert.equal(named('desk on Display 2'), 'the desk on Display 2');
  assert.equal(named('a new reader on Display 3'), 'a new reader on Display 3');
  for (const mode of ['move', 'show']) {
    for (const d of [desk, main, reader, fresh, tablet]) {
      for (const said of [handoffLabel(mode, d), describeHandoff('FEAT-0002', mode, d)]) assert.doesNotMatch(said, /the (a|an|the) /, said);
    }
  }
  for (const answer of [{ type: 'timeout' }, { type: 'closed' }, { type: 'display-removed' }, { type: 'ack', ok: false, error: 'x' }, { type: 'ack', ok: true }]) {
    assert.doesNotMatch(settle(record('show', fresh, false), answer).reply.said, /the (a|an|the) /);
  }
});

test('what an act does to this desk is said in a few words beside each place', () => {
  assert.equal(consequence('move', desk), 'it leaves this desk');
  assert.equal(consequence('show', desk), 'this desk keeps it');
  assert.equal(consequence('show', reader), 'this desk keeps it');
  assert.match(consequence('show', tablet), /this desk keeps it; a tablet cannot confirm/);
});

test('landing on a desk puts the note there once, and never twice', () => {
  assert.deepEqual(planLanding(request('move', desk), { alreadyThere: false }), { put: true, reload: false, open: false, awaits: true });
  assert.deepEqual(planLanding(request('show', desk), { alreadyThere: true }), { put: false, reload: false, open: false, awaits: true });
  assert.deepEqual(planLanding(request('show', reader), { alreadyThere: false }), { put: false, reload: true, open: false, awaits: true });
  assert.deepEqual(planLanding(request('show', fresh), { alreadyThere: false }), { put: false, reload: false, open: true, awaits: true });
  // The tablet is the main window's desk, and it cannot answer.
  assert.deepEqual(planLanding(request('show', { ...tablet, view: 'issues' }), { alreadyThere: false }), { put: true, reload: false, open: false, awaits: false });
});

test('a move a destination cannot take is refused, never turned into something else', () => {
  assert.match(planLanding(request('move', reader), { alreadyThere: false }).refused, /cannot be moved to the reader on Display 2: it is not a desk/);
  assert.match(planLanding(request('move', tablet), { alreadyThere: false }).refused, /not a desk/);
});

test('a move onto the desk the note is already on is refused: it would take the note off its only desk', () => {
  const same = { ...desk, view: 'features' };
  assert.match(planLanding(request('move', same), { alreadyThere: true }).refused, /shows this same desk, so FEAT-0002 is already there\. Nothing was moved\./);
  // Showing it there is harmless: it is already there, and nothing is put twice.
  assert.deepEqual(planLanding(request('show', same), { alreadyThere: true }), { put: false, reload: false, open: false, awaits: true });
});

test('a move takes the note off the source desk only when the destination says it is showing it', () => {
  const done = settle(record('move', desk, true), { type: 'ack', ok: true });
  assert.equal(done.record.state, 'done');
  assert.deepEqual(done.effects, [{ type: 'take-off', view: 'features', noteId: 'FEAT-0002' }]);
  assert.deepEqual(done.reply, { ok: true, acknowledged: true, mode: 'move', said: 'FEAT-0002 moved to the desk on Display 2, which is showing it' });
});

test('a show leaves the source as it was', () => {
  const done = settle(record('show', desk, true), { type: 'ack', ok: true });
  assert.deepEqual(done.effects, []);
  assert.match(done.reply.said, /also shown in the desk on Display 2; this desk keeps it/);
});

test('no answer, a refusal or a closed window undoes the landing and leaves the source untouched', () => {
  for (const [answer, why] of [
    [{ type: 'timeout' }, 'did not answer'],
    [{ type: 'closed' }, 'closed'],
    [{ type: 'ack', ok: false, error: 'the note could not be read' }, 'could not show it: the note could not be read'],
  ]) {
    const failed = settle(record('move', desk, true), answer);
    assert.equal(failed.record.state, 'failed');
    // The note the landing put on the destination's desk is taken off again; nothing touches the source's.
    assert.deepEqual(failed.effects, [{ type: 'take-off', view: 'issues', noteId: 'FEAT-0002' }]);
    assert.equal(failed.reply.ok, false);
    assert.ok(failed.reply.said.startsWith('FEAT-0002 stays here: the desk on Display 2 ') && failed.reply.said.includes(why) && failed.reply.said.endsWith('Nothing was moved.'), failed.reply.said);
  }
  // A note that was already on the destination's desk was not put there by this handoff, so it is not taken off.
  assert.deepEqual(settle(record('move', desk, false), { type: 'timeout' }).effects, []);
  // A failed show to a reader has nothing on any desk to undo.
  assert.deepEqual(settle(record('show', reader, false), { type: 'closed' }).effects, []);
});

test('a second answer changes nothing: the first one stands', () => {
  const done = settle(record('move', desk, true), { type: 'ack', ok: true });
  const late = settle(done.record, { type: 'timeout' });
  assert.equal(late.record, done.record);
  assert.deepEqual(late.effects, []);
  const failed = settle(record('move', desk, true), { type: 'timeout' });
  assert.deepEqual(settle(failed.record, { type: 'ack', ok: true }).effects, [], 'an answer after the wait ended does not move the note after all');
});

test('a card thrown from the field is on no desk, so a move takes nothing off', () => {
  const fromField = record('move', desk, true, { source: { windowId: 1, view: null, label: 'Deck', kind: 'main' } });
  assert.deepEqual(settle(fromField, { type: 'ack', ok: true }).effects, []);
});

test('the tablet is done at once, and said to be unconfirmed', () => {
  const out = settleUnconfirmed(record('show', tablet, true));
  assert.equal(out.record.state, 'unconfirmed');
  assert.deepEqual(out.effects, []);
  assert.equal(out.reply.acknowledged, false);
  assert.match(out.reply.said, /A tablet cannot confirm it arrived; this desk keeps it\./);
});

test('the way back is the same handoff in reverse, carrying where it was read last', () => {
  const done = settle(record('move', desk, true), { type: 'ack', ok: true }).record;
  const back = returnOf(done, null, null);
  assert.deepEqual(back, {
    noteId: 'FEAT-0002',
    workspaceId: 'w',
    mode: 'move',
    source: { windowId: 7, view: 'issues', label: 'desk on Display 2', kind: 'desk' },
    destination: { kind: 'main', label: 'Deck on Built-in Display', windowId: 1, view: 'features' },
    size: { w: 640, h: 560 },
    anchor,
  });
  // Read further at the destination: that is where it is read when it comes back.
  const later = { heading: 'Acceptance', past: 12, fraction: 0.7 };
  assert.deepEqual(returnOf(done, later, { w: 700, h: 600 }).anchor, later);
  assert.deepEqual(returnOf(done, later, { w: 700, h: 600 }).size, { w: 700, h: 600 });
  // From a reader it is shown back, because a reader holds no desk to move it off.
  const shown = settle(record('show', reader, false), { type: 'ack', ok: true }).record;
  assert.equal(returnOf(shown, null, null).mode, 'show');
  // Nothing to go back to: the tablet, a note from the field, a handoff that failed.
  assert.equal(returnOf(settleUnconfirmed(record('show', tablet, true)).record, null, null), null);
  assert.equal(returnOf(settle(record('move', desk, true, { source: { windowId: 1, view: null, label: 'Deck', kind: 'main' } }), { type: 'ack', ok: true }).record, null, null), null);
  assert.equal(returnOf(settle(record('move', desk, true), { type: 'timeout' }).record, null, null), null);
});

test('a destination on the same desk, and a note kept on every view, are offered "also show" only', () => {
  assert.deepEqual(offeredModes(desk, { sourceView: 'features', everyView: false }), ['move', 'show']);
  assert.deepEqual(offeredModes({ ...desk, view: 'features' }, { sourceView: 'features', everyView: false }), ['show'], 'the same view is the same desk');
  assert.deepEqual(offeredModes(desk, { sourceView: 'features', everyView: true }), ['show'], 'on every view: taking it off one desk takes it off all');
  assert.deepEqual(offeredModes(reader, { sourceView: 'features', everyView: false }), ['show']);
  assert.deepEqual(offeredModes(desk, { sourceView: null, everyView: false }), ['move', 'show'], 'a card from the field is on no desk');
});

test('an undone handoff gives a reader back what it showed, closes a reader it opened, and leaves a closed window alone', () => {
  const toReader = { ...record('show', reader, false), previousAddress: 'deck://w/features?note=OLD&panel=note' };
  assert.deepEqual(settle(toReader, { type: 'timeout' }).effects, [{ type: 'readdress', windowId: 9, address: 'deck://w/features?note=OLD&panel=note' }]);
  assert.deepEqual(settle(toReader, { type: 'closed' }).effects, []);
  const opened = { ...record('show', fresh, false), openedWindowId: 12 };
  assert.deepEqual(settle(opened, { type: 'display-removed' }).effects, [{ type: 'close-window', windowId: 12 }]);
  assert.match(settle(opened, { type: 'display-removed' }).reply.said, /the display a new reader on Display 3 is on was disconnected/);
  assert.deepEqual(settle(opened, { type: 'ack', ok: true }).effects, []);
});

// The store, driven by the rule the way the main process drives it.
const WS = 'w';
function desks() {
  let s = reduce(initialState(), { type: 'open-workspace', workspaceId: WS });
  s = reduce(s, { type: 'select-view', viewId: 'features' });
  s = reduce(s, { type: 'put-on-desk', noteId: 'FEAT-0002', x: 10, y: 10, w: 640, h: 560 });
  s = reduce(s, { type: 'put-on-desk', noteId: 'FEAT-0003', x: 40, y: 40 });
  return s;
}
const ids = (s, view) => deskCardsOf(s, WS, view).map((c) => c.noteId);
function hand(s, noteId, mode, destination, answer, sourceView = 'features') {
  const req = request(mode, destination, { noteId, source: { windowId: 1, view: sourceView, label: 'Deck', kind: 'main' } });
  const landing = planLanding(req, { alreadyThere: destination.view !== null && ids(s, destination.view).includes(noteId) });
  if ('refused' in landing) return { s, refused: landing.refused };
  if (landing.put) s = reduce(s, { type: 'put-on-desk', noteId, x: 16, y: 16, w: 640, h: 560, viewId: destination.view });
  const rec = { ...req, id: 'h', state: 'awaiting', put: landing.put };
  const out = landing.awaits ? settle(rec, answer) : settleUnconfirmed(rec);
  for (const effect of out.effects) if (effect.type === 'take-off') s = reduce(s, { type: 'take-off-desk', noteId: effect.noteId, viewId: effect.view });
  return { s, reply: out.reply };
}

test('on every path that does not end acknowledged, the source desk still holds the note and the destination does not gain it', () => {
  for (const answer of [{ type: 'timeout' }, { type: 'closed' }, { type: 'display-removed' }, { type: 'ack', ok: false, error: 'x' }]) {
    const { s, reply } = hand(desks(), 'FEAT-0002', 'move', desk, answer);
    assert.equal(reply.ok, false);
    assert.deepEqual(ids(s, 'features'), ['FEAT-0002', 'FEAT-0003'], JSON.stringify(answer));
    assert.deepEqual(ids(s, 'issues'), [], JSON.stringify(answer));
  }
  const moved = hand(desks(), 'FEAT-0002', 'move', desk, { type: 'ack', ok: true });
  assert.deepEqual(ids(moved.s, 'features'), ['FEAT-0003']);
  assert.deepEqual(ids(moved.s, 'issues'), ['FEAT-0002']);
  const size = deskCardsOf(moved.s, WS, 'issues')[0];
  assert.deepEqual([size.w, size.h], [640, 560], 'it arrives at the size it had');
  const shown = hand(desks(), 'FEAT-0002', 'show', desk, { type: 'ack', ok: true });
  assert.deepEqual(ids(shown.s, 'features'), ['FEAT-0002', 'FEAT-0003']);
  assert.deepEqual(ids(shown.s, 'issues'), ['FEAT-0002']);
});

test('after any sequence of handoffs and failures no desk holds a note twice, and no note is lost', () => {
  const answers = [{ type: 'ack', ok: true }, { type: 'timeout' }, { type: 'closed' }, { type: 'ack', ok: false }];
  const places = [desk, { ...desk, view: 'features', label: 'desk on this view' }, main, { ...main, view: 'issues' }, reader, tablet];
  let seed = 7;
  const next = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let run = 0; run < 40; run += 1) {
    let s = desks();
    for (let step = 0; step < 12; step += 1) {
      const noteId = ['FEAT-0002', 'FEAT-0003'][next(2)];
      const from = ['features', 'issues'].find((v) => ids(s, v).includes(noteId));
      if (from === undefined) assert.fail(`${noteId} is on no desk after step ${step} of run ${run}`);
      const out = hand(s, noteId, ['move', 'show'][next(2)], places[next(places.length)], answers[next(answers.length)], from);
      s = out.s;
      for (const view of ['features', 'issues']) {
        const held = ids(s, view);
        assert.equal(new Set(held).size, held.length, `run ${run} step ${step}: ${view} holds ${held.join(', ')}`);
      }
      for (const id of ['FEAT-0002', 'FEAT-0003']) assert.ok(['features', 'issues'].some((v) => ids(s, v).includes(id)), `run ${run} step ${step}: ${id} is on no desk`);
    }
    assert.equal(JSON.stringify(persistable(s)).includes('handoff'), false, 'nothing about a handoff is in what is saved');
  }
});
