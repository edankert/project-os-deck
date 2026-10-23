---
type: "[[task]]"
id: TASK-0213
aliases: ["TASK-0213"]
title: "The original Deck is tagged and pushed, the orbit comparison is kept on its own branch, and every parked note names the tag"
status: done
phase: "[[PHASE-0005-Overview]]"
owner: system:claude
created: 2026-10-23
updated: 2026-10-23
source: ["Edwin 2026-10-23: 'tag and remove; park Vault too'"]
parent: "[[FEAT-0036-Deck-Opens-Only-On-The-Overview-And-The-Original-Deck-Is-Kept-Under-A-Tag]]"
effort: S
due: ""
depends: []
blocks: ["[[TASK-0214]]"]
related: ["[[ADR-0010-Deck-Is-The-Overview-And-The-Original-Deck-Is-Parked-Under-A-Tag]]", "[[PHASE-0001-Deck]]", "[[PHASE-0002-Glass]]", "[[PHASE-0003-Vault]]"]
tests: ["[[TST-0109]]"]
---

# The original Deck is tagged, and the parked notes name the tag

**After this task the tag and the branch are on origin, and every unfinished note of the original Deck is `deferred` and says where its code went.** Nothing is removed from the code yet.

## Definition of Done
- [x] `git ls-remote --tags origin original-deck-2026-10-23` names commit `b1bc30b` (the annotated tag exists locally already).
- [x] `parked/original-deck`, which starts at the tag, holds TASK-0005's orbit comparison and is pushed. That work is the TASK-0005 note's edits, `docs/designs/DES-0001-orbit-comparison.html` and `docs/designs/__attachments__/TASK-0005-orbit-comparison/`.
- [x] TASK-0005 on main is parked as below.
- [x] The phase notes are edited as below, and `bash tools/scripts/validate-docs.sh` reports no new finding.

## Done in the preflight (2026-10-23)
- PHASE-0001, PHASE-0002 and PHASE-0003 are `deferred`, each with a "Parked" callout naming ADR-0010 and the tag.
- FEAT-0001, FEAT-0015, FEAT-0016, FEAT-0017, FEAT-0018, FEAT-0020, FEAT-0022, FEAT-0023 and FEAT-0024 are `deferred`, with `phase:` left on PHASE-0002.
- TASK-0082, TASK-0083, TASK-0099, TASK-0103, TASK-0104, TASK-0109 and TASK-0110 are `deferred`, with `origin:` set to the former parent, `parent:` cleared, and each listed under its feature's `deferred:`.
- ISS-0008, ISS-0069, ISS-0086 and ISS-0092 are `deferred`. ISS-0092 had no phase and now names PHASE-0002.
- REQ-0001 to REQ-0006 are `deferred`.

## Still to do

1. **TASK-0005**, once its working-tree edits are on `parked/original-deck` and the note on main is restored to `HEAD`. Its frontmatter on main becomes, with every other line unchanged:

   ```yaml
   status: deferred
   phase: "[[PHASE-0002-Glass]]"
   updated: 2026-10-23
   parent: ""
   origin: "[[FEAT-0001-The-Corpus-Has-An-Inside]]"
   ```

   `origin:` goes on the line after `parent:`. Add the same "Parked 2026-10-23" callout the other parked notes carry, under its `# ` heading. Then, in the same commit:
   - `docs/features/orbit-view/FEAT-0001-The-Corpus-Has-An-Inside.md`: add `deferred: ["[[TASK-0005]]"]` on the line after `tasks:`.
   - `SNAPSHOT.yaml`, `items.tasks.TASK-0005`: replace the line `parent: "FEAT-0001"` with `origin: "FEAT-0001"`.
   - `SNAPSHOT.yaml`, `items.features.FEAT-0001`: add `deferred: ["TASK-0005"]`.
   - Run `python3 tools/scripts/sync-snapshot.py`. It drops TASK-0005 from FEAT-0001's `tasks:`.
2. **PHASE-0004 Parity.** Remove `"[[PHASE-0002-Glass]]"` from `depends:`. Rewrite the Notes paragraph "Depends on PHASE-0002-Glass" to say the shell drawer replaced the console in the field (ADR-0010). The FEAT-0021 scope bullet says evidence opens "on Glass"; rewrite it once Edwin says where FEAT-0021 goes (question 2 in the preflight report). The fourth exit criterion's "slab over the field" has no field left; it is already open for Edwin as the shell question.
3. **PHASE-0005 Overview.** The Out of scope bullet "The card field of PHASE-0002 ... stay as they are" becomes: Glass's bands, desks and scenes left main by ADR-0010; their look (depth, glow, translucency) is what carries over. `depends: [PHASE-0001]` stays: that foundation is finished and stays on main.
4. **docs/PHASES.md.** The table rows for PHASE-0001, PHASE-0002 and PHASE-0003, and the paragraph on dependencies, say the three are parked under the tag by ADR-0010, and what of PHASE-0001 stays on main.
5. **Designs.** DES-0001, DES-0002 and DES-0003 stay `proposed`: a design has no `deferred` status, and none of them was replaced. Add the "Parked" callout to each, without touching `DES-0001-orbit-comparison.html`.

## Notes
The validator does not check status transitions, only allowed values. STATUSES.md lists `planned → deferred` for a phase, and PHASE-0001 and PHASE-0002 went from `active` to `deferred`; nothing refuses that. Deferred items keep `phase:` on their own deferred phase, which satisfies DEFER-HOME: that is where they would resume.

## Verification

- 2026-10-23: `git ls-remote --tags origin original-deck-2026-10-23` names the annotated tag object `c29c3f4`, which points at commit `b1bc30b`. `parked/original-deck` is on origin at `4dbf274`, one commit on the tag. Each of its ten files was compared byte for byte with the working tree (`git show parked/original-deck:<path> | cmp`) before the working tree was cleared.
- TASK-0005 is `deferred` with `origin:` FEAT-0001 and no parent, and FEAT-0001 lists it under `deferred:`. DES-0001, DES-0002 and DES-0003 carry the Parked callout and stay `proposed`.
- FEAT-0021 moved to PHASE-0002 and is `deferred`, because its evidence opens on Glass's documents. PHASE-0004 depends on nothing still open, and PHASE-0005 and `docs/PHASES.md` say what left main and what stays.
- `bash tools/scripts/validate-docs.sh` reports no error. Its ten CITES-SUPERSEDED warnings name test notes that TASK-0216 retires, plus DES-0003 and RISK-0007, which TASK-0217 rewrites.
