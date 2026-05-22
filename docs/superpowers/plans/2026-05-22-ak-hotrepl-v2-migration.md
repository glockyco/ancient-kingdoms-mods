# Ancient Kingdoms HotRepl v2 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Ancient Kingdoms export path that depends on launch flags, AutoExporter, and `.exporter-result.json` with HotRepl v2 typed commands driven by `build-tool export`.

**Architecture:** Add a small HotRepl command mod that owns game automation, data export, screenshot capture, and named artifact collection. `build-tool` deploys the v2 host, launches the game, connects to `ws://127.0.0.1:18590`, validates command descriptors, runs typed commands, polls `job_status` until terminal, and verifies artifacts instead of polling a result file.

**Tech Stack:** .NET 10 build-tool/tests, .NET 6 MelonLoader mods, HotRepl v2 Core/Host.MelonLoader, Spectre.Console.Cli, existing Python build pipeline (`uv run compendium build`), SvelteKit/pnpm website checks.

---

## Preconditions

- Implement from `/Users/joaichberger/.config/superpowers/worktrees/ancient-kingdoms-mods/hotrepl-v2-migration-plan` or a fresh successor worktree, not from `main`.
- Run `git status --short --branch` before editing. The source checkout had unrelated untracked user files when this plan was written.
- Bootstrap the worktree before website validation: `scripts/bootstrap-worktree.sh <trusted-source-checkout>`.
- HotRepl v2 package source is repo-local until registry publishing exists. Use `HotRepl.Core` and `HotRepl.Protocol` version `2.0.0-alpha.0` NuGet packages generated from the HotRepl clean-architecture branch, checked into `vendor/hotrepl/nuget/`, and referenced through a repo-local package source. Do not use hardcoded `/Users/...` paths.
- HotRepl v2 has no profile/auth/lease/ping compatibility. Do not preserve `profiles.json`, `HOTREPL_TOKEN`, `control run --lease`, `LeaseConflict` vocabulary, or Python HotRepl client commands.

---

## File Structure

New command mod:

```text
mods/CompendiumHotRepl/
  CompendiumHotRepl.csproj
  CompendiumHotRepl.cs
  Commands/
    CompendiumPreflightCommandHandler.cs
    CompendiumExportCommandHandler.cs
    WorldSummaryCommandHandler.cs
  Automation/
    WorldEntryAutomation.cs
  Artifacts/
    ExportArtifactCollector.cs
```

Build-tool additions:

```text
build-tool/HotRepl/
  HotReplDeployer.cs          # keep deploy-host, update v2 file set
  HotReplPaths.cs             # keep repo/path resolution, remove profile path concerns
  HotReplExportRunner.cs      # v2 WebSocket protocol runner for export commands
```

Deletes:

```text
mods/AutoExporter/AutoExporter.cs
mods/AutoExporter/AutoExporter.csproj
mods/DataExporter/ExportResultFile.cs
build-tool/Game/ExportResultReader.cs
build-tool/HotRepl/ProfileWriter.cs
tests/BuildTool.Tests/ProfileWriterTests.cs
tests/BuildTool.Tests/ExportResultReaderTests.cs
tests/DataExporter.Tests/ExportResultFileTests.cs
exported-data/.exporter-result.json
```

---

## Task 1: Add the HotRepl v2 command mod shell

**Files:**

- Modify: `Directory.Build.props`
- Modify: `Local.props.example`
- Modify: `AncientKingdomsMods.sln` only if the repo keeps solution membership current
- Create: `mods/CompendiumHotRepl/CompendiumHotRepl.csproj`
- Create: `mods/CompendiumHotRepl/CompendiumHotRepl.cs`
- Create: `mods/CompendiumHotRepl/Commands/CompendiumPreflightCommandHandler.cs`
- Create: `mods/CompendiumHotRepl/Commands/WorldSummaryCommandHandler.cs`
- Create: `tests/BuildTool.Tests/CommandRegistrationTests.cs` additions

- [ ] **Step 1: Add failing registration/build tests**

Extend command registration tests to assert the new mod project is discovered by build/deploy discovery and that `AutoExporter` is not required:

```csharp
Assert.Contains(projects, project => project.EndsWith("mods/CompendiumHotRepl/CompendiumHotRepl.csproj"));
Assert.DoesNotContain(projects, project => project.Contains("AutoExporter"));
```

Add a preflight handler test that expects v2 descriptor vocabulary:

```csharp
Assert.Equal("compendium.preflight", descriptor.Name);
Assert.Equal(1, descriptor.MajorVersion);
Assert.Equal("sync", descriptor.Kind);
Assert.False(descriptor.MutatesState);
Assert.NotNull(descriptor.InputSchema);
Assert.NotNull(descriptor.OutputSchema);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```sh
dotnet test tests/BuildTool.Tests/ --nologo -v q --filter "FullyQualifiedName~CommandRegistrationTests"
```

Expected: FAIL because `mods/CompendiumHotRepl` does not exist.

- [ ] **Step 3: Create the mod project**

`mods/CompendiumHotRepl/CompendiumHotRepl.csproj` references `HotRepl.Core` and
`HotRepl.Protocol` version `2.0.0-alpha.0` through the repo-local `vendor/hotrepl/nuget/` package
source, not a hardcoded `/Users/...` source checkout path. The mod class registers exactly three
commands:

```text
compendium.preflight v1 sync
world.summary v1 sync
compendium.export v1 job
```

`compendium.preflight` returns whether `DataExporter`, `MapScreenshotter`, and required game state are available. `world.summary` returns the current scene, selected character, and local-player presence for diagnostics. `compendium.export` runs the full automation/export job.

- [ ] **Step 4: Run build verification**

Run:

```sh
dotnet run --project build-tool build
dotnet test tests/BuildTool.Tests/ --nologo -v q --filter "FullyQualifiedName~CommandRegistrationTests"
```

Expected: PASS with zero warnings.

- [ ] **Step 5: Commit**

```sh
git add Directory.Build.props Local.props.example AncientKingdomsMods.sln mods/CompendiumHotRepl tests/BuildTool.Tests/CommandRegistrationTests.cs
git commit -m "feat(mods): add HotRepl v2 command mod"
```

---

## Task 2: Move export automation out of `AutoExporter`

**Files:**

- Create: `mods/CompendiumHotRepl/Automation/WorldEntryAutomation.cs`
- Create: `mods/CompendiumHotRepl/Artifacts/ExportArtifactCollector.cs`
- Modify: `mods/DataExporter/DataExporter.cs`
- Modify: `mods/MapScreenshotter/MapScreenshotter.cs`
- Modify: `tests/DataExporter.Tests/DataExporter.Tests.csproj`
- Modify: `tests/DataExporter.Tests/ExportRunResultJsonTests.cs`
- Delete later in this task: `mods/AutoExporter/AutoExporter.cs`
- Delete later in this task: `mods/AutoExporter/AutoExporter.csproj`

- [ ] **Step 1: Write failing automation/export tests**

Add tests around pure DTOs and collector behavior:

```csharp
var result = ExportArtifactCollector.Collect(tempExportPath, includeScreenshots: true);
Assert.Contains("staticData", result.Artifacts.Keys);
Assert.Contains("classes", result.Artifacts.Keys);
Assert.All(result.Artifacts.Values, artifact => Assert.True(artifact.Finalized));
Assert.All(result.Artifacts.Values, artifact => Assert.NotEmpty(artifact.Sha256));
```

Extend `ExportRunResultJsonTests` so `DataExporter.ExportAllData()` remains serializable without writing `.exporter-result.json`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```sh
dotnet test tests/DataExporter.Tests/ --nologo -v q
```

Expected: FAIL because `ExportArtifactCollector` does not exist and `DataExporter` still writes `ExportResultFile`.

- [ ] **Step 3: Implement command-owned automation**

Move the AutoExporter flow into `WorldEntryAutomation`:

```text
Start scene -> click singleplayer -> World scene -> choose first character -> wait for NetworkClient.localPlayer -> settle -> run job body
```

Rules:

- Report explicit errors through the HotRepl error envelope; do not only log.
- Keep manual `DataExporter` Shift+F9 export behavior.
- Keep manual `MapScreenshotter` Shift+F10 behavior.
- Extend `MapScreenshotter` with a completion result or explicit last error so `compendium.export` can fail when screenshots fail.

- [ ] **Step 4: Delete AutoExporter and result-file writer**

Remove:

```sh
git rm mods/AutoExporter/AutoExporter.cs mods/AutoExporter/AutoExporter.csproj mods/DataExporter/ExportResultFile.cs tests/DataExporter.Tests/ExportResultFileTests.cs
```

Remove `ExportResultFile.Write(ExportPath, result)` from `mods/DataExporter/DataExporter.cs` and return the `ExportRunResult` directly.

- [ ] **Step 5: Run mod tests**

Run:

```sh
dotnet test tests/DataExporter.Tests/ --nologo -v q
dotnet run --project build-tool build
```

Expected: PASS with zero warnings.

- [ ] **Step 6: Commit**

```sh
git add mods/CompendiumHotRepl mods/DataExporter mods/MapScreenshotter tests/DataExporter.Tests
git commit -m "feat(mods): move export automation to HotRepl commands"
```

---

## Task 3: Rewrite `build-tool export` around HotRepl v2

**Files:**

- Create: `build-tool/HotRepl/HotReplExportRunner.cs`
- Modify: `build-tool/Commands/ExportCommand.cs`
- Modify: `build-tool/Commands/LaunchCommand.cs`
- Modify: `build-tool/Program.cs`
- Modify: `tests/BuildTool.Tests/ExportCommandTests.cs`
- Modify: `tests/BuildTool.Tests/LaunchCommandTests.cs`
- Create: `tests/BuildTool.Tests/HotReplExportRunnerTests.cs`
- Delete: `build-tool/Game/ExportResultReader.cs`
- Delete: `tests/BuildTool.Tests/ExportResultReaderTests.cs`

- [ ] **Step 1: Write failing runner tests**

`HotReplExportRunnerTests` uses a fake in-memory WebSocket/protocol seam and asserts this sequence:

```text
receive handshake protocolVersion 2
send commands_list
send command_describe compendium.preflight
send command_describe compendium.export
send command_call compendium.preflight
send command_call compendium.export { screenshots }
send job_status until terminal job_result
verify named artifacts and hashes
```

Add error tests for `server_unreachable`, `validation_failed`, `timeout`, `cancelled`, and `artifact_missing`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```sh
dotnet test tests/BuildTool.Tests/ --nologo -v q --filter "FullyQualifiedName~HotReplExportRunnerTests|FullyQualifiedName~ExportCommandTests|FullyQualifiedName~LaunchCommandTests"
```

Expected: FAIL because `HotReplExportRunner` does not exist and `ExportCommand` still waits on `.exporter-result.json`.

- [ ] **Step 3: Implement the v2 export runner**

`HotReplExportRunner` responsibilities:

```csharp
public sealed class HotReplExportRunner
{
    public Task<HotReplExportResult> RunAsync(
        Uri url,
        bool screenshots,
        TimeSpan timeout,
        CancellationToken cancellationToken);
}
```

Rules:

- Default URL is `ws://127.0.0.1:18590`.
- Reject any handshake where `protocolVersion != 2`.
- Use v2 `commands_list`, `command_describe`, `command_call`, and `job_status`.
- Do not send `control_auth`, `lease_acquire`, `ping`, profile messages, or a client `job_result` request.
- Terminal `job_result` from `job_status` contains output and named artifact references.
- Map universal error `kind` to `ExitCodes.For(kind)`.

- [ ] **Step 4: Rewrite `ExportCommand`**

`ExportCommand.ExecuteAsync` should:

```text
optionally run steam update
launch the game without --export-data/--export-screenshots
wait for HotRepl readiness via HotReplExportRunner
run compendium.preflight
run compendium.export with screenshots flag
verify artifacts exist under DATA_EXPORT_PATH
return success/failure JSON through CommandResultStore
```

Remove `DeleteStaleResultFile`, `ResultFilePath`, `WaitForExportResultAsync`, and `ExportResultReader` usage.

- [ ] **Step 5: Run build-tool tests**

Run:

```sh
dotnet test tests/BuildTool.Tests/ --nologo -v q --filter "FullyQualifiedName~ExportCommandTests|FullyQualifiedName~LaunchCommandTests|FullyQualifiedName~HotReplExportRunnerTests"
```

Expected: PASS.

- [ ] **Step 6: Commit**

```sh
git add build-tool/HotRepl/HotReplExportRunner.cs build-tool/Commands/ExportCommand.cs build-tool/Commands/LaunchCommand.cs build-tool/Program.cs tests/BuildTool.Tests/ExportCommandTests.cs tests/BuildTool.Tests/LaunchCommandTests.cs tests/BuildTool.Tests/HotReplExportRunnerTests.cs
git rm build-tool/Game/ExportResultReader.cs tests/BuildTool.Tests/ExportResultReaderTests.cs
git commit -m "feat(build-tool): export through HotRepl v2 commands"
```

---

## Task 4: Remove v1 profile/auth/lease setup and rename exit-code vocabulary

**Files:**

- Modify: `build-tool/Commands/SetupCommand.cs`
- Modify: `build-tool/Commands/DeployHostCommand.cs`
- Modify: `build-tool/HotRepl/HotReplDeployer.cs`
- Modify: `build-tool/HotRepl/HotReplPaths.cs`
- Modify: `build-tool/Output/ExitCodes.cs`
- Modify: `tests/BuildTool.Tests/SetupCommandTests.cs`
- Modify: `tests/BuildTool.Tests/DeployHostCommandTests.cs`
- Modify: `tests/BuildTool.Tests/HotReplDeployerTests.cs`
- Modify: `tests/BuildTool.Tests/HotReplPathResolverTests.cs`
- Modify: `tests/BuildTool.Tests/ExitCodesTests.cs`
- Delete: `build-tool/HotRepl/ProfileWriter.cs`
- Delete: `tests/BuildTool.Tests/ProfileWriterTests.cs`

- [ ] **Step 1: Write failing cleanup tests**

`SetupCommandTests` should assert no profile is written and no token is prompted. `DeployHostCommandTests` should assert v2 deploy copies host/Core/dependencies only. `ExitCodesTests` should assert names:

```csharp
Assert.Equal(5, ExitCodes.ResourceConflict);
Assert.Equal(6, ExitCodes.ReadinessFailed);
Assert.Equal(ExitCodes.ResourceConflict, ExitCodes.For("resource_conflict"));
Assert.Equal(ExitCodes.ReadinessFailed, ExitCodes.For("timeout"));
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```sh
dotnet test tests/BuildTool.Tests/ --nologo -v q --filter "FullyQualifiedName~SetupCommandTests|FullyQualifiedName~DeployHostCommandTests|FullyQualifiedName~HotReplDeployerTests|FullyQualifiedName~HotReplPathResolverTests|FullyQualifiedName~ExitCodesTests|FullyQualifiedName~ProfileWriterTests"
```

Expected: FAIL because profile writer and lease/auth names still exist.

- [ ] **Step 3: Remove profile writer and v1 config**

Remove all references to:

```text
profiles.json
HOTREPL_TOKEN
auth_failed
lease_conflict
lease_required
LeaseConflict
ProfileWriter
```

Keep numeric meanings stable unless a test explicitly changes them:

```csharp
public const int ResourceConflict = 5;
public const int ReadinessFailed = 6;
```

Map v2 error kinds:

```csharp
"server_unreachable" or "tool_unreachable" => Unreachable,
"resource_conflict" or "busy" or "conflict" => ResourceConflict,
"timeout" => ReadinessFailed,
"cancelled" => Cancelled,
"invalid_request" or "validation_failed" or "precondition_failed" => InvalidUsage,
"unknown_command" or "unsupported_operation" or "artifact_missing" or "internal" => Internal,
```

- [ ] **Step 4: Run cleanup tests**

Run:

```sh
dotnet test tests/BuildTool.Tests/ --nologo -v q --filter "FullyQualifiedName~SetupCommandTests|FullyQualifiedName~DeployHostCommandTests|FullyQualifiedName~HotReplDeployerTests|FullyQualifiedName~HotReplPathResolverTests|FullyQualifiedName~ExitCodesTests"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```sh
git add build-tool/Commands/SetupCommand.cs build-tool/Commands/DeployHostCommand.cs build-tool/HotRepl build-tool/Output/ExitCodes.cs tests/BuildTool.Tests
git rm build-tool/HotRepl/ProfileWriter.cs tests/BuildTool.Tests/ProfileWriterTests.cs
git commit -m "refactor(build-tool): remove HotRepl v1 profile setup"
```

---

## Task 5: Update docs and HotRepl runtime skill

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `mods/CLAUDE.md`
- Modify: `mods/DataExporter/CLAUDE.md`
- Modify: `mods/MapScreenshotter/CLAUDE.md`
- Modify: `.claude/skills/hotrepl-runtime-inspection/SKILL.md`
- Modify: `docs/data-export-guide.md`
- Modify: `docs/project-map.md`
- Create or update: `docs/superpowers/specs/2026-05-22-hotrepl-v2-migration-design.md`

- [ ] **Step 1: Remove stale v1 instructions**

Search active docs for:

```text
--profile ancient-kingdoms
hotrepl ping
hotrepl doctor
hotrepl wait
control run --lease
profiles.json
HOTREPL_TOKEN
AutoExporter
.exporter-result.json
```

Replace with v2 instructions:

```text
build-tool deploy-host
build-tool launch --wait
build-tool export --json
build-tool export --screenshots --json
HotRepl v2 endpoint ws://127.0.0.1:18590
commands_list / command_describe / command_call / job_status
```

- [ ] **Step 2: Document new mod ownership**

`mods/CLAUDE.md` and `docs/project-map.md` should state:

```text
CompendiumHotRepl owns automated export orchestration.
DataExporter owns data serialization and manual Shift+F9 export.
MapScreenshotter owns manual Shift+F10 screenshots plus command-invoked capture.
build-tool export is the only automated consumer entry point.
```

- [ ] **Step 3: Run doc/static checks**

Run:

```sh
pnpm check --dir website
pnpm lint --dir website
```

If this repo uses root package scripts instead, run the documented equivalents from `CLAUDE.md`:

```sh
cd website && pnpm check && pnpm lint && pnpm build
```

Expected: PASS. If the worktree is not bootstrapped, run `scripts/bootstrap-worktree.sh <trusted-source-checkout>` first.

- [ ] **Step 4: Commit**

```sh
git add README.md CLAUDE.md mods/CLAUDE.md mods/DataExporter/CLAUDE.md mods/MapScreenshotter/CLAUDE.md .claude/skills/hotrepl-runtime-inspection/SKILL.md docs/data-export-guide.md docs/project-map.md docs/superpowers/specs/2026-05-22-hotrepl-v2-migration-design.md
git commit -m "docs: document Ancient Kingdoms HotRepl v2 export flow"
```

---

## Final branch gate

Run before requesting review:

```sh
git status --short --branch
dotnet test tests/BuildTool.Tests/ --nologo -v q
dotnet test tests/DataExporter.Tests/ --nologo -v q
dotnet run --project build-tool build
dotnet run --project build-tool deploy-host
dotnet run --project build-tool deploy
dotnet run --project build-tool launch --wait
dotnet run --project build-tool export --json
dotnet run --project build-tool export --screenshots --json
cd build-pipeline && uv run compendium build
cd build-pipeline && uv run compendium tiles
cd website && pnpm check && pnpm lint && pnpm build
```

Record which live game commands were run. If the local game, Wine/CrossOver, or HotRepl host path is unavailable, state the missing prerequisite and run every non-live command.
