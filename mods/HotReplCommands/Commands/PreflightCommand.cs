using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HotRepl.Control;
using HotReplCommands.Dtos;
using Il2Cpp;
using MelonLoader;

namespace HotReplCommands.Commands
{
    public sealed class PreflightCommand : IControlCommandHandler<EmptyArgs, PreflightResult>
    {
        private readonly string _exportDir;
        private readonly string _screenshotDir;

        public PreflightCommand(string exportDir, string screenshotDir)
        {
            _exportDir = exportDir;
            _screenshotDir = screenshotDir;
        }

        public string Name => "compendium.preflight";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Sync;
        public bool MutatesState => false;

        public ValueTask<ControlCommandResult<PreflightResult>> ExecuteAsync(
            ControlCommandContext<PreflightResult> context, EmptyArgs args, CancellationToken cancellationToken)
        {
            var dataExporter = MelonMod.RegisteredMelons
                .OfType<DataExporter.DataExporter>()
                .FirstOrDefault();
            var mapScreenshotter = MelonMod.RegisteredMelons
                .OfType<MapScreenshotter.MapScreenshotter>()
                .FirstOrDefault();

            var scene = UnityEngine.SceneManagement.SceneManager.GetActiveScene().name;
            var localPlayerReady = Il2CppMirror.NetworkClient.localPlayer != null;

            var result = new PreflightResult
            {
                Ready = dataExporter != null && mapScreenshotter != null
                        && Directory.Exists(_exportDir) && localPlayerReady,
                ExportDirExists = Directory.Exists(_exportDir),
                ScreenshotDirExists = Directory.Exists(_screenshotDir),
                DataExporterFound = dataExporter != null,
                MapScreenshotterFound = mapScreenshotter != null,
                Scene = scene,
                LocalPlayerReady = localPlayerReady,
            };

            return new ValueTask<ControlCommandResult<PreflightResult>>(
                ControlCommandResult.Ok(result));
        }
    }
}
