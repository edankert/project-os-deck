/** PHASE-0005's word, count, address and list-twin checks, without a window.
 * Each count needs one text and one markRef; split ratios and multi-count labels.
 * Number roles need a mark even on hover. Names need words beyond numeric tokens.
 * Other rest text excludes real ids, explicit "Phase 2", dates, times and versions
 * from inferred counts. Id roles must contain only identifiers or padded phase
 * numbers (at least three digits, or a leading zero). They cannot hide prose.
 * Panel row and note text is exempt from both words at rest and inferred
 * number checks. It is data in a PanelNode, never TextNodes; do not expand
 * panelSvgNodes here. A panel section's count must equal its rows: those rows
 * (or the folded strip) are its marks. Panel rendering tests enforce that rule.
 * Panel rows still owe the same list twin as ticket marks.
 * This checks declared integer counts, not the geometry of the mark.
 */
import { formatAddress, parseAddress } from './address.js';
import { walkScene, type Scene, type TextNode } from './overview-scene.js';

export interface SceneCheck { rule: 'words' | 'numbers' | 'address' | 'twin'; ok: boolean; detail: string }
export interface SceneCheckOptions { maxWords?: number }

// Your Trainer also has four retired, typed test notes predating TST ids.
// They remain tickets in the index; phase ids and aggregate mark ids do not.
const TICKET_ID = /^(?:(?:REQ|FEAT|TASK|TST|ISS|ADR|DES|RISK)-\d+|ACCEPTANCE-(?:CHECKLIST|RUN|TESTS)-[\w.-]+)$/;
const ID_TOKEN = /^(?:REQ|FEAT|TASK|TST|ISS|ADR|DES|RISK|PHASE|CHG|REL)-\d+$/;
const tokens = (value: string): string[] => value.trim().split(/\s+/).filter(Boolean);
const unpunctuated = (token: string): string => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
const validIdText = (text: TextNode): boolean => tokens(text.text).length > 0 && tokens(text.text).every((token) =>
  ID_TOKEN.test(token) || TICKET_ID.test(token) || /^(?:0\d+|\d{3,})$/.test(token));
// Ratios, percentages, scientific notation and abbreviated counts are not names.
// Keep digits within real names, including "Schwinn 800IC" and "Model 3".
const bareCountName = (value: string): boolean => /\d/.test(value) && !/\p{L}/u.test(value
  .replace(/\b0(?:x[\da-f]+|o[0-7]+|b[01]+)\b/gi, '')
  .replace(/\b\d[\d,.]*(?:e[+-]?\d+|\s*[kmb])?\b/gi, '').replace(/\bof\b/gi, ''));

function countValues(text: TextNode): number[] {
  let value = text.text;
  if (text.role !== 'number') {
    // A name's digits belong to the name: the 800 in "Schwinn 800IC" counts nothing.
    if (text.role === 'id' || text.role === 'name' || !text.rest) return [];
    value = tokens(value).filter((token) => !ID_TOKEN.test(unpunctuated(token))).join(' ')
      .replace(/\bphase\s+\d+\b/gi, '')
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
  const words = texts.filter((n) => n.rest && !(n.role === 'id' && validIdText(n))).flatMap((n) => tokens(n.text))
    .filter((token) => !ID_TOKEN.test(unpunctuated(token))).length;
  const limit = options.maxWords ?? 60;
  const numberErrors: string[] = [];
  for (const text of texts) {
    if (text.role === 'id' && !validIdText(text)) numberErrors.push(`"${text.text}" is not id text`);
    if (text.role === 'name' && bareCountName(text.text)) numberErrors.push(`"${text.text}" is a count, not a name`);
    const values = countValues(text);
    if (text.role !== 'number' && values.length === 0) continue;
    const matching = text.markRef === undefined ? [] : marks.filter((m) => m.markId === text.markRef);
    const mark = matching[0];
    if (values.length !== 1 || matching.length !== 1 || mark?.count === undefined || !Number.isSafeInteger(mark.count) || mark.count < 0 || !values.includes(mark.count)) {
      numberErrors.push(`"${text.text}" needs one mark with the displayed count (${text.markRef ?? 'no markRef'})`);
    }
  }
  // The new panels' numbers each stand beside the marks they count (TASK-0187): the needs-you count is
  // its bar's parts, and its rows are among them; the year is 52 weeks with no ticket in two; a board's
  // done count is within its total. A panel draws these as pictures, so the rule is checked on its data.
  for (const node of nodes) {
    if (node.kind !== 'panel') continue;
    const b = node.body;
    if (b.kind === 'needs') {
      const ids = b.parts.flatMap((p) => p.ids);
      // In the shell the count adds the open requests and the waiting agents to the bar's tickets (FEAT-0034).
      const more = (b.requests?.length ?? 0) + (b.agents?.length ?? 0);
      if (b.total !== ids.length + more) numberErrors.push(`${node.key}: says ${b.total} need you, it draws ${ids.length} tickets${more > 0 ? `, ${more} requests and agents` : ''}`);
      if (b.parts.some((p) => p.ids.length === 0)) numberErrors.push(`${node.key}: a part of the bar draws nothing`);
      if (b.rows.some((r) => !ids.includes(r.id))) numberErrors.push(`${node.key}: a row is in no part of the bar`);
    }
    if (b.kind === 'weeks') {
      const ids = [...b.weeks.flat(), ...b.undated, ...b.other];
      if (b.weeks.length !== 52) numberErrors.push(`${node.key}: draws ${b.weeks.length} weeks, not 52`);
      if (new Set(ids).size !== ids.length) numberErrors.push(`${node.key}: a ticket is counted twice`);
    }
    if (b.kind === 'rows' && b.heading?.of !== undefined && b.heading.done !== undefined && !(b.heading.done >= 0 && b.heading.done <= b.heading.of)) {
      numberErrors.push(`${node.key}: ${b.heading.done} of ${b.heading.of} done`);
    }
  }
  let addressError = '';
  try {
    const address = parseAddress(scene.address);
    if (formatAddress(address) !== scene.address) addressError = 'Address does not round-trip exactly';
    else {
      const flow = ['design', 'test-run', 'accept'].includes(scene.screen);
      if (flow ? address.flow !== scene.screen : address.page !== scene.screen || address.flow !== null) {
        addressError = `Address does not name the ${scene.screen} screen`;
      }
    }
  } catch (error) { addressError = error instanceof Error ? error.message : String(error); }
  const drawn = new Set(marks.flatMap((m) => m.ticket === undefined ? [] : [m.ticket]));
  for (const node of nodes) if (node.kind === 'panel' && node.body.kind === 'rows') {
    for (const section of node.body.sections) for (const row of section.rows) drawn.add(row.id);
  }
  // The needs-you panel's rows are ticket rows too (TASK-0184).
  for (const node of nodes) if (node.kind === 'panel' && node.body.kind === 'needs') for (const row of node.body.rows) drawn.add(row.id);
  const listed = new Set(scene.list.filter((r) => TICKET_ID.test(r.id) || drawn.has(r.id)).map((r) => r.id));
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
