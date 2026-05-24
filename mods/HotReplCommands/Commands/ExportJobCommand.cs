#nullable disable
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Artifacts;
using HotReplCommands.Dtos;
using Il2Cpp;
using Il2CppMirror;
using MelonLoader;
using Newtonsoft.Json.Linq;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace HotReplCommands.Commands
{
    public sealed class ExportJobCommand : IControlCommandHandler<CompendiumExportArgs, CompendiumExportResult>
    {
        private static readonly TimeSpan MaxWait = TimeSpan.FromMinutes(5);
        private static readonly TimeSpan SettleTime = TimeSpan.FromSeconds(3);

        private readonly string _exportDir;
        private readonly string _screenshotDir;

        public ExportJobCommand(string exportDir, string screenshotDir)
        {
            _exportDir = exportDir;
            _screenshotDir = screenshotDir;
        }

        public string Name => "compendium.export";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public async ValueTask<ControlCommandResult<CompendiumExportResult>> ExecuteAsync(
            ControlCommandContext context,
            CompendiumExportArgs args,
            CancellationToken cancellationToken)
        {
            var started = DateTime.UtcNow;

            // --- resolve collaborators ---
            var dataExporter = MelonMod.RegisteredMelons
                .OfType<DataExporter.DataExporter>()
                .FirstOrDefault();
            if (dataExporter == null)
                return ControlCommandResult.PreconditionFailed<CompendiumExportResult>(
                    "dataExporterMissing", "DataExporter mod not found in registered melons.");

            MapScreenshotter.MapScreenshotter screenshotter = null;
            if (args.Screenshots)
            {
                screenshotter = MelonMod.RegisteredMelons
                    .OfType<MapScreenshotter.MapScreenshotter>()
                    .FirstOrDefault();
                if (screenshotter == null)
                    return ControlCommandResult.PreconditionFailed<CompendiumExportResult>(
                        "mapScreenshotterMissing",
                        "MapScreenshotter mod not found in registered melons.");
            }

            // --- world entry (if not already in world) ---
            context.Progress.Report(Progress("enteringWorld", "Checking world readiness."));
            if (NetworkClient.localPlayer == null)
            {
                var worldResult = await EnterWorldAsync(cancellationToken);
                if (!worldResult.Ok)
                    return ControlCommandResult.PreconditionFailed<CompendiumExportResult>(
                        worldResult.Code, worldResult.Message);
            }

            // --- export data ---
            context.Progress.Report(Progress("exportingData", "Running DataExporter.ExportAllData()."));
            var exportResult = dataExporter.ExportAllData();
            if (!exportResult.Ok)
                return ControlCommandResult.PreconditionFailed<CompendiumExportResult>(
                    "dataExportFailed",
                    $"DataExporter reported {exportResult.Errors.Count} error(s): " +
                    string.Join("; ", exportResult.Errors));

            // --- screenshots ---
            int? screenshotCount = null;
            if (args.Screenshots && screenshotter != null)
            {
                context.Progress.Report(Progress("capturingScreenshots", "Starting MapScreenshotter."));
                if (!screenshotter.StartScreenshotCapture())
                    return ControlCommandResult.PreconditionFailed<CompendiumExportResult>(
                        "screenshotCaptureFailed",
                        "MapScreenshotter rejected start — capture already in progress.");

                var deadline = DateTime.UtcNow + MaxWait;
                while (screenshotter.IsCapturing)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    if (DateTime.UtcNow >= deadline)
                        return ControlCommandResult.PreconditionFailed<CompendiumExportResult>(
                            "screenshotCaptureFailed",
                            "Timed out waiting for screenshot capture to complete.");
                    await Task.Yield();
                }

                var shotResult = screenshotter.LastResult;
                if (shotResult == null || !shotResult.Ok)
                    return ControlCommandResult.PreconditionFailed<CompendiumExportResult>(
                        "screenshotCaptureFailed",
                        shotResult?.ErrorMessage ?? "Screenshot capture failed with no error detail.");

                screenshotCount = shotResult.TileCount;
            }

            // --- collect artifacts ---
            context.Progress.Report(Progress("collectingArtifacts", "Building artifact map."));
            var artifacts = ArtifactCollector.Collect(_exportDir, _screenshotDir, args.Screenshots);

            var output = new CompendiumExportResult
            {
                Ok = true,
                DurationMs = (long)(DateTime.UtcNow - started).TotalMilliseconds,
                ExporterCount = exportResult.Exporters.Count,
                ScreenshotCount = screenshotCount,
                Errors = Array.Empty<string>(),
            };

            return ControlCommandResult.Ok(output, artifacts);
        }

        // ---

        private static ControlCommandProgress Progress(string phase, string message)
            => new ControlCommandProgress(
                Snapshot: new JObject { ["phase"] = phase, ["message"] = message },
                Message: message);

        private sealed class WorldEntryOutcome
        {
            public bool Ok { get; set; }
            public string Code { get; set; }
            public string Message { get; set; }

            public static WorldEntryOutcome Success() => new WorldEntryOutcome { Ok = true };
            public static WorldEntryOutcome Failed(string code, string msg)
                => new WorldEntryOutcome { Ok = false, Code = code, Message = msg };
        }

        private async Task<WorldEntryOutcome> EnterWorldAsync(CancellationToken ct)
        {
            var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name;

            // Phase 1: Start scene -> click singleplayer
            if (scene == "Start")
            {
                await Task.Yield(); ct.ThrowIfCancellationRequested();
                var login = UnityEngine.Object.FindObjectOfType<UILogin>();
                if (login == null)
                    return WorldEntryOutcome.Failed("worldEntryUnavailable",
                        "UILogin not found in Start scene.");
                login.singlePlayerButton.onClick.Invoke();
            }

            // Phase 2: Wait for UICharacterSelection
            var deadline = DateTime.UtcNow + MaxWait;
            while (UICharacterSelection.singleton == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                    return WorldEntryOutcome.Failed("worldEntryUnavailable",
                        "Timed out waiting for UICharacterSelection.");
                await Task.Yield();
            }

            var charSelect = UICharacterSelection.singleton;
            var manager = charSelect.manager;

            // Phase 3: Wait for lobby state + characters
            while (manager.state != NetworkState.Lobby ||
                   manager.charactersAvailableMsg.characters == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                    return WorldEntryOutcome.Failed("worldEntryUnavailable",
                        "Timed out waiting for lobby/character data.");
                await Task.Yield();
            }

            var characters = manager.charactersAvailableMsg.characters;
            if (characters.Length == 0)
                return WorldEntryOutcome.Failed("characterMissing",
                    "No characters found. Create a character first.");

            var firstName = characters[0].name;
            manager.selection = 0;
            ((NetworkManagerMMO)NetworkManager.singleton).name_character_selected = firstName;
            PlayerPrefs.SetString("selected_char", firstName);
            PlayerPrefs.SetInt(firstName + "_intro_run", 1);
            PlayerPrefs.Save();
            ((NetworkManagerMMO)NetworkManager.singleton).ClearPreviews();
            UIServerList.singleton.StartConnect(null);

            // Phase 4: Wait for local player
            while (NetworkClient.localPlayer == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                    return WorldEntryOutcome.Failed("worldEntryUnavailable",
                        "Timed out waiting for local player to spawn.");
                await Task.Yield();
            }

            // Phase 5: Settle
            var settleEnd = DateTime.UtcNow + SettleTime;
            while (DateTime.UtcNow < settleEnd)
            {
                ct.ThrowIfCancellationRequested();
                await Task.Yield();
            }

            return WorldEntryOutcome.Success();
        }
    }
}
