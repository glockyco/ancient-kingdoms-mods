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
        private IDisposable _worldEnter;
        private IDisposable _export;
        private IDisposable _quit;
        private IDisposable _useScratchDatabase;
        private IDisposable _zoneShots;
        private IDisposable _createCharacter;
        private IDisposable _pointer;
        private IDisposable _raiseLevel, _grantItem, _chambersEnter, _chambersState, _chambersNavigate;

        public override void OnLateInitializeMelon()
        {
            var exportDir = DataExporter.ExportConfig.ExportPath;
            var screenshotDir = MapScreenshotter.ScreenshotConfig.ScreenshotPath;

            var registry = GlobalControlCommandRegistry.Instance;
            _preflight = registry.Register(new PreflightCommand(exportDir, screenshotDir));
            _worldSummary = registry.Register(new WorldSummaryCommand());
            _worldEnter = registry.Register(new WorldEnterCommand());
            _export = registry.Register(new ExportJobCommand(screenshotDir));
            _quit = registry.Register(new GameQuitCommand());
            _useScratchDatabase = registry.Register(new UseScratchDatabaseCommand());
            _zoneShots = registry.Register(new CaptureZoneShotsCommand(exportDir));
            _createCharacter = registry.Register(new CreateCharacterCommand());
            _pointer = registry.Register(new UiPointerCommand());
            _raiseLevel = registry.Register(new RaiseLevelCommand());
            _grantItem = registry.Register(new GrantItemCommand());
            _chambersEnter = registry.Register(new ChambersEnterCommand());
            _chambersState = registry.Register(new ChambersStateCommand());
            _chambersNavigate = registry.Register(new ChambersNavigateCommand());

            LoggerInstance.Msg(
                $"HotReplCommands: registered {HotReplCommandCatalog.All.Length} typed commands (exportDir={exportDir}).");
        }

        public override void OnDeinitializeMelon()
        {
            _preflight?.Dispose();
            _worldSummary?.Dispose();
            _worldEnter?.Dispose();
            _export?.Dispose();
            _quit?.Dispose();
            _useScratchDatabase?.Dispose();
            _zoneShots?.Dispose();
            _createCharacter?.Dispose();
            _pointer?.Dispose();
            _raiseLevel?.Dispose();
            _grantItem?.Dispose();
            _chambersEnter?.Dispose();
            _chambersState?.Dispose();
            _chambersNavigate?.Dispose();
        }
    }
}
