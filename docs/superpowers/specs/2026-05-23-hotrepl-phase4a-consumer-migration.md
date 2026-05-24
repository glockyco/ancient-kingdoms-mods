# HotRepl Phase 4a Consumer Migration Specification

**Status:** Approved for implementation
**Date:** 2026-05-23
**Scope:** Migrate Ancient Kingdoms' `HotReplCommands` MelonLoader consumer to the Phase 4a HotRepl authoring API and verify it against the current local HotRepl core.

## Goal

`HotReplCommands` continues to compile and run against the current HotRepl core after the Phase 4a clean cutover. The wire protocol remains v2 and the command catalog remains stable: `compendium.preflight`, `world.summary`, `compendium.export`, and `game.quit` keep their names, versions, kinds, arguments, outputs, and artifact behavior.

## Required API shape

HotRepl Phase 4a changes the C# authoring API in three relevant ways:

- `ControlCommandKind.Synchronous` is now `ControlCommandKind.Sync`.
- `IControlCommandHandler<TArgs, TOutput>.ExecuteAsync` receives `ControlCommandContext<TOutput>` instead of the non-generic context.
- Static failure factories on `ControlCommandResult` are removed; typed handlers use `context.ValidationFailed(...)`, `context.PreconditionFailed(...)`, and `context.Failed(...)`.

The existing HotRepl v2 transport, command names, job polling, and artifact-reference protocol do not change.

## Migration design

The migration is a clean mechanical cutover. Each command handler keeps its current command metadata and body structure. Sync commands receive the correctly typed context. `ExportJobCommand` uses `context.PreconditionFailed(...)` for every runtime precondition failure path that previously called `ControlCommandResult.PreconditionFailed<T>()`.

Artifact collection remains unchanged. `ArtifactCollector` already creates file-backed `ArtifactRef` values and `ExportJobCommand` returns them through `ControlCommandResult.Ok(output, artifacts)`, which remains part of the Phase 4a result API. Moving artifact file ownership to `IArtifactWriter.AttachFileAsync` is not part of this migration.

## Verification contract

A valid migration must pass all of the following:

1. `HOTREPL_REPO_PATH=/Users/joaichberger/Projects/HotRepl dotnet build mods/HotReplCommands/HotReplCommands.csproj -c Release --no-incremental --nologo -v q`.
2. A live HotRepl control-plane check against the running Ancient Kingdoms game that confirms:
   - the server handshakes with `protocolVersion: 2`,
   - the command catalog contains `compendium.preflight`, `world.summary`, `compendium.export`, and `game.quit`,
   - `world.summary` succeeds,
   - `compendium.preflight` returns a typed command result or a domain precondition/validation result from the migrated API rather than a protocol failure.

## Commit strategy

Commit the spec separately from the code migration. Commit only the `HotReplCommands` migration files and leave unrelated existing working-tree edits and untracked work untouched.
