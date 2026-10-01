---
type: "[[issue]]"
id: ISS-0090
title: "After a smoke run in the box, this repository's cockpit address file names a port nothing on the Mac is listening on"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-10-01
updated: 2026-10-01
source: ["Found by the agent on 2026-10-01 while running Deck in the box for TASK-0104"]
reported_by: agent
question: ""
severity: medium
component: tooling
parent: ""
related: ["[[TASK-0081-A-Box-For-The-Smoke-Run-To-Open-Windows-In]]", "[[TASK-0104-Preserve-Note-Identity-Size-And-Neighbourhood-While-Moving]]"]
tests: []
verification_waiver: "A one-line change to how the box is mounted, in a script no suite runs. Verified once by hand, recorded under Evidence: the file kept the host's address across a run in the box."
waiver_expires: 2026-10-31
---

# A smoke run in the box points the host's cockpit at a port that does not exist

## Problem

**Run Deck's smoke checks in the box while the cockpit is open on this repository, and afterwards `.cockpit/url` names a port that exists only inside the box.** The `cockpit` command line and the hooks that report a session's state find the sidecar through that file. They then post to an address nothing answers on, until the cockpit is restarted and writes the file again. Nothing reports it: the box exits clean.

The cause is that the box mounts the whole repository, and the sidecar it starts writes its own address into the workspace's `.cockpit/url`, as every sidecar does. The workspace is the mounted repository, so the write lands on the host.

## Repro

1. Have the cockpit open on this repository. `cat .cockpit/url` gives the host sidecar's address; on 2026-10-01 that was `http://127.0.0.1:8771`.
2. `bash tools/scripts/smoke-in-a-box.sh loopback`, or anything else that starts Deck in the box.
3. `cat .cockpit/url` again.

## Expected

The file still names the sidecar the host's cockpit started. What a throwaway sidecar inside a container writes about itself stays inside the container.

## Actual

`http://127.0.0.1:8900`, the port Deck chose inside the box. `curl http://127.0.0.1:8900/healthz` on the Mac connects to nothing, while `curl http://127.0.0.1:8771/api/cockpit/identity` still answers with this repository's root.

## Evidence

- 2026-10-01 22:53: after two runs in the box, `.cockpit/url` read `http://127.0.0.1:8900` and was last written at 22:53, the minute the second run ended. `ps` showed the host's sidecar for this repository on `--port 8771`, and its identity route named this repository.
- The file was put back by hand to `http://127.0.0.1:8771`.
- After the fix, a run in the box left the file at `http://127.0.0.1:8771`.

## Sibling search

No sibling found (searched `docs/issues/` for "cockpit/url", "smoke-in-a-box", "in a box"). [[ISS-0023-Two-Sidecars-For-One-Repository-When-The-Paths-Differ-Only-In-Case]] is about two sidecars on the host, not about a container writing into the host's state.

## Risk scan

No trigger applies: no dependency, variable, path or exposure changes. The fix narrows what the box can write on the host.

## Fix

`tools/scripts/smoke-in-a-box.sh` masks `.cockpit/` with an anonymous volume, the way it already masks `desktop/node_modules`. The sidecar inside the box finds an empty directory, writes its address there, and the directory is discarded with the container.

## Next Actions

- [x] Mask `.cockpit/` in the box.
- [x] Put the host's address back in the file.
