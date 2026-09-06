---
type: glossary
id: GLOSSARY
status: active
owner: team:docs
created: 2026-01-26
updated: 2026-09-06
tags: [glossary]
---

# Glossary

- **Deck**: this application. Notes as cards you arrange across windows and screens, over a project-os repository or an Obsidian vault. The repository is `project-os-deck`; inside the application the short name is Deck.
- **Spread**: Deck's 2D view. A desk of open notes, lists that drive selection, panels that dock, float or pop out into their own window. The word is a comic spread: two pages side by side.
- **Glass**: Deck's 3D view, the field from DES-0002. Depth is priority: what needs you is at the front, the finished work is behind you.
- **the desk**: the notes you have picked up, one desk per view, surviving a workspace switch. Nothing on the desk is written to the record.
- **the field**: every note of a workspace, arranged by the current view's rule.
- **panel**: one instance of a surface (a navigator in one mode, a reader on one note, a terminal on one PTY). Panels can exist more than once and each has an address.
- **the store**: the one state in Deck's main process that every window subscribes to.
- **the sidecar**: project-os-cockpit's Python server, one per workspace. Deck shares it and does not fork it.
- **the cockpit**: project-os-cockpit, the current application. Frozen except for fixes while Deck grows.
- **capability register**: the cockpit's list of what it can do, one stable key per capability. Deck's adoption table cites those keys.
- **workspace profile**: what the sidecar needs to know to serve a workspace that is not a project-os repository: types, parents, statuses, views, faces, verbs. Detected from the vault's own templates and bases before anyone selects it.
- **the record**: project-os's word for the notes on disk. A vault is a record too.
- **workflow**: a canonical front door activity documented under `workflows/`.
- **feature**: a work package (goal, scope, acceptance) tracked under `features/`.
- **issue**: a problem, gap or bug tracked under `issues/`.
- **change note**: a "what changed and why" record under `changes/`.
