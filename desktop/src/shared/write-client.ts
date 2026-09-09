/**
 * The only way a write leaves Deck.
 *
 * **A separate surface from the read client, deliberately.**
 * `shared/sidecar-client.ts` has no method that writes and never will; that is
 * what [[TST-0001]] asserts by driving a fake sidecar and checking only `GET`
 * ever arrives. This module is the named exception, and the claim it makes is
 * narrower and checkable: a write leaves Deck through here or it does not
 * leave at all.
 *
 * **It is called from the main process and from nowhere else** ([[ADR-0003]]).
 * The sidecar authorises a write by one fact — the request arrived from
 * loopback — and Deck's main process is on the same machine, so its requests
 * qualify. A tablet's do not, and forwarding one through Deck's HTTP host
 * would put a loopback address on a request that came from the network: the
 * same hole [[ADR-0001]] closed for the sidecar's loopback-only reads. So
 * Deck's host does not change, still answers 405 to every method that is not a
 * read, and forwards no write under any condition.
 *
 * **A refusal comes back as the sidecar worded it.** The sidecar knows things
 * Deck does not — that the criterion matched two lines, that the note changed
 * on disk, that the transition is not offered from this status — and replacing
 * that with a generic failure would throw away the only sentence a person can
 * act on.
 */

export class WriteRefused extends Error {
  /** The HTTP status the sidecar answered with, for a caller that wants it. */
  readonly status: number;
  readonly url: string;
  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = 'WriteRefused';
    this.status = status;
    this.url = url;
  }
}

/** The verbs a note allows, as the sidecar returned them. Deck restates none. */
export interface ActuatorRow {
  verb: string;
  to: string;
  /** Whether this verb should be confirmed before it is applied. */
  confirm: boolean;
  disabled: boolean;
  /** Why it is disabled, in the sidecar's own words. */
  reason: string;
  /**
   * The path this verb posts to, when it is not the generic transition.
   *
   * Deck reads the field rather than the note's type: the one place that knows
   * a design's verdict is special is the sidecar's own module.
   */
  endpoint: string;
}

export interface TransitionRequest {
  id: string;
  to: string;
  actor: string;
  /** The note's modification time as the sidecar reported it, in seconds. */
  mtime?: number;
  severity?: string;
  note?: string;
  option?: string;
}

export interface TickRequest {
  id: string;
  /** The criterion's exact prose, as the sidecar stamped it on the checkbox. */
  criterion: string;
  evidence: string;
  actor: string;
  mtime?: number;
  reason?: string;
}

/**
 * The endpoints Deck knows how to post to.
 *
 * A row with an empty `endpoint` is the generic transition, which Deck does.
 * Anything else is a verb whose verdict belongs to a surface of its own, and
 * today Deck has none of them.
 */
export const IMPLEMENTED_ENDPOINTS: readonly string[] = [''];

/** Whether Deck can actually carry out the verb this row names (ISS-0039). */
export function canPerform(row: Pick<ActuatorRow, 'endpoint'>): boolean {
  return IMPLEMENTED_ENDPOINTS.includes(row.endpoint ?? '');
}

/**
 * Where a verb Deck cannot perform is recorded instead.
 *
 * A sentence rather than a silent missing button. A design at `proposed`
 * really does owe somebody a decision, so a person needs to be told where to
 * make it — not shown a control that posts a request the sidecar refuses.
 *
 * The refusal is the sidecar's own reasoning, said before the request rather
 * than after it: `/api/design/verdict` requires the revision the verdict
 * judged, because a verdict given to v3 says nothing about v6. Deck has no
 * design surface and no revision history, so it cannot name one.
 */
export function elsewhere(row: Pick<ActuatorRow, 'verb' | 'endpoint'>): string {
  if (canPerform(row)) return '';
  if (row.endpoint === '/api/design/verdict') {
    return `${row.verb} is a design verdict, and a verdict has to name the revision it judged. Deck holds no design revisions, so this decision is recorded in the cockpit.`;
  }
  return `${row.verb} is recorded through ${row.endpoint}, which Deck does not have a surface for yet; make this decision in the cockpit.`;
}

/**
 * Build one transition request out of what a window sent.
 *
 * **A function rather than an object literal in the IPC handler, because the
 * literal quietly lost two fields** (ISS-0037). The handler listed the fields
 * it forwarded, `note` and `severity` were never on the list, and nothing
 * failed: the sidecar writes its decision callout only when prose arrives and
 * says nothing when none does, so a Decline made in Deck recorded no grounds
 * while the same Decline in the cockpit recorded them. Here the mapping can be
 * driven by a check, and deleting a field turns one red.
 *
 * The ACTOR is a separate argument and is never read from the request, so a
 * window cannot claim to be somebody else.
 */
export function transitionRequestFrom(request: Record<string, unknown>, actor: string): TransitionRequest {
  const text = (key: string): Record<string, string> => {
    const value = request[key];
    return typeof value === 'string' && value !== '' ? { [key]: value } : {};
  };
  return {
    id: String(request['id'] ?? ''),
    to: String(request['to'] ?? ''),
    actor,
    ...(typeof request['mtime'] === 'number' ? { mtime: request['mtime'] } : {}),
    ...text('note'),
    ...text('severity'),
    ...text('option'),
  };
}

/** The same, for a criterion. See {@link transitionRequestFrom}. */
export function tickRequestFrom(request: Record<string, unknown>, actor: string): TickRequest {
  const reason = request['reason'];
  return {
    id: String(request['id'] ?? ''),
    criterion: String(request['criterion'] ?? ''),
    evidence: String(request['evidence'] ?? ''),
    actor,
    ...(typeof request['mtime'] === 'number' ? { mtime: request['mtime'] } : {}),
    ...(typeof reason === 'string' && reason !== '' ? { reason } : {}),
  };
}

type Poster = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal },
) => Promise<Response>;

export interface WriteClientOptions {
  /** Injected in tests; defaults to the runtime's own fetch. */
  poster?: Poster;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export class SidecarWriteClient {
  private readonly base: string;
  private readonly poster: Poster;
  private readonly timeoutMs: number;

  constructor(base: string, options: WriteClientOptions = {}) {
    this.base = base.replace(/\/+$/, '');
    this.poster = options.poster ?? ((url, init) => fetch(url, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * One human-owned status transition.
   *
   * Deck sends the row's `to` and nothing about which verbs are legal: the
   * table lives in the sidecar's `HUMAN_TRANSITIONS`, keyed by the note's
   * CURRENT status, so a stale Deck window cannot replay an action that has
   * since stopped being offered. That is project-os-cockpit#REQ-0026, and the
   * refusal is the server's so no display bug can widen it.
   */
  async transition(request: TransitionRequest): Promise<unknown> {
    const body: Record<string, unknown> = { id: request.id, to: request.to, actor: request.actor };
    if (request.mtime !== undefined) body['mtime'] = request.mtime;
    if (request.severity !== undefined && request.severity !== '') body['severity'] = request.severity;
    if (request.note !== undefined && request.note !== '') body['note'] = request.note;
    if (request.option !== undefined && request.option !== '') body['option'] = request.option;
    return this.post('/api/notes/transition', body);
  }

  /**
   * Resolve one acceptance or exit criterion, with evidence.
   *
   * The criterion is addressed by its exact prose, which the sidecar stamped
   * on the rendered checkbox as `data-raw`. Deck invents no id scheme and
   * tracks no line number: it carries the attribute back unchanged.
   */
  async tick(request: TickRequest): Promise<unknown> {
    const body: Record<string, unknown> = {
      id: request.id,
      criterion: request.criterion,
      evidence: request.evidence,
      actor: request.actor,
    };
    if (request.mtime !== undefined) body['mtime'] = request.mtime;
    if (request.reason !== undefined && request.reason !== '') body['reason'] = request.reason;
    return this.post('/api/notes/tick', body);
  }

  private async post(path: string, body: Record<string, unknown>): Promise<unknown> {
    const url = `${this.base}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.poster(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new WriteRefused(`the sidecar did not answer: ${reason}`, 0, url);
    } finally {
      clearTimeout(timer);
    }
    let payload: { ok?: boolean; error?: string; result?: unknown } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      // A body that will not read leaves only the status to report.
    }
    if (!response.ok || payload.ok === false) {
      // The sidecar's own sentence, whole. It knows what Deck does not: that
      // the criterion matched two lines, that the note changed underneath.
      const said = typeof payload.error === 'string' && payload.error !== '' ? payload.error : `answered ${response.status}`;
      throw new WriteRefused(said, response.status, url);
    }
    return payload.result ?? null;
  }
}

/** Read the actuator rows out of the sidecar's answer, dropping nothing. */
export function actuatorRows(payload: unknown): ActuatorRow[] {
  if (typeof payload !== 'object' || payload === null) return [];
  const raw = (payload as Record<string, unknown>)['actions'];
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const row = entry as Record<string, unknown>;
    const verb = typeof row['verb'] === 'string' ? row['verb'] : '';
    if (verb === '') return [];
    return [
      {
        verb,
        to: typeof row['to'] === 'string' ? row['to'] : '',
        confirm: row['confirm'] === true,
        disabled: row['disabled'] === true,
        reason: typeof row['reason'] === 'string' ? row['reason'] : '',
        endpoint: typeof row['endpoint'] === 'string' ? row['endpoint'] : '',
      },
    ];
  });
}

/**
 * The sidecar's refusal, in words a person can act on.
 *
 * Two cases, and only two. The sidecar refuses a tick when the criterion text
 * matches nothing or matches more than one line, and neither is a fault in
 * Deck or something a person can guess the fix for from the sentence alone.
 * Everything else is passed through exactly as the sidecar worded it — it
 * knows what Deck does not — and the HTTP status is never shown.
 *
 * The two sentences are matched against the sidecar's OWN wording, read from
 * `note_writes.py` on 2026-09-09 and confirmed against a live refusal:
 *
 *     no criterion on TASK-0052 reads 'the text'
 *     2 criteria on TASK-0052 read 'the text' — resolving one would be a guess about which
 *
 * A first attempt at this matched neither, because both were written from
 * memory of what such a message might say.
 */
export function wordRefusal(said: string): string {
  if (/criteria on .+ read /i.test(said) || /guess about which/i.test(said)) {
    return `${said}. Two criteria in this note are worded the same, so there is no way to say which one you meant; making them different is the fix.`;
  }
  if (/no criterion on .+ reads /i.test(said)) {
    return `${said}. The note has changed since this page was drawn, so the line Deck was addressing is not there any more.`;
  }
  return said;
}
