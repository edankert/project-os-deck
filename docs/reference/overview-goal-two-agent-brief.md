---
type: "[[reference]]"
id: REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF
aliases: ["REFERENCE-OVERVIEW-GOAL-TWO-AGENT-BRIEF"]
title: "The overview goal for two agents: what Claude Opus and GPT-6 Astra in Codex each build for PHASE-0005, and how they share one repository without colliding"
status: active
owner: user:edwin
created: 2026-10-14
updated: 2026-10-14
scope: "project"
source: ["Edwin 2026-10-14: 'the goal is to define a goal which can be worked on with both openai astra and claude opus!'", "Edwin 2026-10-14: 'Do not explore, define the goal for claude and codex astra to work on together!'"]
related: ["[[PHASE-0005-Overview]]", "[[DES-0005-The-Overview-Is-Drawn-Not-Written]]", "[[DES-0004-The-Phase-Overview]]", "[[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]]", "[[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]]", "[[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]]", "[[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]]", "[[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]]"]
---

# The overview goal, for Claude and Codex together

## The goal in one paragraph

**Build [[PHASE-0005-Overview]]: Deck opens on a wheel of the project's phases, and every screen behind it shows progress as a picture.** There are seven screens. The wheel (S1), a phase (S2), a ticket (S3) and re-phasing (S4) show where the work stands. Accepting a design (S5), running an acceptance test (S6) and accepting a ticket (S7) are where a person gives a verdict. The phase is done when its seven exit criteria are ticked with evidence. [[DES-0005-The-Overview-Is-Drawn-Not-Written]] says what each screen draws.

Two agents build it. **Claude** is Claude Opus in Claude Code, reading `CLAUDE.md`. **Codex** is GPT-6 Astra in OpenAI Codex, reading `AGENTS.md`. Both files lead to the same project-os rules, so the two agents follow the same lifecycle. This note adds only what working side by side needs.

## Read this first, in this order

Both agents read the same notes before their first edit:

1. Their own start contract: `CLAUDE.md` or `AGENTS.md`.
2. [[PHASE-0005-Overview]]: the goal, the screens, the look, the exit criteria.
3. [[DES-0005-The-Overview-Is-Drawn-Not-Written]]: what each screen draws.
4. [[DES-0004-The-Phase-Overview]]: the ticket states, the placement rules and the wheel this goal grows from. Its prototype `docs/designs/DES-0004-phase-overview.html` holds both workspaces' measured tickets as data.
5. This note.
6. Their lane's feature notes, below.

## The two lanes

**Each feature has one owner, and only that agent edits its code.** The split puts the visual design and drawing in one lane and the data, the checks and the write flows in the other, so the two lanes meet at one seam: the overview model.

| Lane | Owner | Features | First step |
| --- | --- | --- | --- |
| Drawing | `system:claude` | [[FEAT-0025-Every-Overview-Screen-Is-Drawn-Before-It-Is-Built]], then [[FEAT-0027-Deck-Opens-On-The-Wheel-Of-Phases]] and [[FEAT-0028-A-Phase-And-A-Ticket-Open-As-Pictures]] | The DES-0005 prototype and plates. No application code until Edwin accepts DES-0005. |
| Data and flows | `system:codex` | [[FEAT-0026-One-List-Of-Tickets-Each-With-A-Type-A-State-And-A-Place]], then [[FEAT-0029-Designs-Tests-And-Tickets-Are-Accepted-From-Their-Evidence]] | The overview model, its fixtures and the screen checks. Needs no design verdict, so it starts on day one. |

Either lane may be handed to the other agent. Edwin does that by changing the feature's `owner:`, and the new owner reads the feature's "Where this stands" section before anything else.

## The order, and the three gates

1. **Gate A — Edwin starts the phase.** He moves PHASE-0005 to `active`. Until then the lanes do nothing. Passed on 2026-10-14.
2. **Both lanes start at once.** Claude makes DES-0005's prototype and plates. Codex builds the overview model with its fixtures, and the checks every screen is held to.
3. **Gate B — Edwin accepts DES-0005.** This is the design acceptance flow, done in the cockpit for now, because S5 does not exist yet. A decline sends Claude back to step 2 with his reason; Codex's lane is not blocked by it.
4. **Both lanes build.** Claude builds S1, then S2 to S4, against the model's fixtures. Codex builds S5 to S7, drawn as DES-0005 says, with the sidecar reads and writes they need.
5. **Gate C — each feature is accepted.** The agent that did not build a feature reviews it (below). Edwin runs its acceptance tests and accepts it. Once S5 to S7 exist in Deck, he does that in Deck.

## The seam: the overview model

**The model is the one contract between the lanes.** Codex writes it, Claude's screens only read it. Its shape is fixed here so both lanes can start the same day. A change to it is proposed in FEAT-0026's "Questions between the lanes" section and agreed by both before either codes against it.

```ts
type State = 'closed' | 'progress' | 'failed' | 'owed' | 'open' | 'dropped';
type Kind = 'req' | 'feat' | 'task' | 'test' | 'iss' | 'dec' | 'risk';

interface Ticket {
  id: string;            // "FEAT-0024"
  kind: Kind;
  state: State;          // DES-0004's table, "Ticket types and states"
  status: string;        // the note's own status word, for the callout
  title: string;
  phase: string | null;  // where it is drawn, after DES-0004's five placement rules
  placedBy: 'project-wide' | 'own' | 'member-list' | 'parent' | 'none';
  suggestion?: { phase: string; by: 'links' | 'dates' };
  links: string[];       // ids of the notes it links to, for S3
}

interface Phase {
  id: string; number: string; name: string; status: string;
  kind: 'open' | 'finished' | 'backlog';
  exit: { items: { text: string; ticked: boolean }[]; prose: boolean };
  counts: Record<Kind, Record<State, number>>;
  tickets: string[];     // ids, ordered as the wheel draws them
}

interface OverviewModel {
  workspace: string; head: string; generated: string;
  phases: Phase[];       // open phases, in phase order: the wheel's sectors
  shelf: Phase[];        // finished phases
  backlog: Phase[];
  core: { tickets: string[]; counts: Record<Kind, Record<State, number>> };
  tickets: Record<string, Ticket>;
}
```

**The fixtures come first.** Codex's first commit writes `desktop/test/fixtures/overview/deck.json` and `desktop/test/fixtures/overview/your-trainer.json` in this shape, converted from the data in DES-0004's prototype. Claude's screens are built and tested against them. The live model replaces them in Deck when FEAT-0026 lands, and the same tests then run against both.

## The run Edwin started on 2026-10-14

**On 2026-10-14 Edwin asked for the whole phase to be built and tested in one run.** Claude coordinates it from Claude Code and builds the drawing lane. Codex runs as `codex exec` (GPT-6 Astra) in its own worktree, one feature at a time. Three things differ from the rules below for this run, and only for it:

- **Ids come from fixed ranges, not from a race.** Codex takes TASK-0115 to TASK-0124 and TST-0080 to TST-0089. Claude takes TASK-0125 to TASK-0139 and TST-0090 to TST-0099. Neither pushes; Claude merges `lane/codex` and `lane/claude` into `main` and pushes.
- **Codex does not wait on Gate B.** Edwin's instruction to build the phase stands in for starting the build. DES-0005 still goes to him as `proposed`, and his verdict on it is still his to give.
- **Window-opening runs are batched by Claude**, once per feature, because both lanes share one screen.

**Two files are the contracts, and Claude wrote them before either lane started.** `desktop/src/shared/overview-types.ts` is the model's shape. `desktop/src/shared/overview-scene.ts` describes a screen as data: marks, texts with `rest: true` or `false`, images, groups, and the list twin. Every screen is a pure function from the model (and, for S5 to S7, from what the sidecar returns) to a `Scene`. The renderer draws a scene with `sceneToSvg`, the plate script draws the same scene into DES-0005's pictures, and the screen checks read it in a node test.

**The addresses.** A screen is a page or a flow on whatever view is current: `?page=wheel` (S1, and what Deck opens on), `?page=phase&note=PHASE-0002` (S2), `?page=ticket&note=FEAT-0024` (S3), `?page=rephase` (S4), `?flow=design&note=DES-0005` (S5), `?flow=test-run&step=android` (S6, a platform, or `android.3` for its third section), `?flow=accept&note=FEAT-0024` (S7). Each registers itself in `pageKinds` or `flowKinds` in `desktop/src/shared/vocabularies.ts`.

**Where the data comes from.** The model is served by Deck's host at `/deck/overview/<workspaceId>`, built in the main process from the note index. S5 to S7 read the sidecar through the host's existing `/deck/sidecar/<workspaceId>/...` forwarding, and write only through the main process's `write-client.ts`.

## Working side by side without colliding

- **Each agent works in its own git worktree, on its own branch**: `lane/claude` and `lane/codex`. Each rebases on `main` at least at the start of every session, and lands work on `main` in small fast-forward merges. This is the "parallel feature work" case where Edwin allows branches.
- **A new id is taken on `main` and pushed at once.** Pull `main`, create the note, commit it alone, push. If the push is refused because the other agent took the same number, renumber the note before anything links to it. Never hold an unpushed id for longer than the commit that creates it.
- **`SNAPSHOT.yaml` is derived, so a conflict in it is never merged by hand.** Take `main`'s version and run `python3 tools/scripts/sync-snapshot.py`. `focus` names the task of whoever last merged; the other agent's task stays `doing` with its own `owner:`.
- **Files both lanes touch are changed in commits of their own.** These are `desktop/package.json`, the list of views in the built-in project-os view provider, the address grammar, and the test runner. Rebase first, change only the lines you need, land it on `main` at once, and say so in the other lane's feature note.
- **A question for the other agent is written down, not assumed.** Each feature note has a "Questions between the lanes" section. Write the question there, dated, and land it on `main`. The other agent reads that section at the start of every session and answers under the question.
- **Every session ends with "Where this stands"** rewritten in the lane's current feature note: what is done with the commit, what is next, what waits on whom. That section is the handoff, to the other agent and to Edwin.

## Review: each agent reviews the other's work

**A feature built by one agent is reviewed by the other.** When a feature reaches `review`, its owner writes the packet with `tools/scripts/review-packet.py` and asks Edwin to start the other agent on it. The reviewer follows `tools/skills/independent-review/SKILL.md` from a clean session, and records its verdict on the feature with its model named (`model:claude-opus-5-5` or `model:gpt-6-astra`). Two different models looking at one feature is the reason for two lanes, not only speed.

## What only Edwin does

- Starting the phase (Gate A) and moving it in `docs/PHASES.md`.
- Accepting or declining DES-0005 and any later design.
- Recording a result for an acceptance test, on any platform.
- Accepting a feature, and choosing who owns a lane.
- Letting a test run open windows. Window-opening runs take focus from his screen, so an agent asks before one and batches them once per feature. Node suites run freely.

The sidecar refuses a person-only verdict from an agent session. An agent never looks for a way around that refusal.

## When a task or feature is done

- **A task is done** when its code is on `main`, its automated tests pass in `npm test`, CI is green (`gh run list --limit 1`), and the note says what was run and when.
- **A feature reaches `review`** when its tasks are done and each screen it adds passes the look's checks on both fixtures: at most 60 words at rest, no number without a mark, an address and a list twin.
- **A feature is `done`** only after the other agent's review and Edwin's acceptance tests pass.

## Starting each agent

Edwin starts each lane with one prompt. These are the prompts.

**Claude (Claude Code, Opus):**

> You are the drawing lane of PHASE-0005. Read docs/reference/overview-goal-two-agent-brief.md and follow its read order. Work in a worktree on branch lane/claude. Start FEAT-0025: build the DES-0005 prototype and its plates from real data, then move DES-0005 to proposed and tell me. Write no application code until I accept DES-0005.

**Codex (GPT-6 Astra):**

> You are the data-and-flows lane of PHASE-0005. Read docs/reference/overview-goal-two-agent-brief.md and follow its read order. Work in a worktree on branch lane/codex. Start FEAT-0026: write the two overview fixtures first and push them, then build the overview model from Deck's index and the screen checks, with node tests. Do not open windows without asking me.
