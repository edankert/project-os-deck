/**
 * The next-up board (TASK-0183, TASK-0176 on DES-0005's towers page): the tasks of the
 * feature in focus, in the style of Rubric's routines. The last two finished are greyed
 * with their dates, the next ticket is lit and marked NEXT, and up to six more follow: in
 * progress, then at review, then waiting, each with who has it. The heading counts the
 * feature's tasks done, cancelled ones left out, beside a bar of the same count; the foot
 * counts the tasks the board has no room for. Pressing a row selects that ticket.
 *
 * With no feature in focus, or one that does not stand on the ring, it says which and is
 * empty. It is a panel, so its words are a list's.
 */
import { boardOf, type BoardTask } from './overview-notes.js';
import type { ListRow, PanelNode, ScreenContext } from './overview-scene.js';
import type { OverviewModel } from './overview-types.js';
import type { TowersLayout } from './overview-towers.js';

const WORD = { done: 'done', next: 'NEXT', doing: 'in progress', review: 'at review', queued: 'waiting' } as const;

export function nextUpPanel(model: OverviewModel, layout: TowersLayout, ctx: ScreenContext, place: { x: number; y: number; w: number; h: number }): { node: PanelNode; rows: ListRow[] } {
  const feature = model.focus?.feature ?? null;
  const tower = feature === null ? undefined : layout.phases.flatMap((p) => p.towers).find((t) => t.feature === feature);
  const base = { kind: 'panel' as const, key: 'next-up', ...place };
  if (tower === undefined) {
    const why = feature === null ? "This workspace's snapshot names no feature in focus." : `The feature in focus, ${feature}, does not stand on the ring, so it has no tasks to list here.`;
    return { node: { ...base, label: `Next up: ${why}`, body: { kind: 'rows', sections: [], heading: { text: 'Next up' }, foot: why } }, rows: [] };
  }
  const tasks: BoardTask[] = tower.cubes.slice(1).map((c) => model.tickets[c.id]!).filter((t) => t.type === 'task')
    .map((t) => [t.id, t.type, t.fill, t.needsYou ? 1 : 0, t.status, t.title, t.needs?.say ?? '', t.state]);
  const board = boardOf(tasks, model.next ?? null, (id) => model.tickets[id]?.updated);
  const select = (id: string): string => ctx.address({ page: 'wheel', select: id });
  const rows = board.rows.map(({ id, kind }) => {
    const t = model.tickets[id]!;
    const aside = kind === 'done' ? (t.updated ?? '') : (t.owner ?? '');
    return { id, type: t.type, fill: t.fill, needsYou: t.needsYou, title: t.title, status: WORD[kind], target: select(id), tag: kind, ...(aside !== '' ? { aside } : {}) };
  });
  const more = (['doing', 'review', 'queued'] as const).filter((k) => board.more[k] > 0).map((k) => `${board.more[k]} ${WORD[k]}`);
  const head = model.head !== '' ? `read at ${model.head.slice(0, 7)}` : '';
  const foot = [more.length > 0 ? `+ ${more.join(', ')}` : '', head].filter(Boolean).join(' · ');
  return {
    node: {
      ...base,
      label: `Next up in ${feature}: ${board.done} of ${board.of} tasks done`,
      body: { kind: 'rows', sections: [{ key: 'board', title: feature!, rows }], heading: { text: `Next up · ${feature}`, done: board.done, of: board.of }, ...(foot !== '' ? { foot } : {}) },
    },
    rows: rows.map((r) => ({ id: r.id, label: `${r.status}: ${r.id} ${r.title}${r.aside ? ` (${r.aside})` : ''}`, group: 'Next up', state: model.tickets[r.id]!.state, target: r.target })),
  };
}
