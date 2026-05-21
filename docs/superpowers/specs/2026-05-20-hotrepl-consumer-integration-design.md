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
    LogStream.cs                   # MelonLoader log follow
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
- `export` — launch game with `--export-data`, stream MelonLoader log, detect the "All exports complete. Quitting." marker, capture exported JSON paths, exit. Streaming uses CliWrap `ListenAsync` rather than the current poll-and-tail loop.

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

`tests/BuildTool.Tests/` is the test home. Test design follows the repo's existing xUnit conventions and the seam-not-interface principle.

### What gets tested

- **Configuration** — `LocalConfig` parses representative `Local.props` files, including macOS (WINE_*) and Windows shapes. `LocalConfigWriter` round-trips and idempotently merges.
- **Profile upsert** — `ProfileWriter` reads, merges, and atomically writes a profile JSON file. Tests cover the "no existing file", "existing file with other profiles", and "existing `ancient-kingdoms` entry to replace" cases. Tokens never appear in test fixtures; the writer only stores references (env name, token-file path).
- **Game launch arguments** — `WineEnvironment` and `WindowsEnvironment` produce the correct argument list and environment dictionary for launch and for export. Equivalent to today's `HotReplLauncherTests`, but asserts on `ArgumentList` rather than concatenated strings.
- **HotRepl deploy** — `HotReplDeployer` selects the right file set, copies into a temp `Mods/` directory, and prunes the documented stale-file list. The current `HotReplDeployerTests` shape stays valid; assertions update to the new namespace.
- **Output envelopes** — `OutputEnvelope` round-trips success/failure shapes and matches the documented schema.
- **Exit-code mapping** — `ExitCodes.For(error)` covers each documented category.

### What gets deleted

- `HotReplSmokeTests` — the `hotrepl-smoke` command and its smoke command builder are removed.
- Any test currently asserting on `WaitForPort` behaviour.

### Seam usage in tests

`IProcessRunner` is implemented by a `FakeProcessRunner` that returns canned `ProcessResult` values keyed by program name and argv prefix. Tests that exercise commands which would have invoked `dotnet`, `steamcmd`, or the game binary inject `FakeProcessRunner`. No real subprocess starts in the test suite.

### Integration boundary

We do not start the game in tests. We do not start `hotrepl` in tests. Integration with HotRepl is exercised manually via the documented composition; HotRepl itself has its own test coverage that we trust.

## Migration plan

Clean cutover in three commits on a single branch.

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

### Commit 3 — documentation and skill update

- Edit `CLAUDE.md`, `mods/CLAUDE.md`, `docs/project-map.md`, `Local.props.example`, `.claude/skills/create-new-mod/SKILL.md`.
- Add `.claude/skills/hotrepl-runtime-inspection/SKILL.md`.

Each commit must build, format, lint, and test cleanly on its own. The branch is squash-mergeable as a single change-set; reviewers can also walk the commits if they prefer.

## Out of scope

- Refactoring `build-tool`'s `export` log streaming beyond the CliWrap migration (no behaviour change to export's marker detection).
- Changing the `steamcmd app_update` integration (it stays as it is; only the subprocess invocation moves to CliWrap).
- Touching the Python build pipeline (`build-pipeline/`), the SvelteKit website (`website/`), or the Boss/Mod/DataExporter mod sources beyond the doc updates listed above.
- Adding game-specific HotRepl control commands. `mods/DataExporter` may grow these later; that is a separate spec.
- Replacing `Local.props` as MSBuild's configuration mechanism. MSBuild keeps consuming the XML; `build-tool` additionally parses it into a typed POCO.
- Migrating to NUKE or another build-automation framework. `build-tool` remains a project task-runner CLI; that is the right shape for the responsibilities it owns.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Spectre.Console.Cli and CliWrap are new dependencies | Both are widely-used, mature .NET libraries with active maintenance; pin versions in `Directory.Packages.props`-style central management if the repo grows that pattern. |
| Single-commit surface cutover breaks ad-hoc scripts that called `hotrepl-deploy` / `hotrepl-smoke` | No external script consumers identified in this repository; the cutover documentation in the commit body lists the renames. |
| Agents trying to use the old composite `hotrepl` command after the change | The new skill explicitly documents the composition. Old behaviour is removed from `CLAUDE.md` and `mods/CLAUDE.md` in the same commit-set. |
| MelonLoader log banner detection in `launch --wait` is fragile if MelonLoader output changes | Banner detection is bounded by a timeout; on timeout we return exit code 6 (readiness) with a structured error pointing the user at `MelonLoader/Latest.log`. The user can still proceed manually. |
| Profile upsert in `setup` writing to the user's HotRepl profile file is surprising | The step is opt-in, default-no, and idempotent. The setup output explicitly names the file path before writing. |

## Verification

A reviewer or follow-up implementer can confirm this spec is internally consistent by checking:

- Every removed item in **Command surface → Removed** is matched by a replacement path elsewhere in the spec.
- Every interface introduced in **Architecture → Build-tool internal architecture** maps to a real test seam in **Testing strategy**.
- Every doc file listed in **Documentation and skill updates → Existing files** is referenced in `git ls-files` at the listed path.
- The boundary table in **Architecture → Boundary** is the source of truth for any "who owns this" disagreement during implementation.

If implementation diverges from the spec, the spec is updated in the same commit-set, not silently desynchronised.
