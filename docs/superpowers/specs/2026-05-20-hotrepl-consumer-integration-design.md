# HotRepl Consumer Integration Specification

**Status:** Draft for review
**Date:** 2026-05-20
**Scope:** Rebuild the Ancient Kingdoms `build-tool` and surrounding agent documentation around the new HotRepl Agent DX (passive discovery, profiles, `status`/`wait`/`doctor`, JSON envelopes, leased `control run`). Replace the stale, hand-rolled HotRepl wrapper layer with a clean, composable architecture and a single new agent skill.

## Executive recommendation

Treat HotRepl as a neighbouring CLI, not a library to wrap. The `build-tool` ends where the REPL begins. Composition between `build-tool` (game operations) and `hotrepl` (runtime control) lives in documentation — specifically in one new project-scoped skill — not in another layer of CLI wrapping.

Rebuild the `build-tool` internals around modern .NET conventions: Spectre.Console.Cli for command surface and DI, CliWrap for subprocess invocation, typed configuration, and a single seam for tests. Delete the legacy `hotrepl-smoke`, composite `hotrepl`, and `WaitForPort` shapes outright — no aliases, no shims, single clean cutover.

The deliverable is a `build-tool` that does game operations well, a documented composition pattern for agents and humans to combine it with `hotrepl`, and an agent doc surface that points at the new shape instead of the old.

## Background

### What HotRepl now provides

HotRepl (`/Users/joaichberger/Projects/HotRepl`, currently on `main` at `0217928`) ships a stable agent-facing CLI with:

- Passive instance discovery via per-instance JSON documents in user-local state directories.
- Named profiles in `~/.config/hotrepl/profiles.json` (or platform equivalent) resolving endpoint and auth handles, with tokens fetched locally from env, token files, or BepInEx config keys.
- `hotrepl discover` — read-only, no WebSocket opened.
- `hotrepl status` / `hotrepl wait` / `hotrepl doctor` — active diagnostics that authenticate when required and run staged checks with `pass` / `fail` / `blocked` / `unobserved` statuses. They open a WebSocket and disclose that they may replace the active client.
- `hotrepl control run NAME ARGS_JSON --lease --wait --jsonl` — leased, same-connection job supervision emitting one terminal JSONL event and stable exit codes (3 unreachable, 4 auth, 5 lease, 6 readiness, 7 command, 8 cancelled, 9 interrupted, 10 abandoned).
- A symmetric JSON envelope (`schemaVersion`, `ok`, `command`, `data` or `error`, `meta`) for short commands and JSONL streams for long-running commands.

### What Ancient Kingdoms currently has

`build-tool` (`/Users/joaichberger/Projects/ancient-kingdoms-mods/build-tool/`) is a single-project .NET 10 console application with hand-rolled dispatch and the following HotRepl-relevant commands:

- `hotrepl-deploy` — builds the HotRepl host project from a sibling `../HotRepl` checkout and copies the deployable file set into the game `Mods/` directory.
- `hotrepl-launch [--wait]` — launches Ancient Kingdoms (CrossOver/WINE on macOS, native on Windows) and optionally TCP-polls `127.0.0.1:18590` until it accepts connections.
- `hotrepl-smoke [--world]` — shells out to the sibling repo's Python client with `uv run hotrepl --url ws://localhost:18590 info|ping|eval ...`, with hard-coded URL and string-concatenated arguments.
- `hotrepl` — composite of deploy + launch (with `--wait`) + smoke.

### Why this needs to change

The current layer is obsolete in three orthogonal ways.

**Wrong readiness model.** TCP port acceptance is documented anti-pattern (Kubernetes probe guidance, AWS NLB guidance): the socket accepts before the application is initialised, auth is configured, or control commands are registered. HotRepl's `wait` already performs the correct application-level readiness check, so reimplementing a worse one here is redundant.

**Stale integration shape.** `hotrepl-smoke` runs `info`, `ping`, and `eval` against a hard-coded URL, ignores profiles and passive discovery, and parses no structured output. It pre-dates the Agent DX and bypasses every capability the new HotRepl CLI exposes.

**Hand-rolled subprocess plumbing.** `HotReplSmokeRunner.Quote` is a manual shell-style argument escaper. `Process.Start` is used directly without `CancellationToken`, without `ArgumentList`, and without forwarding Ctrl-C. CliWrap and `ProcessStartInfo.ArgumentList` are the 2025/2026 .NET defaults.

The right move is not to patch this layer. It is to delete it and rebuild around the correct boundary.

## Architecture

### Boundary

Three actors, one responsibility each.

| Actor | Owns | Does not own |
|---|---|---|
| `build-tool` | Build mods, copy mods to `Mods/`, build and deploy HotRepl host, launch game (Windows native or CrossOver/WINE), run game with `--export-data` and stream MelonLoader log, Steam update via `steamcmd`, interactive `Local.props` setup | REPL state, auth, readiness, control execution |
| `hotrepl` | Discovery, profiles, auth, readiness, structured introspection, leased control execution, JSON/JSONL envelopes | Game process, game install paths, WINE environment, MelonLoader file copy |
| Agent / human (via the new skill) | Composition: deploy, launch, wait, run, inspect | Either tool's internals |

This is the Git plumbing-versus-porcelain split. `build-tool` is the project's game-operations porcelain. `hotrepl` is the runtime-control porcelain. The skill is the composition recipe.

`build-tool` does not invoke `hotrepl` as a subprocess in v1. The only exception we accept is `build-tool setup` offering to upsert an `ancient-kingdoms` entry into the user's HotRepl profile file; that is config writing, not runtime composition.

### Build-tool internal architecture

One .NET project (`build-tool/`), one .NET test project (`tests/BuildTool.Tests/`). Feature folders, not layered Clean Architecture (overkill at this size).

```
build-tool/
  Program.cs                       # composition root; wires Spectre + DI
  Commands/                        # one Spectre command per verb
    SetupCommand.cs
    BuildCommand.cs
    DeployCommand.cs
    DeployHostCommand.cs
    LaunchCommand.cs
    ExportCommand.cs
    UpdateCommand.cs
  Configuration/
    LocalConfig.cs                 # typed Local.props loader
    LocalConfigWriter.cs           # atomic write + idempotent merge
  Game/
    GameLauncher.cs                # platform-neutral launch entrypoint
    WineEnvironment.cs             # macOS / CrossOver detail
    WindowsEnvironment.cs          # Windows native detail
    LogStream.cs                   # MelonLoader log follow (human visibility)
    ExportResultReader.cs          # parse DataExporter result file
  HotRepl/
    HotReplPaths.cs                # repo + host project + host output paths
    HotReplDeployer.cs             # build host, copy file set, prune stale
    ProfileWriter.cs               # idempotent profile upsert for setup
  Abstractions/
    IProcessRunner.cs              # CliWrap-backed seam; one interface
  Output/
    OutputEnvelope.cs              # `--json` shape matching HotRepl
    ExitCodes.cs                   # stable category-to-code mapping
```

Rules:

- One interface per genuine test seam. We do not introduce interfaces "for layering". `IProcessRunner` exists because subprocesses are non-deterministic in tests. Everything else is a concrete type with constructor injection.
- All subprocess invocation goes through `IProcessRunner`, which is a CliWrap-backed implementation that takes a structured `ProcessRequest` (program, arg list, cwd, env, cancellation token) and returns a `ProcessResult` (exit code, captured stdout/stderr, duration). The production implementation uses CliWrap's `ExecuteBufferedAsync` for short commands. The MelonLoader log follow (used by `launch --wait` and `export`) reads `MelonLoader/Latest.log` directly via a `FileStream`-based tailer in `Game/LogStream.cs`, because the log is written by the game process itself rather than to a redirectable stdout.
- `Local.props` is parsed once into a typed `LocalConfig` POCO at composition root. No more `Environment.SetEnvironmentVariable` side effects scattered through command code; MSBuild keeps reading the XML file the same way it always did.
- The Spectre.Console.Cli `CommandApp` is wired into `Microsoft.Extensions.DependencyInjection`. Each command is a `Command<TSettings>` with typed settings.
- Human output uses `IAnsiConsole` from Spectre. Machine output uses `OutputEnvelope` and is selected per command by a global `--json` flag inherited via shared settings.

### Subprocess invocation

CliWrap is the only subprocess library. Direct `System.Diagnostics.Process` use is prohibited in new code. Rationale:

- `ArgumentList` is built into CliWrap's API; there is no path to accidentally do shell-style concatenation.
- `WithCancellationToken` propagates Ctrl-C cleanly and CliWrap forwards SIGINT to the child instead of killing it abruptly.
- `ListenAsync` exposes a back-pressured `IAsyncEnumerable<CommandEvent>` for streaming JSONL output from any subprocess we invoke without buffering megabytes in memory.
- Typed exit-code handling: CliWrap surfaces `CommandResult.ExitCode` directly; no parsing required.

### Output and exit codes

Every command supports `--json`. Successful runs emit a symmetric envelope mirroring HotRepl's shape:

```json
{
  "schemaVersion": 1,
  "ok": true,
  "command": "build-tool.launch",
  "data": { "pid": 12345, "logPath": "/.../Latest.log" },
  "meta": { "durationMs": 142 }
}
```

Failures emit the same outer shape with `"ok": false` and an `error` object (`kind`, `code`, `message`, `retryable`, optional `remediation`, optional `details`). Stdout carries machine-readable success; stderr carries machine-readable failure; both share schema. The exit-code mapping is documented in `Output/ExitCodes.cs` and reused across commands:

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Unexpected/internal failure |
| 2 | Invalid CLI usage or invalid input |
| 3 | External tool unreachable (steamcmd, game executable missing) |
| 4 | Authentication or permission failure |
| 5 | Resource conflict (file lock, lease held) |
| 6 | Timeout or readiness failure |
| 7 | Build/deploy/run failed |
| 8 | Cancelled by user |

Categories deliberately mirror HotRepl's exit-code categories so an agent sees consistent semantics across both CLIs.

### Game launch

`GameLauncher` is the only place that talks to the OS about starting Ancient Kingdoms. It takes a typed `LaunchOptions` (export arguments if any, working directory, environment overrides) and returns a typed `LaunchedGame` carrying the PID and the log path. Platform branching happens in `WineEnvironment` and `WindowsEnvironment`; everything above is platform-neutral.

`build-tool launch --wait` blocks until the MelonLoader log shows the bootstrapping banner (deterministic, log-based). It does not check REPL readiness. REPL readiness is `hotrepl wait`'s job.

## Command surface

### Removed

- `hotrepl-smoke` — superseded by `hotrepl doctor` and project-specific `hotrepl control run` invocations documented in the new skill.
- `hotrepl` (composite) — superseded by the documented composition. Agents that need a one-shot end-to-end run combine `build-tool deploy-host`, `build-tool launch --wait`, and `hotrepl ... wait` themselves.
- `WaitForPort` (internal helper) — TCP port polling is deleted. `build-tool launch --wait` uses the MelonLoader log banner; REPL readiness is `hotrepl wait`'s responsibility.
- `HotReplSmokeRunner` and `HotReplLauncher.WaitForPort` C# source files — deleted, not retained as references.

No aliases or compatibility shims. The cutover is in one commit so the codebase has exactly one shape at any time.

### Renamed

- `hotrepl-deploy` → `deploy-host`. Reflects what the command actually does: it builds and deploys the HotRepl host into the game `Mods/` directory. `build-tool deploy` continues to mean Ancient Kingdoms mods (`mods/*`).
- `hotrepl-launch` → `launch`. Launching is a game operation, not a HotRepl operation.

### Kept (rebuilt internally)

- `setup` — interactive `Local.props` writer. Additionally offers to upsert an `ancient-kingdoms` entry into the HotRepl profile file (see Profiles below). The profile step is opt-in; declining must not block setup.
- `build` — build all mods. Spectre command wrapping `dotnet build` per `mods/*.csproj`. CliWrap-based.
- `deploy` — copy built mods to `Mods/`. Pure file operation; no game interaction.
- `update` — `steamcmd app_update` wrapper. Game-owned.
- `export` — launch game with `--export-data`, stream MelonLoader log for human visibility, watch for DataExporter's structured result file as the canonical completion signal. Behaviour, exit semantics, and the result-file shape are specified in **Export completion signal** below.

### Final command surface

```
build-tool setup                       # interactive Local.props (+ optional profile)
build-tool build                       # build mods
build-tool deploy                      # copy mods to Mods/
build-tool deploy-host                 # build & copy HotRepl host
build-tool launch [--wait] [--export]  # launch game; --export adds --export-data
build-tool export [--screenshots] [--update]   # launch + stream + capture
build-tool update                      # steamcmd app_update
```

Every command supports `--json`. Global flags (defined on a shared `BaseSettings`): `--json`, `--quiet`, `--verbose`, `--no-color`.

## HotRepl interaction contract

`build-tool` does not call `hotrepl` from C# at runtime in v1. The composition contract is:

1. `build-tool deploy-host` makes the HotRepl host available in the game's `Mods/`.
2. `build-tool launch --wait` starts the game and blocks until MelonLoader is up.
3. The caller (agent, human, or a wrapper script outside this repo) then invokes `hotrepl` directly with a profile to perform readiness checks and control execution.

Example composition (this is what the new skill documents):

```sh
build-tool deploy-host
build-tool launch --wait &
hotrepl --profile ancient-kingdoms wait \
  --commands compendium.preflight \
  --timeout 60 --json

hotrepl --profile ancient-kingdoms control run \
  compendium.preflight '{}' \
  --lease --wait --jsonl
```

If a future requirement forces `build-tool` to invoke `hotrepl` (for instance, an `export` mode that needs a leased preflight before `--export-data`), the implementation goes through `IProcessRunner` and the typed JSON envelope schema; we do not regress to argument concatenation.

### Profiles and auth

Auth handling stays in HotRepl, where it belongs. The user-level profile file (`~/.config/hotrepl/profiles.json` on Linux; platform equivalents on macOS and Windows, per HotRepl's discovery doc) is the canonical location. Tokens never enter this repository or `Local.props`.

`build-tool setup` offers to upsert an `ancient-kingdoms` profile entry. The offer is interactive, default-no, and idempotent: it reads the existing profile file, merges the entry, and writes atomically. The entry uses a token-source the user controls (env, token-file, or BepInEx config). The implementation lives in `HotRepl/ProfileWriter.cs` and is unit-tested against a temp profile path.

Declining the offer leaves the user free to author or skip the profile manually; nothing else in `build-tool` requires the profile to function.

## Export completion signal

`build-tool export` currently watches MelonLoader's log file for the literal string `All exports complete. Quitting.`. That signal is fragile: a crash before the marker forces a five-minute timeout, an exporter failure that still reaches end-of-run yields a false success, and any wording change in DataExporter silently breaks build-tool. We replace it with a structured result file. The MelonLoader log keeps streaming to the human watching the terminal but is no longer load-bearing for success detection.

### Producer: DataExporter mod

DataExporter writes a single JSON file to `$(DATA_EXPORT_PATH)/.exporter-result.json` immediately before the game shuts down, regardless of whether the run succeeded. The file is written atomically (temp file plus `File.Move(overwrite: true)`) so `build-tool` never reads a half-written document. On a crash before the writer runs, the file is absent and `build-tool`'s timeout path covers the case.

Shape:

```json
{
  "schemaVersion": 1,
  "ok": true,
  "startedAt": "2026-05-20T18:00:00Z",
  "completedAt": "2026-05-20T18:01:42Z",
  "durationMs": 102341,
  "exporters": [
    { "name": "items",    "ok": true,  "count": 4702, "outputPath": "exported-data/items.json" },
    { "name": "monsters", "ok": true,  "count": 359,  "outputPath": "exported-data/monsters.json" },
    { "name": "houses",   "ok": false, "error": { "kind": "exporter_failed", "message": "...", "details": {} } }
  ],
  "errors": []
}
```

Top-level `ok` is `true` only when every required exporter ran successfully. Optional exporters can fail without zeroing the overall `ok`; the failure is still present in `exporters[]`. The classification of each exporter as required versus optional lives in DataExporter; `build-tool` reads `ok` and reports detail without re-deciding policy.

### Consumer: build-tool

`Game/ExportResultReader.cs` watches `$(DATA_EXPORT_PATH)/.exporter-result.json` via `FileSystemWatcher` with a polling fallback. On detection it reads, validates the schema version, parses the payload, and returns a typed `ExportOutcome` to `ExportCommand`.

`build-tool export` exit semantics:

| Outcome | Exit | Envelope |
|---|---|---|
| Result file found, `ok: true` | 0 | success envelope with exporter counts and output paths |
| Result file found, `ok: false` | 7 | error envelope listing failing exporters and their structured errors |
| Result file never appears before timeout | 6 | error envelope pointing at `MelonLoader/Latest.log` |
| Game process exits before the result file appears | 7 | error envelope: "exporter did not write result file" |
| Schema version unknown | 7 | error envelope naming the version mismatch |

### Schema versioning

`schemaVersion: 1` is the contract. Additive changes (new exporter, new optional field) do not bump the version. Breaking changes (renaming `ok`, restructuring `exporters[]`) bump the version, and `ExportResultReader` rejects unknown versions with an explicit error rather than guessing. Version bumps are a deliberate, two-side change tracked in this spec or a follow-up; they are never silent.

## Documentation and skill updates

This work is incomplete without the doc surface update. The same change-set updates:

### Existing files

- `CLAUDE.md`
  - Replace the stale HotRepl quick reference (`hotrepl-deploy`, `hotrepl-launch --wait --timeout-seconds 30`, `hotrepl-smoke`) with the new command names.
  - Add a task trigger row: "Inspecting live game state via HotRepl → Load skill: `hotrepl-runtime-inspection`".
  - Keep CLAUDE.md under its 150-line target.
- `mods/CLAUDE.md`
  - Replace the `dotnet run --project build-tool hotrepl` and `hotrepl-smoke --world` lines with the new `deploy-host` / `launch` / `export` flow.
  - Remove the "HotRepl sidecar cleanup" wording. The new `HotReplDeployer` cleanup remains, but the documentation does not need to expose this implementation detail.
- `docs/project-map.md`
  - Fix the "Windows-only" wording on `mods/`. The build tool runs natively on macOS, and game execution uses CrossOver/WINE; documenting this correctly matters for the HotRepl flow.
- `Local.props.example`
  - Fix the `dotnet run - -project` typo.
  - Update the WINE_* comment so it explicitly covers both `launch` and `export`, not just export.
- `.claude/skills/create-new-mod/SKILL.md`
  - Align platform wording with the corrected `mods/CLAUDE.md` (build is cross-platform; running uses CrossOver on macOS).
  - No HotRepl content added; this skill is about mod authoring, not runtime introspection.

### New file

- `.claude/skills/hotrepl-runtime-inspection/SKILL.md`
  - Project-scoped, intentionally small (target 50-80 lines).
  - Frontmatter description triggers on tasks like "inspect live game state", "run a control command against Ancient Kingdoms", "verify REPL availability".
  - Body documents:
    - When to use HotRepl in this project (rare; only for runtime probing the running game).
    - The two-step composition: `build-tool deploy-host && build-tool launch --wait` followed by `hotrepl --profile ancient-kingdoms ...`.
    - Pointers to `hotrepl --help`, `hotrepl wait --help`, and `hotrepl control run --help` rather than restating the HotRepl spec.
    - Note that game-specific control commands are registered by `mods/DataExporter` and visible via `hotrepl doctor`.
  - Avoids restating HotRepl protocol details, exit codes, or envelope schemas; those belong with HotRepl.

### Files explicitly not changed

- `.claude/skills/export-game-data/SKILL.md`, `update-game-version/SKILL.md`, `create-new-exporter/SKILL.md`, `create-new-loader/SKILL.md`, `create-new-denormalizer/SKILL.md`, `create-entity-detail-page/SKILL.md`, `create-entity-overview-page/SKILL.md`, `add-map-entity-layer/SKILL.md`, `svelte-5-patterns/SKILL.md`, `creating-issues/SKILL.md`, `writing-skills/SKILL.md`, `edit-claude-md/SKILL.md`, `bootstrap-worktree/SKILL.md`.
- `docs/claude-md-guide.md` — already correctly scoped, no HotRepl-specific text needed.

## Testing strategy

`tests/BuildTool.Tests/` is the home for `build-tool` tests. A new `tests/DataExporter.Tests/` xUnit project is added for DataExporter's result-file writer. Test design follows the repo's existing xUnit conventions and the seam-not-interface principle.

### What gets tested

- **Configuration** — `LocalConfig` parses representative `Local.props` files, including macOS (WINE_*) and Windows shapes. `LocalConfigWriter` round-trips and idempotently merges.
- **Profile upsert** — `ProfileWriter` reads, merges, and atomically writes a profile JSON file. Tests cover the "no existing file", "existing file with other profiles", and "existing `ancient-kingdoms` entry to replace" cases. Tokens never appear in test fixtures; the writer only stores references (env name, token-file path).
- **Game launch arguments** — `WineEnvironment` and `WindowsEnvironment` produce the correct argument list and environment dictionary for launch and for export. Equivalent to today's `HotReplLauncherTests`, but asserts on `ArgumentList` rather than concatenated strings.
- **HotRepl deploy** — `HotReplDeployer` selects the right file set, copies into a temp `Mods/` directory, and prunes the documented stale-file list. The current `HotReplDeployerTests` shape stays valid; assertions update to the new namespace.
- **Output envelopes** — `OutputEnvelope` round-trips success/failure shapes and matches the documented schema.
- **Export result reader** — `ExportResultReader` accepts a well-formed `schemaVersion: 1` document, rejects unknown schema versions with an explicit error, surfaces top-level `ok: false` correctly, and times out cleanly when the file never appears. Tests use temp directories; no real game involved.
- **Export result writer** — DataExporter's writer produces a well-formed JSON document, uses atomic temp-file plus move, and sets top-level `ok` only when every required exporter succeeded. Lives in the new `tests/DataExporter.Tests/` project.

### What gets deleted

- `HotReplSmokeTests` — the `hotrepl-smoke` command and its smoke command builder are removed.
- Any test currently asserting on `WaitForPort` behaviour.

### Seam usage in tests

`IProcessRunner` is implemented by a `FakeProcessRunner` that returns canned `ProcessResult` values keyed by program name and argv prefix. Tests that exercise commands which would have invoked `dotnet`, `steamcmd`, or the game binary inject `FakeProcessRunner`. No real subprocess starts in the test suite.

### Integration boundary

We do not start the game in tests. We do not start `hotrepl` in tests. Integration with HotRepl is exercised manually via the documented composition; HotRepl itself has its own test coverage that we trust.

## Migration plan

Clean cutover in four commits on a single branch.

### Commit 1 — internal architecture rebuild (no surface change yet)

- Add Spectre.Console.Cli and CliWrap as `build-tool` dependencies.
- Introduce `Abstractions/IProcessRunner.cs` and the CliWrap-backed implementation.
- Introduce `Configuration/LocalConfig*.cs`, `Output/OutputEnvelope.cs`, `Output/ExitCodes.cs`, `Game/*.cs`, and the new `Commands/*.cs` skeletons.
- Keep the old `Program.cs` dispatch live so the existing CLI keeps working. New commands not yet wired into `Main`.
- Tests for the new infrastructure ship with this commit.

### Commit 2 — command surface cutover

- Replace `Program.cs` with the Spectre `CommandApp`.
- Delete `HotReplSmokeRunner.cs`, `HotReplSmokeTests.cs`, the `WaitForPort` path, the composite `hotrepl` command, and the `Quote` helper.
- Rename `hotrepl-deploy` → `deploy-host`, `hotrepl-launch` → `launch`.
- Update or delete tests that referenced the removed shapes.

### Commit 3 — export completion signal

- Add the result-file writer to `mods/DataExporter` (atomic write, schema-versioned shape, `ok`/`exporters[]`/`errors[]`).
- Scaffold `tests/DataExporter.Tests/` with writer coverage.
- Add `Game/ExportResultReader.cs` in `build-tool` and wire it into `ExportCommand`.
- Add reader coverage in `tests/BuildTool.Tests/`.
- Stop treating the MelonLoader log marker as the success signal; the log continues to stream for the human.

### Commit 4 — documentation and skill update

- Edit `CLAUDE.md`, `mods/CLAUDE.md`, `docs/project-map.md`, `Local.props.example`, `.claude/skills/create-new-mod/SKILL.md`.
- Add `.claude/skills/hotrepl-runtime-inspection/SKILL.md`.

Each commit must build, format, lint, and test cleanly on its own. The branch is squash-mergeable as a single change-set; reviewers can also walk the commits if they prefer.

## Out of scope

These items are not improvements for this work and are not deferred — they are decisions to leave the current shape alone.

- **`steamcmd app_update` beyond the CliWrap migration.** `steamcmd` has no structured interface we can use; richer error parsing is polish without an architectural lever.
- **Replacing `Local.props` as MSBuild's configuration mechanism.** MSBuild reads `.props` natively. Polyglot repos using each ecosystem's native config (TOML for Python, JSON for JS, `.props` for MSBuild) is the right shape, not legacy.
- **Migrating to NUKE, Cake, or another build-automation framework.** `build-tool` is a project task runner, not a build-pipeline DAG. Spectre.Console.Cli plus CliWrap is the correct baseline for the responsibilities it owns.
- **Refactoring DataExporter beyond the result-file writer.** DataExporter's own design (export catalogue, artifact references, schema evolution) is a separate concern; the result file is a thin orchestration contract, not a redesign trigger.
- **The Python build pipeline (`build-pipeline/`), the SvelteKit website (`website/`), or unrelated mods.** Unrelated subsystems.

## Future direction

These items are real future work, named with concrete next steps rather than left vague. Each merits its own spec at the appropriate time; none of them block this cutover.

- **Game-specific HotRepl control commands registered by `mods/DataExporter`.** Concrete candidates:
  - `compendium.preflight` — verify the game is in an exportable state (world loaded, no blocking UI, expected scene).
  - `compendium.export` — run one or more exporter types by name, return artifact references for the resulting files.
  - `world.summary` — return loaded scene, monster counts, current player state for diagnostics.
  Each control command merits its own design; implementing the first is a separate spec following the HotRepl control-command authoring conventions.
- **Migrating `build-tool export` to call `hotrepl control run compendium.export`.** Once `compendium.export` ships as a control command, the result-file watcher introduced by this spec becomes redundant. The migration eliminates the dual-surface (result file plus HotRepl envelope) by consolidating on the HotRepl envelope and JSONL job events. Sequence: ship the control command first, then migrate the consumer in a follow-up spec.
- **DataExporter producing artifact references in HotRepl's shape (`uri`, `path`, `sha256`, `byteSize`, `finalized`) instead of bare `outputPath` strings.** Useful once any consumer wants verified export integrity. Additive to the current result-file shape; gated behind `schemaVersion` bump when it lands.
- **Other mods registering HotRepl control commands for live-game introspection.** Same authoring pattern as DataExporter; entirely additive.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Spectre.Console.Cli and CliWrap are new dependencies | Both are widely-used, mature .NET libraries with active maintenance; pin versions in `Directory.Packages.props`-style central management if the repo grows that pattern. |
| Single-commit surface cutover breaks ad-hoc scripts that called `hotrepl-deploy` / `hotrepl-smoke` | No external script consumers identified in this repository; the cutover documentation in the commit body lists the renames. |
| Agents trying to use the old composite `hotrepl` command after the change | The new skill explicitly documents the composition. Old behaviour is removed from `CLAUDE.md` and `mods/CLAUDE.md` in the same commit-set. |
| MelonLoader log banner detection in `launch --wait` is fragile if MelonLoader output changes | Banner detection is bounded by a timeout; on timeout we return exit code 6 (readiness) with a structured error pointing the user at `MelonLoader/Latest.log`. The user can still proceed manually. |
| Profile upsert in `setup` writing to the user's HotRepl profile file is surprising | The step is opt-in, default-no, and idempotent. The setup output explicitly names the file path before writing. |
| Result file becomes a parallel API surface to maintain alongside HotRepl envelopes | The result file's `schemaVersion` is explicit and breaking changes are deliberate two-side updates. The Future Direction migration to `hotrepl control run compendium.export` eliminates the dual surface; until then, both consumers see the same `ok`/`exporters[]` shape delivered through different channels. |

## Verification

A reviewer or follow-up implementer can confirm this spec is internally consistent by checking:

- Every removed item in **Command surface → Removed** is matched by a replacement path elsewhere in the spec.
- Every interface introduced in **Architecture → Build-tool internal architecture** maps to a real test seam in **Testing strategy**.
- Every doc file listed in **Documentation and skill updates → Existing files** is referenced in `git ls-files` at the listed path.
- The boundary table in **Architecture → Boundary** is the source of truth for any "who owns this" disagreement during implementation.
- Every field in the **Export completion signal → Producer** JSON example is read by `ExportResultReader` per the **Consumer** section, and every reader-exit-code row in the **Consumer** table maps to a real producer state.

If implementation diverges from the spec, the spec is updated in the same commit-set, not silently desynchronised.
