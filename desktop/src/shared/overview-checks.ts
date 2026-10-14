/** PHASE-0005, The look: rules 1, 2 and 5, with no renderer or window.
 *
 * Count rule: role=number ALWAYS needs a mark, even on hover. Otherwise only
 * rest text is inspected. Identifiers (role=id or ticket-id tokens), explicit
 * "Phase 2" labels, padded phase labels ("002 Glass"), ISO dates, clock times
 * and dotted version labels are not counts. Any remaining digit run is a
 * count, including a fraction or percentage. Its markRef must resolve uniquely
 * to a mark with a finite, nonnegative integer count matching a displayed
 * value. A ratio can name its numerator or denominator. This verifies the
 * declared count, not whether SVG geometry actually draws that many things.
 * Use role=id for a bare phase number; never use it to hide a count. A
 * role=name text (a phase's or a ticket's title) counts as words but is never
 * read as a count.
 */
import { formatAddress, parseAddress } from './address.js';
import { walkScene, type Scene, type TextNode } from './overview-scene.js';

export interface SceneCheck { rule: 'words' | 'numbers' | 'address' | 'twin'; ok: boolean; detail: string }
export interface SceneCheckOptions { maxWords?: number }

// Your Trainer also has four retired, typed test notes predating TST ids.
// They remain tickets in the index; phase ids and aggregate mark ids do not.
const TICKET_ID = /^(?:(?:REQ|FEAT|TASK|TST|ISS|ADR|DES|RISK)-\d+|ACCEPTANCE-(?:CHECKLIST|RUN|TESTS)-[\w.-]+)$/;
const ID_TOKEN = /^[A-Z]+-\d+/;

function countValues(text: TextNode): number[] {
  let value = text.text;
  if (text.role !== 'number') {
    // A name's digits belong to the name: the 800 in "Schwinn 800IC" counts nothing.
    if (text.role === 'id' || text.role === 'name' || !text.rest) return [];
    value = value.replace(/\b[A-Z]+-\d+(?:-[\w-]+)?\b/g, '')
      .replace(/\bphase\s+\d+\b/gi, '')
      .replace(/^0\d{2,}(?=\s+[A-Za-z]|$)/, '')
      .replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, '')
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '')
      .replace(/\bv?\d+\.\d+\.\d+(?:-[\w.-]+)?\b/gi, '');
  }
  return [...value.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => Number(m[0].replace(/,/g, '')));
}

export function checkScene(scene: Scene, options: SceneCheckOptions = {}): SceneCheck[] {
  const nodes = [...walkScene(scene.nodes)];
  const texts = nodes.filter((n) => n.kind === 'text');
  const marks = nodes.filter((n) => n.kind === 'mark');
  const words = texts.filter((n) => n.rest && n.role !== 'id').flatMap((n) => n.text.trim().split(/\s+/))
    .filter((token) => token !== '' && !ID_TOKEN.test(token.replace(/^[^\p{L}\p{N}]+/u, ''))).length;
  const limit = options.maxWords ?? 60;
  const numberErrors: string[] = [];
  for (const text of texts) {
    const values = countValues(text);
    if (text.role !== 'number' && values.length === 0) continue;
    const matching = text.markRef === undefined ? [] : marks.filter((m) => m.markId === text.markRef);
    const mark = matching[0];
    if (matching.length !== 1 || mark?.count === undefined || !Number.isSafeInteger(mark.count) || mark.count < 0 || !values.includes(mark.count)) {
      numberErrors.push(`"${text.text}" needs one mark with the displayed count (${text.markRef ?? 'no markRef'})`);
    }
  }
  let addressError = '';
  try {
    if (formatAddress(parseAddress(scene.address)) !== scene.address) addressError = 'Address does not round-trip exactly';
  } catch (error) { addressError = error instanceof Error ? error.message : String(error); }
  const drawn = new Set(marks.flatMap((m) => m.ticket === undefined ? [] : [m.ticket]));
  const listed = new Set(scene.list.filter((r) => TICKET_ID.test(r.id)).map((r) => r.id));
  const missing = [...drawn].filter((id) => !listed.has(id));
  const extra = [...listed].filter((id) => !drawn.has(id));
  const actions = [...new Set(marks.flatMap((m) => m.action === undefined ? [] : [m.action]))];
  const absentActions = actions.filter((action) => !scene.list.some((r) => r.action === action));
  const twinErrors = [
    missing.length ? `Missing rows: ${missing.join(', ')}` : '', extra.length ? `Rows without marks: ${extra.join(', ')}` : '',
    absentActions.length ? `Missing actions: ${absentActions.join(', ')}` : '',
  ].filter(Boolean);
  return [
    { rule: 'words', ok: words <= limit, detail: `${words} words at rest; limit ${limit}` },
    { rule: 'numbers', ok: numberErrors.length === 0, detail: numberErrors.join('; ') || 'Every count names its mark' },
    { rule: 'address', ok: addressError === '', detail: addressError || scene.address },
    { rule: 'twin', ok: twinErrors.length === 0, detail: twinErrors.join('; ') || `${drawn.size} ticket ids and ${actions.length} actions match` },
  ];
}
