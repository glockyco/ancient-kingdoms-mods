# HotReplCommands

Registers the typed HotRepl commands that drive the automated compendium export and controlled game shutdown.

## Entry Point

`HotReplCommandsMod.OnLateInitializeMelon` reads the export directory from `DataExporter.ExportConfig.ExportPath` and the screenshot directory from `MapScreenshotter.ScreenshotConfig.ScreenshotPath`. It registers four handlers with `GlobalControlCommandRegistry.Instance` and keeps the returned `IDisposable` registrations. `OnDeinitializeMelon` disposes all four registrations.

The startup log reports the four registered commands and the export directory. The project targets `net6.0` and references HotRepl Core and Protocol, the game and Unity assemblies, Newtonsoft.Json, DataExporter, and MapScreenshotter.

`HotReplCommandCatalog` contains static metadata that is safe to compile without game-assembly references:

| Command | Version | Kind | Mutates state |
|---------|---------|------|---------------|
| `compendium.preflight` | 1 | `Sync` | No |
| `world.summary` | 1 | `Sync` | No |
| `world.enter` | 1 | `Job` | Yes |
| `compendium.export` | 1 | `Job` | Yes |
| `game.quit` | 1 | `Sync` | Yes |

## Typed Commands

All five handlers implement `IControlCommandHandler<TArgs, TResult>`. Empty-argument commands receive `EmptyArgs` and the wire caller sends an empty JSON object.

### `compendium.preflight`

- **Kind:** `Sync`
- **Arguments:** `EmptyArgs`, `{}`
- **Returns:** `PreflightResult`
- **State:** Read-only

The result contains `ready`, `exportDirExists`, `screenshotDirExists`, `dataExporterFound`, `mapScreenshotterFound`, `scene`, and `localPlayerReady`. `ready` is true only when DataExporter and MapScreenshotter are registered, the export directory exists, and `Il2CppMirror.NetworkClient.localPlayer` is present. The screenshot directory is reported separately and does not participate in that boolean.

### `world.summary`

- **Kind:** `Sync`
- **Arguments:** `EmptyArgs`, `{}`
- **Returns:** `WorldSummaryResult`
- **State:** Read-only

The result contains the active `scene`, the character-selection manager's `networkState` when available, `characterCount`, the selected character's `selectedChar` when the selection index is valid, and `localPlayerReady`. Character fields are nullable when the character-selection UI or its data is unavailable.

### `world.enter`

- **Kind:** `Job`
- **Arguments:** `EmptyArgs`, `{}`
- **Returns:** `WorldEnterResult`
- **State:** Mutates state by driving the game from the `Start` scene to a spawned local player.

Calls `World/WorldEntry.cs`'s `EnterCoroutine` (shared with `compendium.export`) and returns once it succeeds, without exporting anything. No-ops when `NetworkClient.localPlayer` is already present. `WorldEnterResult` contains `localPlayerReady` and `scene`; failures return the same precondition codes as export's world-entry step.

### `compendium.export`

- **Kind:** `Job`
- **Arguments:** `CompendiumExportArgs`, `{ "screenshots": true | false }`. The `screenshots` property is required.
- **Returns:** A job result containing `CompendiumExportResult` plus an artifact map.
- **State:** Mutates state by entering the world, exporting data, and optionally capturing screenshots.

`CompendiumExportResult` contains `ok`, `durationMs`, `exporterCount`, nullable `screenshotCount`, and an `errors` array. The command reports progress phases named `enteringWorld`, `exportingData`, `capturingScreenshots`, and `collectingArtifacts`.

### `game.quit`

- **Kind:** `Sync`
- **Arguments:** `EmptyArgs`, `{}`
- **Returns:** `GameQuitResult`, `{ "quitting": true }`
- **State:** Mutates state

The handler calls `UnityEngine.Application.Quit()` and returns the typed result.

## World Entry

`World/WorldEntry.cs` drives the game from the `Start` scene to a spawned local player. `WorldEnterCommand` and `ExportJobCommand` both call its `EnterCoroutine`.

`EnterCoroutine` uses a five-minute deadline for every wait and honors cancellation throughout:

1. In the `Start` scene, wait one frame, find `UILogin`, and invoke its single-player button. A missing `UILogin` returns `worldEntryUnavailable`.
2. Wait for `UICharacterSelection.singleton`, then wait for the manager to reach `NetworkState.Lobby` with character data. Timeout returns `worldEntryUnavailable`.
3. Return `characterMissing` when no characters exist. Otherwise select the first character, write its name to `NetworkManagerMMO.name_character_selected` and `PlayerPrefs`, mark its intro as run, save preferences, clear previews, and call `UIServerList.singleton.StartConnect(null)`.
4. Wait for `NetworkClient.localPlayer` to spawn. Timeout returns `worldEntryUnavailable`.
5. Wait an additional three-second settle period before reporting successful world entry.

The coroutine chooses the first available character rather than the character that was selected in the UI. Cancellation raises `OperationCanceledException` from each waiting loop and cancels the calling job.

## Export Job

`ExportJobCommand` starts a Melon coroutine and completes the typed job result through a `TaskCompletionSource`. Screenshot capture waits use `WorldEntry.MaxWait` as their own deadline.

The command checks for a registered DataExporter before doing any game work. It returns the precondition code `dataExporterMissing` when that mod is absent. When screenshots are requested, it also requires a registered MapScreenshotter and returns `mapScreenshotterMissing` when it is absent.

If `NetworkClient.localPlayer` is already present, the job proceeds directly to export. Otherwise it calls `WorldEntry.EnterCoroutine` (see World Entry above) and surfaces that outcome's code and message on failure.

### Data and Screenshots

After world entry, the command calls `DataExporter.ExportAllData()`. A failed exporter result returns `dataExportFailed` with the exporter error count and joined error messages. A successful export reports `exportingData` before the call.

When `screenshots` is true, the command reports `capturingScreenshots`, calls `StartScreenshotCapture`, and returns `screenshotCaptureFailed` if capture is already in progress. It waits for `IsCapturing` to become false, checks `LastResult`, and stores its `TileCount` as `screenshotCount`. Timeout or a failed screenshot result also returns `screenshotCaptureFailed`.

The job then reports `collectingArtifacts`, calls `ArtifactCollector.Collect`, and returns a successful result with the elapsed duration, exporter count, optional screenshot count, an empty error array, and the collected artifact map.

## Artifact Map

`ArtifactCollector` emits finalized `ArtifactRef` values with an absolute file URI, source path, content type, byte size, and lowercase SHA-256 digest. Its stable logical keys are:

| Source | Key |
|--------|-----|
| Export JSON other than `visual_assets.json` | `data.{stem}`, with underscores changed to hyphens and the stem lowercased |
| `visual_assets.json` | `visual-assets.manifest` |
| Screenshot `metadata.json` | `screenshots.metadata` |
| Screenshot PNG | `screenshots.{stem}`, with the stem lowercased |

The artifact collector ignores the screenshot directory when screenshots are not requested. It only includes files that exist in the configured directories.

`ExportProgressPayload` defines the serializable progress shape with required `phase` and nullable `message`, `current`, and `total` fields. `ExportJobCommand` reports its progress through `ControlCommandProgress` snapshots containing the phase and message.

## `build-tool export` Driver

`build-tool/HotRepl/HotReplExportRunner.cs` is the client for this command surface. Its required-command list names the four commands the export path needs; `world.enter` is not in it.

The runner performs this sequence:

1. Connect to HotRepl and require protocol version 2 in the handshake.
2. Retry `commands_list` until all four required commands are present or the readiness timeout expires. It uses a three-minute default readiness timeout and a three-second default poll interval.
3. Open a fresh connection after catalog readiness, then call `compendium.preflight`. A response other than `ok` fails readiness.
4. Call `compendium.export` with the configured `screenshots` boolean and capture the accepted `jobId`.
5. Poll `job_status` every poll interval until a `job_result` or terminal `job_status_result` reports a done state. The default job timeout is sixty minutes. Running states continue polling, and unknown message types are discarded.
6. For a successful job, require at least one `data.*` artifact, `visual-assets.manifest`, and `screenshots.metadata` when screenshots were requested. Reject any artifact that reports `finalized: false` or `byteSize: 0`.
7. Attempt `game.quit` after every terminal result. A quit failure is ignored when the game has already exited.

The runner also attempts `game.quit` before returning an artifact-verification failure. It does not send `control_auth`, `lease_acquire`, `ping`, `profile`, or client `job_result` messages.

## Project Layout

```text
HotReplCommands.cs             # MelonLoader registration and disposal
HotReplCommandCatalog.cs       # Unity-free command metadata
Commands/                       # Five typed command handlers
World/                          # Shared world-entry coroutine (WorldEnterCommand + ExportJobCommand)
Dtos/                           # Command arguments, results, and progress shapes
Artifacts/                      # Stable export artifact collection and hashing
```

## Gotchas

- The export path depends on DataExporter and MapScreenshotter being registered before `OnLateInitializeMelon` runs.
- The command catalog, handler names, and `HotReplExportRunner.RequiredCommands` are one protocol surface. A command name change requires updating both sides, while catalog version changes affect the advertised command metadata.
- `compendium.export` is asynchronous even though its initial `command_call` only accepts the job. The final data arrives through job status polling.
- Artifact verification is part of the build-tool path. A successful DataExporter call is not sufficient when the required artifact keys are missing or an artifact is empty or not finalized.
