/**
 * The two decisions the smoke run makes about ITSELF, kept where they can be
 * checked without Electron.
 *
 * The smoke run is the only thing that drives Deck's renderer, and nothing
 * checked the smoke run. On 2026-09-08 it reported two failures in a
 * popped-out desk window; the window was fine, and what had happened was that
 * `npm run smoke` carried no `--workspace`, opened none, and ran the panel
 * checks against a workspace that did not exist (ISS-0022). Both decisions
 * that let that happen live here now, and the suite drives them.
 */
import path from 'node:path';

/**
 * The workspace the smoke run drives when `--workspace` names none.
 *
 * `moduleDir` is the built module's own directory, `desktop/dist/main`, so
 * three steps up is the repository. Passed in rather than read from
 * `__dirname` so the suite can state what it is measuring from.
 */
export function defaultWorkspacePath(moduleDir: string): string {
  return path.resolve(moduleDir, '..', '..', '..');
}

export interface SmokeVerdict {
  ok: boolean;
  failures: string[];
  skipped: string[];
  notApplicable: string[];
}

/**
 * Whether the run may be called ok.
 *
 * **A SKIPPED check counts against it, exactly as a failed one does.** A run
 * that checks half of Deck and prints `ok: true` is what hid the workspace half
 * of the smoke run for a day: every check that needed a workspace was quietly
 * not run, and the two that did run without one failed for a reason nothing in
 * the output named (ISS-0022).
 *
 * **A NOT-APPLICABLE check does not**, and the distinction is real rather than
 * a loophole. `skipped` means a check that should have run and could not — no
 * workspace, no interpreter for a sidecar. `notApplicable` means a check that
 * belongs to a configuration this run is not: the tablet-shaped checks need
 * `--lan`, and a loopback run has not failed to make them, it has made a
 * different run. Both are printed, so neither hides.
 *
 * The line to hold: a reason may only be `notApplicable` when running the check
 * would require a DIFFERENT INVOCATION, not when it would require fixing
 * something.
 */
export function smokeVerdict(failures: string[], skipped: string[], notApplicable: string[] = []): SmokeVerdict {
  return { ok: failures.length === 0 && skipped.length === 0, failures, skipped, notApplicable };
}
