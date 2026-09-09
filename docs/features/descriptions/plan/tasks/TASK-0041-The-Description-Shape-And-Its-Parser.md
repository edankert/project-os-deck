---
type: "[[task]]"
id: TASK-0041
aliases: ["TASK-0041"]
title: "The description shape, its version and its extension namespace, and a parser that refuses what it cannot read by name"
status: backlog
phase: "[[PHASE-0001-Deck]]"
owner: user:edwin
created: 2026-09-08
updated: 2026-09-08
source: ["[[FEAT-0012-A-View-Is-A-Description]]"]
parent: "FEAT-0012"
effort: ""
due: ""
depends: []
blocks: ["TASK-0042", "TASK-0043", "TASK-0044", "TASK-0045", "TASK-0046"]
related: ["[[FEAT-0012-A-View-Is-A-Description]]", "[[ADR-0004-A-View-Is-A-Description]]", "[[FEAT-0007-Views-Come-From-A-Provider]]"]
tests: ["[[TST-0030-A-Description-Parses-Or-Says-Why-Not]]"]
---

# The description shape and its parser

## Objective

Write down what a Deck view is, as a record with five sections, and a parser that turns a document into that record or refuses it with the reason. This is the first task of the feature because every other task reads the shape it defines.

## Detail

**The five sections and their owners.** `source` decides which notes the view holds and is one of two kinds: `mode`, naming a sidecar navigation mode whose groups are the arrangement, or `query`, carrying filters, sort and grouping to run over Deck's index. `band` says which of front, mid and deep a note stands in. `face` says what a card shows, as property names rather than as code: a title, a subtitle, an image, and a list of fields. `surfaces` lists which of `list`, `spread` and `glass` may draw this view. `verbs` is the single word `registry`, and the parser refuses any other value, because a restated verb list is the thing the cockpit's [[project-os-cockpit#REQ-0026]] forbids.

**The version and the namespace are the whole reason this is Deck's language and not Obsidian's.** Edwin's answer on 2026-09-08: the Bases subset "is a subset which we know cannot represent everything ... we will need to be able to extend it probably significantly". So every description declares a version, and the parser knows which versions it can read. Any key outside the seeded language sits under Deck's own namespace prefix, which no base file uses, so a description written for a later Deck is recognisably a description rather than a syntax error. This is the shape a registered Bases view type already has, where a plugin's keys sit beside the core's in one entry.

**Refusal is a result, not a failure.** A parser that hits a construct it does not know returns the description it could build plus a list of what it could not read, each entry naming the construct and where in the document it was. The caller decides what to do; what it must never do is hand back an empty view. That rule is already stated for [[PHASE-0003-Vault]]'s base files and it starts here.

## Acceptance

- The record has exactly the five sections, and a document missing a required section is refused by name rather than defaulted.
- `source.kind` is `mode` or `query`, and any third value is refused by name.
- `verbs` accepts `registry` and refuses anything else, with the reason naming the cockpit's REQ-0026.
- Every description carries a version; a version the parser cannot read is refused by name, and the refusal says which versions it can read.
- A key outside the seeded language is accepted only under Deck's namespace prefix; an unknown bare key is refused by name.
- A document with several unreadable constructs reports all of them, not the first, each with its location.
- The parser is pure, runs without Electron, and is exercised over both a valid description and a table of malformed ones.

## Steps

- [ ] Write the record type in `desktop/src/shared/`, beside `views.ts`.
- [ ] Choose the namespace prefix and the version format, and record why in this note's Notes.
- [ ] Implement the parser, collecting refusals rather than throwing on the first.
- [ ] Build the malformed table: a missing section, a third source kind, a restated verb list, an unknown version, an unknown bare key, and several at once.
- [ ] Write [[TST-0030-A-Description-Parses-Or-Says-Why-Not]] and link it from `tests:`.

## Notes

**The strict-parser rule is not new here.** [[FEAT-0006-Every-State-Has-An-Address]] refuses an address it cannot read rather than falling back to a default, because the cockpit's silent fallback for an unknown navigation mode made the Tests view look broken for thirty-three hours. A description parser that defaults is the same bug in a new place.
