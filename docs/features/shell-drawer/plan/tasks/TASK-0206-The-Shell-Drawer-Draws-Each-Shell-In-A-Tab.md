---
type: "[[task]]"
id: TASK-0206
aliases: ["TASK-0206"]
title: "The shell drawer draws each shell with xterm.js in its own tab, labelled by workspace, and a session's Open its shell opens one in the session's folder"
status: done
phase: "[[PHASE-0004-Parity]]"
owner: system:claude
created: 2026-10-22
updated: 2026-10-22
source: ["Edwin 2026-10-22: 'Can you build the DES-0006 functionality?'"]
parent: "[[FEAT-0035-Plain-Shells-Open-In-A-Drawer-Several-At-Once]]"
effort: M
due: ""
depends: ["[[TASK-0205]]"]
blocks: []
related: ["[[RISK-0010-Three-Js-Is-A-New-Runtime-Dependency-Of-The-Renderer]]", "[[DES-0006-Agent-Sessions-Stand-Beside-The-Work]]"]
tests: ["[[TST-0107]]"]
---

# The shell drawer

**Shells in the header opens a drawer at the bottom; each shell is a tab, several are open at once, and each tab names its workspace.**

## Definition of Done

- [x] xterm.js (`@xterm/xterm`, pinned exactly) and its fit addon are copied into `dist/renderer/vendor/` by `desktop/scripts/copy-assets.mjs`, the way three.js is (RISK-0010's pattern), with their stylesheet.
- [x] The page's content policy is left as it is (`style-src 'self'`, no inline styles). xterm.js does write `<style>` elements, and one of them comes from its core whatever the renderer, so each shell is drawn in a frame of its own with a narrower policy (see below).
- [x] The drawer opens and closes from the header, keeps its height, and holds tabs: New shell (in the current workspace's folder), switch, close.
- [x] Open its shell in a session's pane opens a tab in that session's folder, its worktree when it has one.
- [x] The drawer and its button are absent on the served page.
- [x] The suite checks the drawer's tab state; the window run for FEAT-0035 is held until Edwin says, and run in the container first.
- [x] [[TST-0108]]'s steps 5 to 8 are checked against the build, and the note goes from `draft` to `active` (moved here from [[TASK-0201]]: they need Needs you, ◫ Overview and this drawer).

## What was built (2026-10-22)

- `@xterm/xterm` 6.0.0 and `@xterm/addon-fit` 0.11.0, both MIT and pinned exactly, are copied into `dist/web/vendor/` by `desktop/scripts/copy-assets.mjs`, with xterm's stylesheet.
- **The policy finding.** xterm.js writes three `<style>` elements. Two belong to its DOM renderer, which the WebGL add-on would avoid. The third, the scrollbar's colours, comes from its core whatever renderer is used, and it is made from the page's own document, which `documentOverride` cannot change. So no renderer works under Deck's page policy. Each shell is drawn instead in `terminal.html`, a frame with a policy of its own: inline styles allowed, code from this origin only, no connection anywhere. The frame holds only terminal text, which xterm.js draws as text, never as HTML. It talks only to the drawer, by messages from Deck's own origin. Because it is served from that origin, script in it could reach Deck's page and its bridge; what keeps it harmless is that it runs only Deck's own script files (corrected 2026-10-23, [[TASK-0211]]: this line first said the frame had no bridge). Deck's page policy is unchanged.
- `desktop/src/renderer/shell-drawer.ts`: ⌘ Shells in the header opens and closes the drawer, which keeps its height and whether it was open. It has tabs, New shell in the current workspace's folder, close, and switch. The drawer passes output into a frame and the frame's typing and size out to the main process. The tab state is the pure `tabsAfter` in `desktop/src/shared/shell-tabs.ts`. The overview ends above the open drawer.
- A session's pane has Open its shell, which opens a tab in the session's folder, named for the session. It is absent when there are no shells.
- On the served page the button stays hidden and no drawer is made: there is no `shells` bridge.
- **What the walk found, and was fixed:** the drawer was drawn under the overview; every shell failed in the container, because Deck assumed `/bin/zsh` (it now takes `$SHELL` when it exists, else the first of zsh, bash and sh); the open drawer covered the session pane's buttons; and the image's install ran the `postinstall` script before the script was copied in.
- **The window run:** `bash tools/scripts/walk-in-a-box.sh shell-drawer --copy`, 9 checks, all held. They cover the button, three shells at once, `pwd` typed with real keys and answered with the workspace's folder, closing one, the main process's list following, Open its shell from a session's pane, and hiding the drawer with the shells still running.
- [[TST-0107]] has 8 checks. [[TST-0108]]'s steps were checked against the build, and the note is now `active`.
