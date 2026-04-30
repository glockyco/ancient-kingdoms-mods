using System;
using System.IO;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using BossMod.Imgui;
using BossMod.Tracking;
using BossMod.Ui;
using BossMod.Ui.Settings;
using BossMod.Ui.Tabs;
using MelonLoader;
using MelonLoader.Utils;

[assembly: MelonInfo(typeof(BossMod.BossMod), "BossMod", "0.1.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossMod;

public class BossMod : MelonMod
{
    private ImGuiRenderer _renderer;
    private SkillCatalog _catalog;
    private Globals _globals;
    private StateFlusher _flusher;
    private MonsterWatcher _watcher;
    private PlayerContextBuilder _playerContextBuilder;
    private UiFrameBuilder _uiFrameBuilder;
    private BossModUi _ui;
    private CastBarWindow _castBars;
    private CooldownWindow _cooldowns;
    private ISettingsMutator _settingsMutator;
    private SettingsWindow _settingsWindow;
    private StateFileActions _stateFileActions;
    private HotkeyManager _hotkeys;
    private UiFrame _currentFrame;

    public override void OnInitializeMelon()
    {
        var userData = Path.Combine(MelonEnvironment.UserDataDirectory, "BossMod");
        Directory.CreateDirectory(userData);
        var statePath = Path.Combine(userData, "state.json");
        var iniPath = Path.Combine(userData, "imgui.ini");
        var cacheDir = Path.Combine(userData, "cache");

        var read = StateJson.Read(statePath);
        _catalog = read.Catalog;
        _globals = read.Globals;
        LogStateRead(read);

        _renderer = new ImGuiRenderer(LoggerInstance);
        if (!_renderer.Init(iniPath, cacheDir))
        {
            LoggerInstance.Error("Renderer init failed; mod disabled");
            _renderer = null;
            return;
        }

        _flusher = new StateFlusher(
            write: () => StateJson.Write(statePath, _catalog, _globals),
            now: () => DateTimeOffset.UtcNow,
            debounce: TimeSpan.FromSeconds(1));
        _flusher.OnFlushError = ex => LoggerInstance.Error($"BossMod failed to flush state.json: {ex.Message}");

        _watcher = new MonsterWatcher(LoggerInstance, _catalog, _globals);
        _playerContextBuilder = new PlayerContextBuilder();
        _uiFrameBuilder = new UiFrameBuilder(_playerContextBuilder);
        _castBars = new CastBarWindow(_catalog, _globals);
        _cooldowns = new CooldownWindow(_catalog, _globals);
        _settingsMutator = new SettingsMutator(_catalog, _globals);
        var skillsTab = new SkillsTab(_catalog, _settingsMutator);
        var bossesTab = new BossesTab(_catalog, _settingsMutator);
        _stateFileActions = new StateFileActions(statePath, _catalog, _globals, _settingsMutator);
        var generalTab = new GeneralTab(_globals, _settingsMutator);
        var exportImportTab = new ExportImportTab(_stateFileActions);
        _settingsWindow = new SettingsWindow(generalTab, skillsTab, bossesTab, exportImportTab);
        _ui = new BossModUi(_globals, _castBars, _cooldowns, _settingsWindow, _settingsMutator);
        _hotkeys = new HotkeyManager();
        _hotkeys.Register("toggle_settings", _ui.ToggleSettings);
        _currentFrame = _uiFrameBuilder.Build(_watcher.CurrentSnapshots, _globals);

        _renderer.OnLayout = OnLayout;

        LoggerInstance.Msg("BossMod initialized");
    }

    public override void OnUpdate()
    {
        if (_renderer == null || _watcher == null) return;
        _hotkeys.Tick(skipActions: _renderer.WantTextInput);

        bool catalogChanged = _watcher.Tick();
        _currentFrame = _uiFrameBuilder.Build(_watcher.CurrentSnapshots, _globals);

        if (catalogChanged) _flusher.MarkDirty();
        _flusher.Tick();
    }

    public override void OnGUI() => _renderer?.OnGUI();

    public override void OnDeinitializeMelon()
    {
        _flusher?.Dispose();
        _renderer?.Dispose();
    }

    private void OnLayout()
    {
        if (_ui == null || _currentFrame == null) return;

        var result = _ui.Render(_currentFrame);
        if (result.Dirty) _flusher.MarkDirty();
        if (result.FlushImmediately)
        {
            _flusher.MarkDirty();
            _flusher.Flush();
            if (_flusher.IsDirty)
            {
                _stateFileActions.SetLastStatus(string.IsNullOrWhiteSpace(result.StatusMessage)
                    ? "State save failed; dirty state will retry."
                    : result.StatusMessage + " State save failed; dirty state will retry.");
            }
            else
            {
                _stateFileActions.SetLastStatus(string.IsNullOrWhiteSpace(result.StatusMessage)
                    ? "State saved."
                    : result.StatusMessage + " State saved.");
            }
        }
    }

    private void LogStateRead(StateReadResult read)
    {
        if (read.Status == StateReadStatus.Loaded)
        {
            LoggerInstance.Msg("BossMod loaded state.json");
            return;
        }

        if (string.IsNullOrEmpty(read.ErrorMessage))
            LoggerInstance.Warning($"BossMod state.json status: {read.Status}");
        else
            LoggerInstance.Warning($"BossMod state.json status: {read.Status}: {read.ErrorMessage}");
    }
}
