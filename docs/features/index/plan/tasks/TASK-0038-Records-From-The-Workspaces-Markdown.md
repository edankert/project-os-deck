---
type: "[[task]]"
id: TASK-0038
aliases: ["TASK-0038"]
title: "Records from the workspace's Markdown: frontmatter parsed, a list-valued type counted under each value, and the sidecar's normalisation mirrored rather than guessed"
status: done
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-09
source: ["[[FEAT-0011-Decks-Own-Index]]"]
parent: "FEAT-0011"
effort: ""
due: ""
depends: []
blocks: ["TASK-0039", "TASK-0040", "TASK-0043"]
related: ["[[FEAT-0011-Decks-Own-Index]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]]", "[[project-os-cockpit#ISS-0279]]"]
tests: ["[[TST-0029-The-Index-Reads-What-Is-On-Disk]]"]
---

# Records from the workspace's Markdown

## Objective

Deck's main process walks the open workspace, parses every Markdown file's frontmatter, and produces one record per note. The record is what a view described as a query is evaluated over, so its field names and its type spelling have to mean the same thing the sidecar means by them.

## Detail

**The record holds the frontmatter as written, plus where it came from.** Every key the file declares is on the record under its own name, with its value in the shape the YAML gave it: a scalar, a list, a wikilink, a list of wikilinks, a date. Beside that, the path relative to the workspace root, the file's modification time, and the id Deck addresses the note by. Nothing is dropped because Deck does not recognise it, because a vault's `world`, `chapter` and `portrait` fields are exactly what a base file filters on and Deck knows none of them in advance.

**The type is where the sidecar's rules have to be mirrored rather than guessed.** A project-os note writes `type: "[[feature]]"`; a vault note writes `type: Chapter`, `type: "[[Task]]"`, or a list of several. The sidecar has one answer for what that means, in `index.py`, and Deck must produce the same answer for the same file. The check is not that Deck's parser looks right: it is that Deck's count of notes per type equals the sidecar's library groups for the same workspace, asserted against a fixture recorded from the sidecar.

**A list-valued `type:` is the case that must be got right rather than copied.** The cockpit's indexer drops those notes, which is [[project-os-cockpit#ISS-0279]], and that issue is already waiting for [[PHASE-0003-Vault]] because it hides the vault's types. Deck counts such a note under each of its values. Where that makes Deck's count differ from the sidecar's, the fixture records the difference as expected and names the cockpit issue, rather than the suite failing on a bug that is not Deck's.

**One unreadable file is not an empty workspace.** A file whose frontmatter will not parse is reported by path with the parser's reason, and the walk continues. The reports reach the renderer so a person can see which note is broken; they do not go only to a console nobody has open.

## Acceptance

- Given a workspace path, the walk returns one record per Markdown file, with every frontmatter key present under its own name and its value in its own shape.
- The directories the sidecar ignores are ignored here, named in one place rather than repeated per caller.
- Deck's count of notes per type equals the sidecar's library groups for this repository and for Your Trainer, asserted against a fixture recorded from the sidecar; a deliberate difference is a named row in the fixture, not a loosened assertion.
- A note whose `type:` is a list is counted under each value, and a test names [[project-os-cockpit#ISS-0279]] as the reason Deck differs from the sidecar there.
- A file with unparseable frontmatter yields a report carrying its path and the reason, and every other file still yields a record.
- The parsing is pure and runs without Electron, over fixture directories checked into the repository.

## Steps

- [x] Read the sidecar's `index.py` and write down the normalisation rules Deck is mirroring and where each one lives upstream — Notes below, 2026-09-09
- [x] Write the record shape in `desktop/src/shared/records.ts` — 2026-09-09
- [x] Implement the walk and the frontmatter parse as pure functions over a directory listing and file contents — `shared/yaml.ts` and `main/note-index.ts`, with the file system injected
- [x] Record the fixture from the sidecar's own index, with the date and the sidecar commit — `desktop/fixtures/sidecar-types.json`, recorded 2026-09-09 at cockpit `11ded07` by `tools/scripts/record-sidecar-fixture.py`
- [x] Add the suite: the record shape, the ignored directories, the type counts against the fixture, the list-valued type, and the unreadable file — 27 checks
- [x] Write [[TST-0029-The-Index-Reads-What-Is-On-Disk]] and link it from `tests:` — written at planning time; its evidence is filled in

## Notes

**The record holds frontmatter and not the body**, until something needs the body. 1537 notes with their bodies is a different memory decision from 1537 records, and no view described so far reads more than the frontmatter. Whoever needs it changes this line and says why.

**The fixture is what makes [[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]] survivable.** Two indexers over one corpus will drift; the question is whether the drift is a failing test or a person noticing that two applications disagree about how many issues are open.


## Done, 2026-09-09

**Deck reads the notes itself.** `walkNotes` returns one record per Markdown file under a workspace's docs root, and a record holds every frontmatter key under its own name, in the shape the YAML gave it, plus the path, the modification time and the id Deck addresses the note by. Nothing is dropped for being unrecognised, because a vault's `world`, `chapter` and `portrait` are exactly what a base file filters on.

### The rules mirrored from the sidecar, and where each one lives upstream

All four are in `project-os-cockpit/src/project_os_cockpit/index.py`, and `desktop/src/shared/records.ts` names each one at the line that mirrors it.

- **Which directories are not walked.** `EXCLUDED_DIR_NAMES` is `__bases__`, `.obsidian`, `.trash` and `.git`, and `_is_excluded_path` adds every directory whose name starts with a dot. The rule applies to PARENT directories only, so a file called `.trash.md` is a note. `__templates__` is deliberately not excluded — it holds the type-stub notes a wikilink like `[[feature]]` resolves to.
- **What a `type:` means.** `_normalise_type` trims, strips a `[[...]]` wrapper, and lower-cases. Nothing else: it does not strip the `|alias` half of a wikilink, and neither does Deck, because Deck's answer for a file has to be the sidecar's answer for that file.
- **What a `status:` means.** `_normalise_status` trims and lower-cases a string, and returns nothing for anything else.
- **What a note is called when it declares no title.** `_extract_h1` takes the body's first `# ` heading.
- **Which notes the counts leave out.** `_is_template`, a path under `__templates__/`, excluded by `type_counts` unless asked for.

### The one deliberate difference, and the eleven accidental ones

**A LIST-valued `type:` is counted under each of its values.** The sidecar's `_normalise_type` returns nothing for a value that is not a string, so a note written `type:\n  - "[[Project]]"` is counted under no type at all and disappears from the cockpit's Library. That is [[project-os-cockpit#ISS-0279]], already waiting for [[PHASE-0003-Vault]] because it hides the vault's own types, and Deck must not reproduce it. Your Trainer has one such note and the fixture names it.

**Ten more files differ because Deck's reader is more forgiving than PyYAML**, and each is a named row in the fixture rather than a loosened assertion. Two are a flow sequence spanning several lines whose closing bracket sits back at the key's own column; eight are a `requirements` note whose `acceptance:` list is written twice, once indented and once at column zero. PyYAML refuses the whole document in each case, so the sidecar indexes the note with EMPTY frontmatter and it vanishes from the cockpit's own view. Deck reads what it can and REPORTS the lines it had no place for, by path and line number.

**One of those files was in this repository, and fixing it was the right answer.** `ISS-0010`'s `source:` carried `don\'t` inside a double-quoted scalar. `\'` is not a YAML escape, so the cockpit dropped that note's frontmatter and the issue was missing from the cockpit's Issues view — 22 issues counted where there are 23. The note now says `do not`, and Deck and the sidecar agree about all 199 notes here.

### The YAML

Deck has no bundler and no runtime dependencies, so `shared/yaml.ts` reads the subset these files are written in: block mappings and sequences, flow collections including ones that span lines, both quoted forms, block scalars, folded plain scalars, trailing comments, and keys containing dots. What it does not read — anchors, aliases, tags, explicit keys, a second document — is REPORTED BY NAME with its line, and so is any line the reader had no place for. Measured against every file it will meet: 200 notes here, 407 in `~/Notes`, 2715 in Your Trainer and all 13 `.base` files, with zero unreported problems.

## Evidence

- `bash tools/scripts/run-desktop-tests.sh index`: 27 checks, 2026-09-09.
- Deck and the sidecar agree about every one of this repository's 199 notes, compared path by path against the sidecar's own output.
- Deck and the sidecar agree about Your Trainer's 2715 notes to within the eleven differences the fixture names, compared as per-type counts.
