---
type: "[[issue]]"
id: ISS-0060
aliases: ["ISS-0060"]
title: "Deck can reopen in Spread with no address asking for it, because the chosen surface survives a restart and a change of workspace"
status: fixed
phase: "[[PHASE-0002-Glass]]"
owner: user:edwin
created: 2026-09-10
updated: 2026-09-10
source: ["The independent review of FEAT-0009, FEAT-0010 and FEAT-0014, 2026-09-10"]
severity: low
component: store
parent: ""
related: ["[[TASK-0033-Glass-Is-Addressed-And-Opened-First]]", "[[ADR-0002-Glass-Is-The-Main-View]]", "[[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]"]
tests: ["[[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]", "[[TST-0045-Glass-Is-Driven-With-A-Real-Pointer]]"]
---

# Deck can reopen in Spread with no address asking for it

## Problem

`surface` is written to the state file and survives a change of workspace, and the first window at launch has no address. So a person who used Spread yesterday opens Deck in Spread today, and one who opens another workspace stays in Spread. [[FEAT-0009-The-Field-Where-Depth-Carries-Priority]]'s first acceptance line says Glass unless the address asks for Spread, which is [[ADR-0002-Glass-Is-The-Main-View]].

## Fix

The surface is where a person is looking, like the yaw: opening a workspace starts in Glass, and a restart starts in Glass. An address that names a surface still opens there.

## Acceptance

- [x] A state file saying `spread` opens in Glass.
- [x] Opening a workspace starts it in Glass.
- [x] An address with `surface=spread` still opens on the desk.

## Fixed, 2026-09-10

The surface is no longer read back from the state file, and opening a workspace starts it in Glass; opening the same workspace again changes nothing. The renderer follows an address's surface after the workspace is open, so `surface=spread` still opens on the desk.

**Evidence.** [[TST-0043-The-Hands-State-Is-Shared-And-Never-Kept]]: a state file saying `spread` reads as Glass, and a workspace opens in Glass; reading the surface back is caught. The smoke run's `surface=spread` address still opens the desk.
