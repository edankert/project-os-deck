/**
 * A ticket selected on the towers (TASK-0182): its card and its pane, as DES-0005's
 * towers page draws them (TASK-0176).
 *
 * The card says what the ticket is: its mark, id and title, its status in the cockpit's
 * words, its feature, phase, owner and last update, what to do when it needs you, and its
 * linked tickets counted by type. Its buttons open the ticket's own screen, frame it and
 * its links, bring its phase close, or clear the selection. The pane gives the ticket's
 * first paragraph and its linked tickets as the cockpit's rows, grouped by type; pressing
 * a row selects that ticket. With a phase brought close the pane starts with a way back
 * to the phase's list, which it stands in place of.
 *
 * Both are panels: data in the scene, built as HTML in Deck, so their words are a list's
 * and not words at rest. Their buttons are in the list twin.
 */
import { FILL_WORD, type NoteType, type OverviewModel, type Ticket } from './overview-types.js';
import { NOTE_TYPES, TYPE_WORD } from './overview-marks.js';
import type { ListRow, PanelButton, PanelNode, PanelRow, PanelSection, ScreenContext } from './overview-scene.js';
import { shortPhaseName, type TowersLayout } from './overview-towers.js';

/** The action a card's Frame button asks the 3D view for; the renderer answers it, no screen does. */
export const FRAME_ACTION = 'towers-frame';

const PLURAL: Readonly<Record<NoteType, string>> = {
  feature: 'Features', task: 'Tasks', requirement: 'Requirements', issue: 'Issues', risk: 'Risks', adr: 'Decisions', design: 'Designs', test: 'Tests',
};

export interface SelectionPlaces {
  card: { x: number; y: number; w: number; h: number };
  pane: { x: number; y: number; w: number; h: number };
}

/** The phase whose segment a ticket stands in on the ring: its feature's tower's, or its own tile's. */
export function standsIn(layout: TowersLayout, id: string): string | null {
  for (const p of layout.phases) {
    if (p.tiles.some((c) => c.id === id) || p.towers.some((t) => t.cubes.some((c) => c.id === id))) return p.id;
  }
  return null;
}

function row(t: Ticket, target: string): PanelRow {
  return { id: t.id, type: t.type, fill: t.fill, needsYou: t.needsYou, title: t.title, status: t.status, target, ...(t.needs ? { note: t.needs.say } : {}) };
}

/** The status as the cockpit says it: its fill's word, and "needs you" when it does. */
export function stateWords(t: Ticket): string {
  return [FILL_WORD[t.fill], t.needsYou ? 'needs you' : null].filter(Boolean).join(', ');
}

export function selectionPanels(model: OverviewModel, layout: TowersLayout, ctx: ScreenContext, places: SelectionPlaces): { nodes: PanelNode[]; rows: ListRow[] } {
  const sel = layout.selection;
  const t = sel === null ? undefined : model.tickets[sel.id];
  if (sel === null || t === undefined) return { nodes: [], rows: [] };
  const open = layout.open;
  const here = (select: string | null): string => ctx.address(open === null ? { page: 'wheel', select } : { page: 'phase', note: open, select });
  const phaseOf = (id: string | null): string => {
    if (id === null) return 'no phase';
    const p = [...model.phases, ...model.backlog, ...model.shelf].find((x) => x.id === id);
    return p === undefined ? id : `${p.number} ${shortPhaseName(p.name)}`;
  };
  const feature = t.kind === 'feat' ? undefined : t.feature !== undefined ? model.tickets[t.feature] : undefined;
  const facts = [
    { key: 'Feature', value: t.kind === 'feat' ? 'its own tower' : feature !== undefined ? `${feature.id} ${feature.title}` : 'none' },
    { key: 'Phase', value: phaseOf(t.phase) },
    { key: 'Owner', value: t.owner ?? 'nobody' },
    { key: 'Updated', value: t.updated ?? 'no date' },
  ];
  const linked = sel.links.map((l) => model.tickets[l.id]!).filter(Boolean);
  const counts = NOTE_TYPES.map((type) => ({ type, n: linked.filter((x) => x.type === type).length })).filter((c) => c.n > 0);
  const stands = standsIn(layout, t.id);
  const buttons: PanelButton[] = [
    { key: 'open', text: 'Open', label: `Open ${t.id} on its own screen, with its whole text`, target: ctx.address({ page: 'ticket', note: t.id }) },
    { key: 'frame', text: 'Frame', label: `Turn the camera to ${t.id} and the tickets it is joined to`, action: FRAME_ACTION },
    ...(stands !== null && stands !== open ? [{ key: 'phase', text: 'Its phase', label: `Bring ${phaseOf(stands)} close, with ${t.id} still selected`, target: ctx.address({ page: 'phase', note: stands, select: t.id }) }] : []),
    { key: 'clear', text: 'Clear', label: 'Clear the selection (Escape)', target: here(null) },
  ];
  const card: PanelNode = {
    kind: 'panel', key: `card-${t.id}`, ...places.card, label: `${t.id} selected: what it is, and its buttons`,
    body: { kind: 'card', row: row(t, ctx.address({ page: 'ticket', note: t.id })), state: stateWords(t), facts, ...(t.needs ? { say: t.needs.say } : {}), counts, buttons },
  };
  // Its linked tickets by type, in the cockpit's order of types; each row selects its ticket.
  const sections: PanelSection[] = NOTE_TYPES.map((type) => ({
    key: `linked-${type}`,
    title: PLURAL[type],
    rows: linked.filter((x) => x.type === type).map((x) => row(x, here(x.id))),
  })).filter((s) => s.rows.length > 0);
  const paneButtons: PanelButton[] = open === null ? [] : [{ key: 'back', text: `◂ ${open}'s list`, label: `Back to ${phaseOf(open)}'s list of tickets`, target: here(null) }];
  const pane: PanelNode = {
    kind: 'panel', key: `pane-${t.id}`, ...places.pane, label: `${t.id}: its first paragraph and the ${linked.length} tickets it is joined to`,
    body: { kind: 'rows', sections, buttons: paneButtons, ...(t.lead !== undefined ? { lead: t.lead } : {}) },
  };
  const more = sel.total > sel.links.length ? `, ${sel.total - sel.links.length} more not drawn` : '';
  const rows: ListRow[] = [
    { id: `selected-${t.id}`, label: `Selected: ${t.id} ${t.title} (${t.status}), joined to ${sel.links.length} tickets${more}`, group: 'Selected' },
    ...buttons.map((b) => ({ id: `card-${b.key}`, label: b.label, group: 'Selected', ...(b.target !== undefined ? { target: b.target } : {}), ...(b.action !== undefined ? { action: b.action } : {}) })),
    ...paneButtons.map((b) => ({ id: `pane-${b.key}`, label: b.label, group: 'Selected', target: b.target! })),
    ...linked.map((x) => ({ id: x.id, label: `${TYPE_WORD[x.type]} ${x.id} ${x.title} (${x.status})`, group: `Joined to ${t.id}`, state: x.state, target: here(x.id) })),
  ];
  return { nodes: [card, pane], rows };
}
