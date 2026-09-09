---
type: "[[task]]"
id: TASK-0038
aliases: ["TASK-0038"]
title: "Records from the workspace's Markdown: frontmatter parsed, a list-valued type counted under each value, and the sidecar's normalisation mirrored rather than guessed"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
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

- [ ] Read the sidecar's `index.py` and write down, in the task's Notes, the normalisation rules Deck is mirroring and where each one lives upstream.
- [ ] Write the record shape in `desktop/src/shared/`, beside the other pure modules.
- [ ] Implement the walk and the frontmatter parse as pure functions over a directory listing and file contents.
- [ ] Record the fixture: the sidecar's library groups for this repository and for Your Trainer, with the date and the sidecar commit.
- [ ] Add the suite: the record shape, the ignored directories, the type counts against the fixture, the list-valued type, and the unreadable file.
- [ ] Write [[TST-0029-The-Index-Reads-What-Is-On-Disk]] and link it from `tests:`.

## Notes

**The record holds frontmatter and not the body**, until something needs the body. 1537 notes with their bodies is a different memory decision from 1537 records, and no view described so far reads more than the frontmatter. Whoever needs it changes this line and says why.

**The fixture is what makes [[RISK-0004-Decks-Index-Duplicates-The-Sidecars-Indexer]] survivable.** Two indexers over one corpus will drift; the question is whether the drift is a failing test or a person noticing that two applications disagree about how many issues are open.
