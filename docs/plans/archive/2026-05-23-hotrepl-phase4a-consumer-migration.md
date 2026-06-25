---
title: "HotRepl Phase 4a Consumer Migration Implementation Plan"
type: plan
status: implemented
created: 2026-05-23
parent: 2026-05-23-hotrepl-phase4a-consumer-migration-design
superseded_by:
archived: 2026-06-25
---

# HotRepl Phase 4a Consumer Migration Implementation Plan

> **Status:** Completed on 2026-05-23. Spec, mechanical API migration, HotReplCommands build, test suite, and live HotRepl smoke (`info`, `world.summary`, `compendium.preflight`, `game.quit`) against the running game are all green (commits `43aa852`, `54a220d`). Treat the task boxes below as historical execution notes, not pending work.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compile and live-check Ancient Kingdoms `HotReplCommands` against the Phase 4a HotRepl authoring API.

**Architecture:** This is a mechanical API cutover. Command metadata, DTOs, artifacts, job behavior, and wire protocol behavior stay unchanged; only C# authoring API names and failure helper calls change.

**Tech Stack:** C# MelonLoader/IL2CPP mod, HotRepl.Core v2 control protocol, build-tool deployment, live HotRepl WebSocket checks.

---

## Task 1: Record migration spec

**Files:**

- Create: `docs/superpowers/specs/2026-05-23-hotrepl-phase4a-consumer-migration.md`

- [ ] **Step 1: Write the spec**

Capture the stable command catalog, the Phase 4a API deltas, the decision not to change artifact ownership, and the required build/live checks.

- [ ] **Step 2: Commit the spec**

Run:

```bash
git add docs/superpowers/specs/2026-05-23-hotrepl-phase4a-consumer-migration.md docs/superpowers/plans/2026-05-23-hotrepl-phase4a-consumer-migration.md
git commit -F .git/COMMIT_EDITMSG_omp
```

Expected: spec and plan only are committed.

## Task 2: Apply mechanical command API migration

**Files:**

- Modify: `mods/HotReplCommands/Commands/*.cs`
- Modify: `mods/HotReplCommands/HotReplCommandCatalog.cs`
- Modify: `tests/HotReplCommands.Tests/*.cs`

- [ ] **Step 1: Rename command kind enum values**

Replace every `ControlCommandKind.Synchronous` with `ControlCommandKind.Sync` in production and tests.

- [ ] **Step 2: Type command contexts**

For each command and test stub `ExecuteAsync` method, change `ControlCommandContext context` to `ControlCommandContext<TOutput> context`, using the handler's declared output type.

- [ ] **Step 3: Delegate export preconditions through context helpers**

In `ExportJobCommand`, replace each `ControlCommandResult.PreconditionFailed<CompendiumExportResult>(...)` with `context.PreconditionFailed(...)`.

- [ ] **Step 4: Build**

Run:

```bash
HOTREPL_REPO_PATH=/Users/joaichberger/Projects/HotRepl dotnet build mods/HotReplCommands/HotReplCommands.csproj -c Release --no-incremental --nologo -v q
```

Expected: build succeeds with 0 errors.

- [ ] **Step 5: Commit the migration**

Run:

```bash
git add mods/HotReplCommands/Commands/*.cs mods/HotReplCommands/HotReplCommandCatalog.cs tests/HotReplCommands.Tests/*.cs
git commit -F .git/COMMIT_EDITMSG_omp
```

Expected: only `HotReplCommands` migration files are committed.

## Task 3: Run live HotRepl checks

**Files:** none unless a live check exposes a real migration defect.

- [ ] **Step 1: Deploy and launch if needed**

Use `dotnet run --project build-tool deploy-host --hotrepl-repo /Users/joaichberger/Projects/HotRepl` and the existing launch workflow when the running game does not already expose the updated commands.

- [ ] **Step 2: Verify control-plane readiness**

Connect to the configured HotRepl endpoint and verify protocol v2, command catalog registration, `world.summary`, and `compendium.preflight`.

Expected: command calls return typed command results or domain diagnostics, not `unknown_command`, protocol errors, or missing-method failures.
