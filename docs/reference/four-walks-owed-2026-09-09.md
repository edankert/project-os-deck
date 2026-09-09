---
type: "[[reference]]"
title: "The four walks PHASE-0001 is waiting on, in one sitting"
status: active
owner: user:edwin
created: 2026-09-09
updated: 2026-09-09
source: ["[[PHASE-0001-Deck]]'s four unticked exit criteria, 2026-09-09"]
related: ["[[TST-0010-Deck-Opens-Read-Only-On-A-Tablet]]", "[[TST-0011-Deck-Opens-A-Workspace-You-Add-And-Leaves-Nothing-Running]]", "[[TST-0027-A-Base-File-Reads-As-A-Description-And-The-Seven-Views-Are-Unchanged]]", "[[TST-0028-A-Criterion-Ticked-In-Deck-Is-Ticked-In-The-Cockpit]]", "[[PHASE-0001-Deck]]"]
---

# Four walks, about ninety minutes, and PHASE-0001 closes

Everything else in the phase is done: ten features `done` and approved after seven independent review passes, 322 automated checks, both CI jobs green on `main`. These four walks are the whole remainder, and each one asks something no machine here can answer.

**The machine-answerable half of each is already measured** — that is what the three scripts below are for. Run them first and the walks get shorter, because you are then confirming what a person sees rather than establishing what is true.

## Before you start

```
cd desktop && npm install          # once, ever
../project-os-cockpit/.venv/bin/python3 tools/scripts/check-counts-live.py
node tools/scripts/check-bases-live.mjs
node tools/scripts/check-write-round-trip.mjs      # needs a clean docs/ tree
```

All three should print no failures. They settle the counting, the base-file reading and the write round-trip; what is left is what a person sees.

## 1. TST-0011 — a workspace you add, and nothing left running (about 10 minutes, no extra hardware)

The cheapest one. Do it first.

1. `cd desktop && npm start`.
2. **+ add a workspace** in the left rail → `/Users/Edwin/Dev/repos/project-os-deck`. Click it to open.
3. **+ add a workspace** again → a folder that is neither a project-os repository nor a vault (`/tmp` will do). **Read the line at the foot of the window** — it should name what it wanted and what it found.
4. If the cockpit is open on the same repository, read the status line: it says whether Deck started a sidecar or reused the running one.
5. `pgrep -fl project_os_cockpit` in a terminal. Write the ids down. Quit Deck with ⌘Q. Wait five seconds. Run it again and compare, id by id.
6. Start Deck again, open the same workspace, note the ids, then **Ctrl+C** in Deck's terminal. Wait five seconds. Compare again.

**Do not kill anything by hand.** A sidecar left behind is the result; killing it destroys the evidence. If one is left, say so in the ledger.

## 2. TST-0028 — a criterion ticked in Deck, seen in the cockpit (about 20 minutes, needs the cockpit open)

Steps 2–4, 7 and 8 are already measured by `check-write-round-trip.mjs`. What it cannot do is press the control or look at a second application.

1. Deck and the cockpit both open on this repository. A terminal with `git diff` ready.
2. Pick a note with an unticked criterion. Open it in Deck's reader and **press the tick control**; type the evidence when Deck asks.
3. `git diff` on that file. The line should read `- [x] … — evidence: … (actor, date)`.
4. **Look at the same note in the cockpit.** No reload, no restart.
5. Try to tick something and leave the evidence box empty. Deck should refuse and say why.
6. Find a note whose status can move. Compare the verbs Deck offers against the cockpit's, one by one, and apply one.
7. With that note open in a second Deck window, change it in the cockpit. **The second window should offer to take the change, not redraw underneath you.**

## 3. TST-0027 — a base file against Obsidian (about 20 minutes, needs Obsidian)

Steps 4–7 are measured. Step 8 is the one that matters and only Obsidian can answer it.

1. Walk the seven project-os views in Deck and compare them against the cockpit, heading by heading. Any difference is a fail, **including one that looks like an improvement.**
2. Open `~/Notes` in Deck. Point it at a Comic base, then the sidebar base, then a TaskNotes base.
3. **Open the same base file in Obsidian and compare the two lists of notes.** Where they differ, Deck must have named an unsupported construct explaining it. A silently different list is the failure this walk exists for.

`check-bases-live.mjs` prints how many views draw a list and report nothing — those are where a difference would be silent, and they are where to look.

## 4. TST-0010 — Deck on a tablet (about 30 minutes, needs an iPad and a POST tool)

1. `cd desktop && npm run start:lan`. Note the port it prints; `ipconfig getifaddr en0` gives the address.
2. On the tablet, open `http://<address>:<port>/` in Safari. Move through the views, open several cards.
3. **Look for what should be absent, not greyed out**: no **Pop out** in the top bar, no **+ add a workspace** in the rail, and no tick or verb control on any note.
4. Send a `POST` to `http://<address>:<port>/deck/workspaces` and read the status code. Safari's address bar cannot do this; a shortcut, a REST client, or `curl` from another Mac will.
5. **A workspace still indexing:** add `/Users/Edwin/Dev/repos/your-trainer` on the Mac, click it, then immediately open it on the tablet while the Mac is still filling. Read what the tablet says. Wait thirty seconds, reload, open it again.
6. **A way out of an allowed path:** press **Copy address** on the Mac and take the sixteen hex characters between `deck://` and the next `/`. From the tablet ask for `.../deck/sidecar/<id>/api/render?file=../../../../etc/passwd`, then again with the dots as `%252e%252e%252f`. Read both status codes. Then open a note whose name has a space or a percent sign and check it still renders.

## Recording what you find

Each walk's verdict goes in the release ledger, not on the note — `docs/releases/ledgers/WORKING-app.json`, which is what `ADR-0037` decided. Then the matching exit criterion in [[PHASE-0001-Deck]] is ticked with the date.

**A fail is a result, not a setback.** Two of these were walked on 2026-09-07 and reopened on 2026-09-08 because the fixes underneath them changed what the claim meant, and that reopening is why the phase is in the state it is rather than in a worse one nobody had noticed.
