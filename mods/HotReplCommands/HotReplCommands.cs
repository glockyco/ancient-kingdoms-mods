using System;
using HotRepl.Control;
using HotReplCommands.Commands;
using MelonLoader;

[assembly: MelonInfo(typeof(HotReplCommands.HotReplCommandsMod), "HotReplCommands", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace HotReplCommands
{
    public class HotReplCommandsMod : MelonMod
    {
        private IDisposable _preflight;
        private IDisposable _worldSummary;
        private IDisposable _export;
        private IDisposable _quit;

        public override void OnLateInitializeMelon()
        {
            var exportDir = DataExporter.ExportConfig.ExportPath;
            var screenshotDir = MapScreenshotter.ScreenshotConfig.ScreenshotPath;

            var registry = GlobalControlCommandRegistry.Instance;
            _preflight = registry.Register(new PreflightCommand(exportDir, screenshotDir));
            _worldSummary = registry.Register(new WorldSummaryCommand());
            _export = registry.Register(new ExportJobCommand(exportDir, screenshotDir));
            _quit = registry.Register(new GameQuitCommand());

            LoggerInstance.Msg(
                $"HotReplCommands: registered 4 typed commands (exportDir={exportDir}).");
        }

        public override void OnDeinitializeMelon()
        {
            _preflight?.Dispose();
            _worldSummary?.Dispose();
            _export?.Dispose();
            _quit?.Dispose();
        }
    }
}
