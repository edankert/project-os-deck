/** Read-only acceptance results for the overview (TASK-0140).
 * Mirrors release-test.py load_events/resolve and the cockpit's ledger.resolve:
 * sealed ledgers first, open ledgers last, dates within each file, file order
 * for same-day events. Excuses expire at sealing; invalidations clear both
 * the persistent verdict and any temporary one above it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export interface AcceptanceLedger {
  revision: string;
  results: Readonly<Record<string, readonly string[]>>;
}
interface Entry { check: string; date: string; result: string; invalidated: boolean }
interface Ledger { platform: string; sealed: string; entries: Entry[] }
const PERSISTS = new Set(['pass', 'partial', 'na']);
const RESULTS = new Set([...PERSISTS, 'fail', 'excused', 'blocked', 'question']);
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const date = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

function parseLedger(name: string, source: string): Ledger {
  const platform = /^(?:WORKING|[A-Z]{2,6}-\d{3,4})-([a-z][a-z0-9_-]*)\.json$/.exec(name)?.[1];
  const bad = (why: string): never => { throw new Error(`Acceptance ledger ${name}: ${why}`); };
  if (!platform) return bad('filename does not name a platform');
  const raw: unknown = JSON.parse(source);
  if (!object(raw) || !Array.isArray(raw['entries'])) return bad('expected an entries array');
  if (text(raw['platform']) && raw['platform'] !== platform) return bad('platform differs from filename');
  const sealed = text(raw['sealed']);
  if (sealed && !date(sealed)) return bad('unusable seal date');
  const entries: Entry[] = raw['entries'].map((entry: unknown) => {
    if (!object(entry)) return bad('entry is not an object');
    const check = text(entry['check']), when = text(entry['date']);
    if (!check || !date(when)) return bad('entry needs a check and usable date');
    const invalidated = Boolean(text(entry['invalidated_by']));
    // Sealed history keeps the old `mark` field; never rewrite it to read it.
    const result = text(entry['result']) || text(entry['mark']);
    if (!invalidated && !RESULTS.has(result)) return bad(`${check} has unknown result ${result}`);
    return { check, date: when, result, invalidated };
  });
  return { platform, sealed, entries };
}

export function readAcceptanceLedger(docsRoot: string): AcceptanceLedger {
  const dir = path.join(docsRoot, 'releases', 'ledgers');
  let names: string[];
  try { names = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort(); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    names = [];
  }
  const hash = createHash('sha256');
  const ledgers = names.map((name) => {
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    hash.update(JSON.stringify([name, source]));
    return parseLedger(name, source);
  }).sort((a, b) => Number(!a.sealed) - Number(!b.sealed) || a.sealed.localeCompare(b.sealed));
  const platforms = [...new Set(ledgers.map((l) => l.platform))].sort();
  const byPlatform = new Map<string, Map<string, string>>();
  const checks = new Set<string>();
  for (const platform of platforms) {
    const standing = new Map<string, string>(), transient = new Map<string, string>();
    const withdrawn = new Set<string>();
    for (const ledger of ledgers.filter((l) => l.platform === platform)) {
      for (const entry of ledger.entries.slice().sort((a, b) => a.date.localeCompare(b.date))) {
        checks.add(entry.check);
        if (entry.invalidated) {
          standing.delete(entry.check); transient.delete(entry.check); withdrawn.add(entry.check);
        } else if (PERSISTS.has(entry.result)) {
          standing.set(entry.check, entry.result); transient.delete(entry.check); withdrawn.delete(entry.check);
        } else if (!ledger.sealed) {
          transient.set(entry.check, entry.result);
        }
      }
    }
    // Keep a withdrawal when a subsequent question/blocked result still owes
    // the retest. A new failure outranks it; a current excuse clears it.
    const results = new Map<string, string>();
    for (const check of checks) {
      const result = transient.get(check) ?? standing.get(check);
      results.set(check, result === 'fail' || result === 'excused' ? result : withdrawn.has(check) ? 'withdrawn' : result ?? 'not-run');
    }
    byPlatform.set(platform, results);
  }
  const results = Object.create(null) as Record<string, string[]>;
  for (const check of checks) results[check] = platforms.map((platform) => byPlatform.get(platform)?.get(check) ?? 'not-run');
  return { revision: hash.digest('hex'), results };
}
