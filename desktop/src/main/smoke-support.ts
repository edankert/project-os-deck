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
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The commit whose notes the smoke run reads (TASK-0171). The run used to read the
 * repository's live notes, and a note filed at triage turned fourteen Glass checks red
 * on a commit that changed only notes (ISS-0092): each check starts from whatever note
 * the corpus puts in a given place. `d296ebe` is the last commit whose smoke run passed
 * before that note. Move the pin on purpose, after a smoke run passes on the new one.
 */
export const SMOKE_CORPUS = 'd296ebe2d256fa05c04d8bbe6f850a9b70ba560f';

/**
 * A copy of `repo` at `pin`, in `into`, for the smoke run to open as its workspace: a
 * local clone that shares the repository's objects, checked out at the pinned commit.
 * Its writes stay in the copy. Throws, saying how to fetch it, when the commit is not
 * in the repository (a shallow clone).
 */
export function pinnedCorpus(repo: string, into: string, pin = SMOKE_CORPUS): string {
  const git = (args: string[]): string => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    git(['-C', repo, 'cat-file', '-e', `${pin}^{commit}`]);
  } catch {
    throw new Error(`the smoke run's notes are pinned at ${pin.slice(0, 7)}, which this clone does not have; fetch the history (git fetch --unshallow), or run it live with --live-corpus`);
  }
  fs.rmSync(into, { recursive: true, force: true });
  git(['clone', '--quiet', '--shared', '--no-checkout', repo, into]);
  git(['-C', into, 'checkout', '--quiet', '--detach', pin]);
  return into;
}

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

export interface FocusPolicy {
  /** May the run pull the keyboard out of whatever the person is typing in? */
  takesKeyboard: boolean;
  /** Why, in a sentence the runner prints before the first window opens. */
  why: string;
}

/**
 * Whether this run is allowed to take the keyboard (ISS-0075).
 *
 * **The default is unchanged: it takes it.** The keyboard checks measure
 * something real, and on macOS `win.focus()` does not take focus from another
 * application, so without `app.focus({ steal: true })` Chromium holds back the
 * renderer's focus events and a keyboard check measures nothing. What changed
 * is that a person on a Mac no longer reaches that path by default:
 * `tools/scripts/run-smoke.sh` hands over to `smoke-in-a-box.sh`, where the
 * run has a screen of its own and there is no keyboard to take.
 *
 * `--no-focus` (or `DECK_SMOKE_NO_FOCUS=1`) is the escape hatch for a run on
 * the real screen that must not interrupt: windows are shown without being
 * activated, `sendInputEvent` still reaches them, and the checks that assert
 * `document.hasFocus()` will fail. That is a different run, and the runner
 * says so out loud rather than letting a person read the failures as defects.
 */
export function focusPolicy(argv: readonly string[], env: Record<string, string | undefined> = {}): FocusPolicy {
  if (argv.includes('--no-focus')) {
    return { takesKeyboard: false, why: '--no-focus: windows are shown without being activated, and the keyboard checks will fail' };
  }
  if (env['DECK_SMOKE_NO_FOCUS'] === '1') {
    return { takesKeyboard: false, why: 'DECK_SMOKE_NO_FOCUS=1: windows are shown without being activated, and the keyboard checks will fail' };
  }
  return { takesKeyboard: true, why: 'the keyboard checks need Deck frontmost, so this run will take the keyboard' };
}
