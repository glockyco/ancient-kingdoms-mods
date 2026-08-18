#nullable disable
using System;
using System.Collections;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Artifacts;
using HotReplCommands.Dtos;
using HotReplCommands.World;
using Il2Cpp;
using Il2CppMirror;
using MelonLoader;
using Newtonsoft.Json.Linq;

namespace HotReplCommands.Commands
{
    public sealed class ExportJobCommand : IControlCommandHandler<CompendiumExportArgs, CompendiumExportResult>
    {
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
                yield return WorldEntry.EnterCoroutine(
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

                var deadline = DateTime.UtcNow + WorldEntry.MaxWait;
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
    }
}
