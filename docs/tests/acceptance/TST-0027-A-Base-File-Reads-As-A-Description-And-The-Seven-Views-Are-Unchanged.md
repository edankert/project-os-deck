---
type: "[[test]]"
id: TST-0027
aliases: ["TST-0027"]
title: "The seven project-os views look exactly as they did, and a base file from the vault reads as a description whose unsupported constructs are named on screen"
status: active
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
phase: "[[PHASE-0001-Deck]]"
scope: system
level: acceptance
entrypoint: ""
command: ""
last_verified: ""
covers: ["[[FEAT-0012-A-View-Is-A-Description]]"]
issues: []
tasks: []
artifacts: ["tools/scripts/check-bases-live.mjs"]
adequacy: ""
mutation_score: ""
reviewed_by: ""
review_date: ""
review_verdict: ""
related: ["[[PHASE-0001-Deck]]", "[[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]", "[[PHASE-0003-Vault]]"]
area: "descriptions"
---

# A base file reads as a description, and the seven views are unchanged

## Purpose

A view is now a document rather than three fields of code ([[ADR-0004-A-View-Is-A-Description]]). Two things have to be true at once for that to be worth doing. Nothing a person already uses may change: the seven project-os views must look exactly as they did. And a base file Edwin wrote in Obsidian must read as a Deck description, with whatever Deck cannot understand named on screen rather than silently dropped.

The second half is the one that decides whether the language was seeded correctly. Edwin's point on 2026-09-08 was that the Bases subset "cannot represent everything"; this walk measures how far it does get.

## Setup

- Once, ever: `cd desktop && npm install`. To start Deck: `cd desktop && npm start`.
- **Two workspaces**, both added by hand from the left rail's **+ add a workspace**: `/Users/Edwin/Dev/repos/project-os-deck`, and your `~/Notes` vault.
- **The cockpit open on this repository**, for the first half's comparison.
- **The seven views** are the buttons in Deck's top bar: Overview, Intent, Features, Issues, Tests, Publication, Library.
- **Have a screenshot of Deck's Features and Issues views from before this work landed**, or the cockpit open beside it, so "unchanged" is checkable rather than remembered.

## Procedure

1. Open this repository in Deck. Walk all seven views. Compare the headings, the counts, the order and the folding against the cockpit view by view.
2. Do the same on Your Trainer, whose Issues view is the large one.
3. Open `~/Notes` in Deck.
4. Point Deck at one of the Comic card bases — Characters, Chapters, Locations or Pages — as a view. Read what it draws.
5. Point Deck at the sidebar base, the one whose filters are relative to the note it is embedded in.
6. Point Deck at one of the TaskNotes bases, which use view types and keys that are the plugin's rather than Obsidian's.
7. For each of the three, read whatever Deck says about constructs it could not understand.
8. Open the same base file in Obsidian and compare the list of notes with Deck's.

## Expected results

- All seven project-os views are visually and structurally the same as before: same view names in the same order, same group headings, same counts, same folding, same card faces. Any difference at all is a fail, including one that looks like an improvement.
- A Comic card base draws its notes with the portrait, cover, scene or image the file names as the card's face.
- The sidebar base, whose filters are relative to an embedding note Deck does not have, says so by name. It must not draw an empty list with no explanation.
- The TaskNotes base draws what it can and names the plugin's view types and keys as constructs Deck does not support. A parse failure that draws nothing is a fail.
- Every message about an unsupported construct names the construct. "Could not read this view" is a fail.
- Where Deck's list differs from Obsidian's for the same file, Deck has named an unsupported construct explaining it. A silently different list is the fail this check exists to catch ([[RISK-0003-Two-Evaluators-Of-The-Bases-Language]]).

## Evidence (fill after running)

- The seven views compared, with anything that differs.
- For each of the three base files: what Deck drew, what it named as unsupported, and what Obsidian drew.

## Steps 4 to 7 are now measured, over every base file rather than three

**Run `node tools/scripts/check-bases-live.mjs` before walking this.** It reads every `.base` file in the vault the way Deck reads it and prints, per view, how many notes it selects and every construct it refuses to guess at. Reads only; nothing is started and nothing is written.

**On 2026-09-09: 19 base files, 46 views, and no view that selects nothing without saying something about its own filter.** Every number in this section is one the script prints; none of them is counted by hand. Three that were counted by hand were wrong ([[ISS-0043-Three-Numbers-Written-The-Day-ISS-0036-Closed-Do-Not-Reproduce]]).

What it settles, step by step:

- **Step 4, the Comic card bases.** `Novel Base.base` draws Characters (10 notes), Chapters (2) and Locations (8) with no unsupported construct at all. Pages selects nothing and names `this.` as the reason.
- **Step 5, the sidebar base.** `Novel Base - Side Bar.base` has six views, every one of them filtered relative to the note it is embedded in, and every one says so: *"a `this.`-relative filter names the note a view is embedded in, and no Deck surface has one yet"*. Six empty lists, six explanations, which is the expected result written out.
- **Step 6, the TaskNotes bases.** Six files, and they are the interesting case: `tasknotesCalendar`, `tasknotesKanban`, `tasknotesMiniCalendar` and `tasknotesTaskList` are all named as the plugin's own view types, each one drawn as a list instead of refused — and the views still select 38 and 39 notes. Deck reads the parts it understands and names `options`, `calendarView`, `startDateProperty`, `listDayCount`, `titleProperty`, `columnOrder` and `dateProperty` as keys it keeps unread. One formula is reported for a real gap: `%` has no meaning in Deck's evaluator, at the character where it appears.
- **Step 7, the messages.** Every one names the construct. There is no "could not read this view" anywhere in the output.

**What excuses an empty view is something said about ITS OWN FILTER.** The first version of this asked whether the file had reported anything at all, which is not the same question: "Today" and "This Week" in `TaskNotes/Views/tasks-default.base` were excused by a complaint about a plugin's view type and a `%` in an unrelated formula, while the identical emptiness in `Tasks Base.base` needed a hand-written exemption. One cause, two views, opposite treatment ([[ISS-0042-Each-Of-The-Three-New-Scripts-Passes-While-What-It-Measures-Is-Wrong]]).

Of the 21 views that select nothing: **16 are explained by a refusal in their own filter**, and **5 are verified empty by hand** and named in the script with the reason. All five filter on a date at or after today, and the latest `due:` or `scheduled:` anywhere in the vault is 2026-03-17. The exemptions are written by file and view rather than the rule being softened, and they come out the moment a task is scheduled for a future date.

**What still needs a person:**

- **Steps 1 and 2, the seven project-os views.** "Looks exactly as it did" is a judgement about a screen and `TST-0006` pins only the view list.
- **Step 8, the comparison with Obsidian, and it is the important one.** **This script cannot see a view selecting the WRONG notes.** It checks that a view which selects nothing said why; it has no opinion about a view that selects a list. Make every filter match — `if (filter(context) || true)` in `query.ts` — and all 46 views draw all 407 notes while the script still reports no failure. That mutation is caught by the suite, which goes red in six places, and the suite is where a wrong list is caught in general.

  What no automated check here catches is a list that is wrong in a way Deck's evaluator and Obsidian's disagree about, since Deck's answer is the only one this machine can compute. That is the failure [[RISK-0003-Two-Evaluators-Of-The-Bases-Language]] names and the reason step 8 exists. The script narrows where to look: **14 views draw a list and report nothing**, and those are exactly the ones where a difference from Obsidian would be silent.

## Adequacy (who verifies this test?)

A person, because "looks exactly as it did" and "the message tells me what is wrong" are both judgements. The automated halves are [[TST-0030-A-Description-Parses-Or-Says-Why-Not]] and [[TST-0031-The-Evaluator-Runs-The-Seeded-Language]], plus [[TST-0006-Views-Come-From-The-Provider-And-Match-The-Cockpit]], which pins the seven views against a fixture read off the cockpit's navigator.
