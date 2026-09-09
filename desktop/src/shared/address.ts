/**
 * The address grammar: the written form of a Deck state.
 *
 *   deck://<workspaceId>/<viewId>
 *       [?desk=<name>][&note=<id>][&panel=<kind>]
 *       [&surface=<kind>][&page=<kind>][&flow=<kind>][&step=<id>]
 *
 * Parsing REFUSES what it cannot read and never falls back to a default view.
 * The cockpit's navigator does fall back — an unknown mode silently becomes
 * `features` — and that hid a broken Tests view for thirty-three hours.
 *
 * Four of the seven query keys are VOCABULARIES rather than free text, and
 * none of the four is a literal list in this file. The parser asks a registry
 * each phase adds to (`registry.ts`, TASK-0052), which keeps the guarantee
 * that an address cannot name something Deck cannot draw while letting Glass
 * add a surface and Parity add pages without editing the grammar.
 */
import type { DeckAddress, PanelType } from './types.js';
import { panelKinds } from './panels.js';
import { flowKinds, pageKinds, surfaceKinds } from './vocabularies.js';

const SCHEME = 'deck://';
const WORKSPACE_RE = /^[a-z0-9]{4,64}$/;
const VIEW_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
// Desk names are typed by a person and note ids come from the sidecar, so
// both admit apostrophes, spaces, accents and slashes. Values are
// percent-encoded in the address, which is what makes that safe; what is
// refused is only what cannot survive the round trip — control characters,
// nothing, or something absurdly long.
const NOTE_RE = /^[^\u0000-\u001f\u007f]{1,200}$/;
const DESK_RE = /^[^\u0000-\u001f\u007f]{1,64}$/;
/**
 * A step's own name inside a flow.
 *
 * Not a vocabulary: which steps a flow has is the flow's business, and no flow
 * is built yet. What the grammar can still say is the SHAPE of a step name and
 * that a step outside a flow names nothing at all.
 */
const STEP_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/**
 * The order keys are written in, which is also the set the parser accepts.
 *
 * One list, read by both ends: a key the formatter can write and the parser
 * refuses is an address Deck hands a person and then rejects, which is the
 * failure TASK-0017 already fixed once for desk names.
 */
const QUERY_KEYS = ['desk', 'note', 'panel', 'surface', 'page', 'flow', 'step'] as const;
const KNOWN_KEYS = new Set<string>(QUERY_KEYS);

export class AddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AddressError';
  }
}

/** Every value the formatter would write, checked the way the parser checks it. */
function refusalFor(address: DeckAddress): string | null {
  if (!WORKSPACE_RE.test(address.workspaceId)) return `not a workspace id: "${address.workspaceId}"`;
  if (!VIEW_RE.test(address.viewId)) return `not a view id: "${address.viewId}"`;
  if (address.desk !== null && !DESK_RE.test(address.desk)) return `not a desk name: "${address.desk}"`;
  if (address.note !== null && !NOTE_RE.test(address.note)) return `not a note id: "${address.note}"`;
  // A panel, a surface and a page each name something Deck draws. An address
  // naming a fourth panel would open a window carrying something else, which
  // is the silent fallback this grammar exists to refuse.
  if (address.panel !== null && !panelKinds.has(address.panel)) return panelKinds.refusal(String(address.panel));
  if (address.surface !== null && !surfaceKinds.has(address.surface)) return surfaceKinds.refusal(String(address.surface));
  if (address.page !== null && !pageKinds.has(address.page)) return pageKinds.refusal(String(address.page));
  if (address.flow !== null && !flowKinds.has(address.flow)) return flowKinds.refusal(String(address.flow));
  if (address.step !== null) {
    if (!STEP_RE.test(address.step)) return `not a step: "${address.step}"`;
    // A step outside a flow names nothing. Writing one would produce an
    // address that says where a person is without saying what they are in.
    if (address.flow === null) return `"step" needs a "flow": a step outside a flow names nothing`;
  }
  return null;
}

export function formatAddress(address: DeckAddress): string {
  // A key that is absent means the same as a key that is null: this state
  // does not have that part. Being forgiving about a MISSING key costs
  // nothing; being forgiving about an unknown VALUE is what this grammar
  // exists to refuse, and that check is below and is not relaxed.
  const full = completed(address);
  // Every field is checked here, not only the two in the path. The two ends
  // have to agree: a desk name the interface accepts but the parser refuses
  // hands the person an address that Deck itself rejects.
  const refusal = refusalFor(full);
  if (refusal !== null) throw new AddressError(refusal);
  const query: string[] = [];
  for (const key of QUERY_KEYS) {
    const value = full[key];
    if (value !== null) query.push(`${key}=${encodeURIComponent(value)}`);
  }
  const tail = query.length > 0 ? `?${query.join('&')}` : '';
  return `${SCHEME}${full.workspaceId}/${full.viewId}${tail}`;
}

/** Every optional key present, so nothing downstream has to ask twice. */
function completed(address: DeckAddress): DeckAddress {
  const out = emptyAddress(address.workspaceId, address.viewId);
  for (const key of QUERY_KEYS) out[key] = address[key] ?? null;
  return out;
}

export function parseAddress(raw: string): DeckAddress {
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new AddressError('an address cannot be empty');
  }
  const text = raw.trim();
  if (!text.startsWith(SCHEME)) {
    throw new AddressError(`an address starts with "${SCHEME}": "${text}"`);
  }
  const rest = text.slice(SCHEME.length);
  const queryAt = rest.indexOf('?');
  const pathPart = queryAt === -1 ? rest : rest.slice(0, queryAt);
  const queryPart = queryAt === -1 ? '' : rest.slice(queryAt + 1);

  const segments = pathPart.split('/');
  if (segments.length !== 2) {
    throw new AddressError(`an address names a workspace and a view: "${text}"`);
  }
  const [workspaceId, viewId] = segments as [string, string];
  if (!WORKSPACE_RE.test(workspaceId)) {
    throw new AddressError(`not a workspace id: "${workspaceId}"`);
  }
  if (!VIEW_RE.test(viewId)) {
    throw new AddressError(`not a view id: "${viewId}"`);
  }

  const out = emptyAddress(workspaceId, viewId);
  if (queryPart !== '') {
    const seen = new Set<string>();
    for (const pair of queryPart.split('&')) {
      const eq = pair.indexOf('=');
      if (eq === -1) throw new AddressError(`"${pair}" is not a key and a value`);
      const key = pair.slice(0, eq);
      if (!KNOWN_KEYS.has(key)) {
        throw new AddressError(`"${key}" is not part of an address`);
      }
      // One value per key. Two `note=` clauses is a question with two answers,
      // and picking either one is the guessing this grammar refuses to do.
      if (seen.has(key)) throw new AddressError(`"${key}" appears twice in one address`);
      seen.add(key);
      let value: string;
      try {
        value = decodeURIComponent(pair.slice(eq + 1));
      } catch {
        throw new AddressError(`"${key}" is not readable as text`);
      }
      if (value === '') throw new AddressError(`"${key}" has no value`);
      (out as unknown as Record<string, string | null>)[key] = value;
    }
  }
  // Checked once, through the same function the formatter uses, so what one
  // end writes is exactly what the other end accepts.
  const refusal = refusalFor(out);
  if (refusal !== null) throw new AddressError(refusal);
  return out;
}

function emptyAddress(workspaceId: string, viewId: string): DeckAddress {
  return {
    workspaceId,
    viewId,
    desk: null,
    note: null,
    panel: null,
    surface: null,
    page: null,
    flow: null,
    step: null,
  };
}

/** An address naming nothing but a workspace and a view. */
export function addressFor(workspaceId: string, viewId: string, parts: Partial<DeckAddress> = {}): DeckAddress {
  return { ...emptyAddress(workspaceId, viewId), ...parts, workspaceId, viewId };
}

/**
 * Whether a desk name can be written into an address.
 *
 * Exported so the place a person types one can refuse it there, with a reason,
 * rather than letting it through and failing later when the address is copied.
 */
export function isDeskName(value: string): boolean {
  return DESK_RE.test(value);
}

/** Parse without throwing, for callers that want to report rather than fail. */
export function tryParseAddress(raw: string): { ok: true; address: DeckAddress } | { ok: false; reason: string } {
  try {
    return { ok: true, address: parseAddress(raw) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export type { PanelType };
