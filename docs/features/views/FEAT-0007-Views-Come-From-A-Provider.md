---
type: "[[feature]]"
id: FEAT-0007
aliases: ["FEAT-0007"]
title: "Views come from a provider: the renderer holds no fixed set of view buttons"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-06
updated: 2026-09-07
source: ["[[PHASE-0001-Deck]]"]
goal: "Deck asks a view provider which views the current workspace has and draws whatever comes back. For a project-os repository the built-in provider offers the same views the cockpit's navigator does. A vault's `.base` files can become views later by adding a provider, without touching the renderer."
requirements: []
tasks: ["[[TASK-0019-The-Provider-Interface-And-The-Project-Os-Provider]]", "[[TASK-0020-The-Switcher-Draws-What-The-Provider-Returned]]"]
release: ""
acceptance_exception: ""
reviewed_by: model:claude-opus-5
review_date: 2026-09-07
review_verdict: approved
related: ["[[PHASE-0001-Deck]]", "[[REFERENCE-SURFACE-ARCHITECTURE-OPTIONS]]", "[[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]"]
---

# Views come from a provider

## Goal

Deck asks a view provider which views the current workspace has and draws whatever comes back. For a project-os repository the built-in provider offers the same views the cockpit's navigator does. A vault's `.base` files can become views later by adding a provider, without touching the renderer.

## Scope

**In scope.** The provider interface: given a workspace, return its views, each with an id, a label and how to fetch its contents. The project-os provider, whose list matches the cockpit's navigator modes. The switcher in the renderer, which renders the returned list and nothing else. The choice of provider by workspace kind, with one kind implemented here.

**Out of scope.** The provider that reads a vault's `.base` files, which is [[PHASE-0003-Vault]]. This feature exists so that phase can add it without a retrofit.

**Not asked of the cockpit.** Edwin decided on 2026-09-06 that the list of views is Deck's concern; the sidecar is not changed to answer it.

## Acceptance

- The renderer contains no literal list of view names: the switcher renders exactly what the provider returned.
- For this repository, the provider returns the same views the cockpit's navigator shows, checked name by name.
- Adding a second provider changes which views appear, with no change to the switcher.
- A view the provider did not return cannot be selected, and asking for one by address reports it as unknown.

## Links

- Phase: [[PHASE-0001-Deck]]
- Tasks: [[TASK-0019-The-Provider-Interface-And-The-Project-Os-Provider]], [[TASK-0020-The-Switcher-Draws-What-The-Provider-Returned]]
- Plan: `docs/features/views/plan/PLAN.md`

## Independent review — 2026-09-06

**Verdict: approved.** Reviewed from a clean context (a separate session that never saw the author's reasoning), starting from the notes and the working tree. Same model family as the author, recorded in `reviewed_by`; the independence claimed here is session and context, not vendor (`tools/instructions/QUALITY.md`, "Independent review (clean-context)").

All four acceptance criteria were checked against the code rather than the notes.

- **No literal view names in the renderer.** `renderSwitcher` (`desktop/src/renderer/renderer.ts:174`) iterates `currentViews`, which comes from `registry.viewsFor(workspace)`. The guard in `desktop/tests/views.test.mjs:61` scans the built renderer for each fixture id.
- **The list matches the cockpit, checked name by name.** Verified independently of the fixture, against the cockpit's own navigator markup (`../project-os-cockpit/desktop/src/renderer/index.html`, the `.top-bar-modes` buttons): overview, intent, features, issues, tests, publication, library — seven, in that order. `desktop/fixtures/cockpit-views.json` and `PROJECT_OS_VIEWS` both match. The live smoke run drew the same seven.
- **A second provider changes the views with no switcher change.** `ViewRegistry.register` plus the vault-provider case in the suite.
- **A view the provider did not return cannot be selected.** Guarded in `selectView` and reported by `applyAddress`.

Two observations that are not criterion misses and were left as notes rather than issues.

- The renderer prefers `DEFAULT_VIEW_ID` (`renderer.ts:170`) when the restored `viewId` is not in the provider's list. The constant lives in the provider module, so the criterion holds, but the behaviour is a silent fallback to `features` — the same shape as the cockpit bug FEAT-0006 exists to prevent. Nothing reports that the stored view was dropped.
- The literal scan covers `dist/web/renderer/` only, so a view name moved into `dist/web/shared/` would not be seen. That is the correct scope for the criterion as written; it is worth knowing the guard's edge.

## Where this stands

**2026-09-07: done.** The walk is made and the second independent review approved this feature. [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]] passed — Edwin walked it on 2026-09-07 and marked it pass in the release ledger. A second clean-context review, run at the close-out of [[PHASE-0001-Deck]], read this feature's code and criteria again and approved it with no findings against it ([[REFERENCE-PHASE-0001-CLOSEOUT-REVIEW]]).

**2026-09-06: built, tested and independently reviewed; the acceptance walk is owed.** The review is recorded above and approved this feature against its four criteria. The status is `review` rather than `done` because the claim a person settles — that Deck's views are the cockpit's views — is settled by looking at both applications, which is [[TST-0008-Spread-Opens-The-Same-Notes-As-The-Cockpit]]. The automated half of that claim is pinned to a fixture read off the cockpit's own navigator, so a drift fails the build rather than waiting for the walk.
