#nullable disable
using System;
using System.Collections;
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

        public ValueTask<ControlCommandResult<CompendiumExportResult>> ExecuteAsync(
            ControlCommandContext<CompendiumExportResult> context,
            CompendiumExportArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<CompendiumExportResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunExportCoroutine(context, args, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<CompendiumExportResult>>(completion.Task);
        }

        private IEnumerator RunExportCoroutine(
            ControlCommandContext<CompendiumExportResult> context,
            CompendiumExportArgs args,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<CompendiumExportResult>> completion)
        {
            var core = RunExportCore(context, args, cancellationToken, completion);
            while (true)
            {
                object current;
                try
                {
                    if (!core.MoveNext())
                        yield break;
                    current = core.Current;
                }
                catch (OperationCanceledException)
                {
                    completion.TrySetCanceled(cancellationToken);
                    yield break;
                }
                catch (Exception ex)
                {
                    completion.TrySetException(ex);
                    yield break;
                }

                yield return current;
            }
        }

        private IEnumerator RunExportCore(
            ControlCommandContext<CompendiumExportResult> context,
            CompendiumExportArgs args,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<CompendiumExportResult>> completion)
        {
            var started = DateTime.UtcNow;

            var dataExporter = MelonMod.RegisteredMelons
                .OfType<DataExporter.DataExporter>()
                .FirstOrDefault();
            if (dataExporter == null)
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "dataExporterMissing", "DataExporter mod not found in registered melons."));
                yield break;
            }

            MapScreenshotter.MapScreenshotter screenshotter = null;
            if (args.Screenshots)
            {
                screenshotter = MelonMod.RegisteredMelons
                    .OfType<MapScreenshotter.MapScreenshotter>()
                    .FirstOrDefault();
                if (screenshotter == null)
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        "mapScreenshotterMissing",
                        "MapScreenshotter mod not found in registered melons."));
                    yield break;
                }
            }

            context.Progress.Report(Progress("enteringWorld", "Checking world readiness."));
            if (NetworkClient.localPlayer == null)
            {
                WorldEntryOutcome worldResult = null;
                yield return EnterWorldCoroutine(
                    cancellationToken,
                    outcome => worldResult = outcome);
                if (worldResult == null || !worldResult.Ok)
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        worldResult?.Code ?? "worldEntryUnavailable",
                        worldResult?.Message ?? "World entry failed with no error detail."));
                    yield break;
                }
            }

            context.Progress.Report(Progress("exportingData", "Running DataExporter.ExportAllData()."));
            cancellationToken.ThrowIfCancellationRequested();
            var exportResult = dataExporter.ExportAllData();
            if (!exportResult.Ok)
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "dataExportFailed",
                    $"DataExporter reported {exportResult.Errors.Count} error(s): " +
                    string.Join("; ", exportResult.Errors)));
                yield break;
            }

            int? screenshotCount = null;
            if (args.Screenshots && screenshotter != null)
            {
                context.Progress.Report(Progress("capturingScreenshots", "Starting MapScreenshotter."));
                if (!screenshotter.StartScreenshotCapture())
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        "screenshotCaptureFailed",
                        "MapScreenshotter rejected start — capture already in progress."));
                    yield break;
                }

                var deadline = DateTime.UtcNow + MaxWait;
                while (screenshotter.IsCapturing)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    if (DateTime.UtcNow >= deadline)
                    {
                        completion.TrySetResult(context.PreconditionFailed(
                            "screenshotCaptureFailed",
                            "Timed out waiting for screenshot capture to complete."));
                        yield break;
                    }
                    yield return null;
                }

                var shotResult = screenshotter.LastResult;
                if (shotResult == null || !shotResult.Ok)
                {
                    completion.TrySetResult(context.PreconditionFailed(
                        "screenshotCaptureFailed",
                        shotResult?.ErrorMessage ?? "Screenshot capture failed with no error detail."));
                    yield break;
                }

                screenshotCount = shotResult.TileCount;
            }

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

            completion.TrySetResult(ControlCommandResult.Ok(output, artifacts));
        }

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

        private static IEnumerator EnterWorldCoroutine(
            CancellationToken ct,
            Action<WorldEntryOutcome> complete)
        {
            var scene = SceneManager.GetActiveScene().name;

            if (scene == "Start")
            {
                yield return null;
                ct.ThrowIfCancellationRequested();
                var login = UnityEngine.Object.FindObjectOfType<UILogin>();
                if (login == null)
                {
                    complete(WorldEntryOutcome.Failed(
                        "worldEntryUnavailable",
                        "UILogin not found in Start scene."));
                    yield break;
                }
                login.singlePlayerButton.onClick.Invoke();
            }

            var deadline = DateTime.UtcNow + MaxWait;
            while (UICharacterSelection.singleton == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                {
                    complete(WorldEntryOutcome.Failed(
                        "worldEntryUnavailable",
                        "Timed out waiting for UICharacterSelection."));
                    yield break;
                }
                yield return null;
            }

            var charSelect = UICharacterSelection.singleton;
            var manager = charSelect.manager;

            while (manager.state != NetworkState.Lobby ||
                   manager.charactersAvailableMsg.characters == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                {
                    complete(WorldEntryOutcome.Failed(
                        "worldEntryUnavailable",
                        "Timed out waiting for lobby/character data."));
                    yield break;
                }
                yield return null;
            }

            var characters = manager.charactersAvailableMsg.characters;
            if (characters.Length == 0)
            {
                complete(WorldEntryOutcome.Failed(
                    "characterMissing",
                    "No characters found. Create a character first."));
                yield break;
            }

            var firstName = characters[0].name;
            manager.selection = 0;
            ((NetworkManagerMMO)NetworkManager.singleton).name_character_selected = firstName;
            PlayerPrefs.SetString("selected_char", firstName);
            PlayerPrefs.SetInt(firstName + "_intro_run", 1);
            PlayerPrefs.Save();
            ((NetworkManagerMMO)NetworkManager.singleton).ClearPreviews();
            UIServerList.singleton.StartConnect(null);

            while (NetworkClient.localPlayer == null)
            {
                ct.ThrowIfCancellationRequested();
                if (DateTime.UtcNow >= deadline)
                {
                    complete(WorldEntryOutcome.Failed(
                        "worldEntryUnavailable",
                        "Timed out waiting for local player to spawn."));
                    yield break;
                }
                yield return null;
            }

            var settleEnd = DateTime.UtcNow + SettleTime;
            while (DateTime.UtcNow < settleEnd)
            {
                ct.ThrowIfCancellationRequested();
                yield return null;
            }

            complete(WorldEntryOutcome.Success());
        }
    }
}
