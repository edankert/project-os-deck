/**
 * The address grammar: the written form of a Deck state.
 *
 *   deck://<workspaceId>/<viewId>[?desk=<name>][&note=<id>][&panel=<id>]
 *
 * Parsing REFUSES what it cannot read and never falls back to a default view.
 * The cockpit's navigator does fall back — an unknown mode silently becomes
 * `features` — and that hid a broken Tests view for thirty-three hours.
 */
import type { DeckAddress } from './types.js';

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
const PANEL_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const QUERY_KEYS = new Set(['desk', 'note', 'panel']);

export class AddressError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AddressError';
  }
}

export function formatAddress(address: DeckAddress): string {
  if (!WORKSPACE_RE.test(address.workspaceId)) {
    throw new AddressError(`not a workspace id: "${address.workspaceId}"`);
  }
  if (!VIEW_RE.test(address.viewId)) {
    throw new AddressError(`not a view id: "${address.viewId}"`);
  }
  // Every field is checked here, not only the two in the path. The two ends
  // have to agree: a desk name the interface accepts but the parser refuses
  // hands the person an address that Deck itself rejects.
  if (address.desk !== null && !DESK_RE.test(address.desk)) {
    throw new AddressError(`not a desk name: "${address.desk}"`);
  }
  if (address.note !== null && !NOTE_RE.test(address.note)) {
    throw new AddressError(`not a note id: "${address.note}"`);
  }
  if (address.panel !== null && !PANEL_RE.test(address.panel)) {
    throw new AddressError(`not a panel id: "${address.panel}"`);
  }
  const query: string[] = [];
  if (address.desk !== null) query.push(`desk=${encodeURIComponent(address.desk)}`);
  if (address.note !== null) query.push(`note=${encodeURIComponent(address.note)}`);
  if (address.panel !== null) query.push(`panel=${encodeURIComponent(address.panel)}`);
  const tail = query.length > 0 ? `?${query.join('&')}` : '';
  return `${SCHEME}${address.workspaceId}/${address.viewId}${tail}`;
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

  const out: DeckAddress = { workspaceId, viewId, desk: null, note: null, panel: null };
  if (queryPart !== '') {
    for (const pair of queryPart.split('&')) {
      const eq = pair.indexOf('=');
      if (eq === -1) throw new AddressError(`"${pair}" is not a key and a value`);
      const key = pair.slice(0, eq);
      if (!QUERY_KEYS.has(key)) {
        throw new AddressError(`"${key}" is not part of an address`);
      }
      let value: string;
      try {
        value = decodeURIComponent(pair.slice(eq + 1));
      } catch {
        throw new AddressError(`"${key}" is not readable as text`);
      }
      if (value === '') throw new AddressError(`"${key}" has no value`);
      if (key === 'desk') {
        if (!DESK_RE.test(value)) throw new AddressError(`not a desk name: "${value}"`);
        out.desk = value;
      } else if (key === 'note') {
        if (!NOTE_RE.test(value)) throw new AddressError(`not a note id: "${value}"`);
        out.note = value;
      } else {
        if (!PANEL_RE.test(value)) throw new AddressError(`not a panel id: "${value}"`);
        out.panel = value;
      }
    }
  }
  return out;
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
