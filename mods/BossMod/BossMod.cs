using System;
using System.Collections.Generic;
using System.IO;
using BossMod.Audio;
using BossMod.Core.Alerts;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using BossMod.Imgui;
using BossMod.Tracking;
using BossMod.Ui;
using MelonLoader;
using MelonLoader.Utils;

[assembly: MelonInfo(typeof(BossMod.BossMod), "BossMod", "0.1.0", "ancient-kingdoms-mods")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]

namespace BossMod;

public class BossMod : MelonMod
{
    private readonly Dictionary<uint, BossState> _previousStates = new();

    private ImGuiRenderer _renderer;
    private SkillCatalog _catalog;
    private Globals _globals;
    private AlertEngine _alertEngine;
    private StateFlusher _flusher;
    private MonsterWatcher _watcher;
    private PlayerContextBuilder _playerContextBuilder;
    private UiFrameBuilder _uiFrameBuilder;
    private AlertOverlay _alertOverlay;
    private BossModUi _ui;
    private SoundBank _soundBank;
    private SoundPlayer _soundPlayer;
    private AlertSubscriber _alertSubscriber;
    private UiFrame _currentFrame;

    public override void OnInitializeMelon()
    {
        var userData = Path.Combine(MelonEnvironment.UserDataDirectory, "BossMod");
        Directory.CreateDirectory(userData);
        var statePath = Path.Combine(userData, "state.json");
        var iniPath = Path.Combine(userData, "imgui.ini");
        var cacheDir = Path.Combine(userData, "cache");
        var soundsDir = Path.Combine(userData, "Sounds");

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

        _soundBank = new SoundBank(soundsDir);
        _soundBank.RescanUserSounds();
        foreach (var status in _soundBank.LoadStatuses)
        {
            if (!status.Loaded) LoggerInstance.Warning($"BossMod skipped sound '{status.Name}' ({status.Path}): {status.Message}");
        }

        _soundPlayer = new SoundPlayer(_soundBank, LoggerInstance);
        _soundPlayer.Initialize();

        _alertEngine = new AlertEngine(_catalog, new TierDefaults());
        _flusher = new StateFlusher(
            write: () => StateJson.Write(statePath, _catalog, _globals),
            now: () => DateTimeOffset.UtcNow,
            debounce: TimeSpan.FromSeconds(1));
        _flusher.OnFlushError = ex => LoggerInstance.Error($"BossMod failed to flush state.json: {ex.Message}");

        _watcher = new MonsterWatcher(LoggerInstance, _catalog, _globals);
        _playerContextBuilder = new PlayerContextBuilder();
        _uiFrameBuilder = new UiFrameBuilder(_playerContextBuilder);
        _alertOverlay = new AlertOverlay();
        _alertSubscriber = new AlertSubscriber(_soundPlayer, _alertOverlay);
        _ui = new BossModUi(_alertOverlay);
        _currentFrame = _uiFrameBuilder.Build(_watcher.CurrentSnapshots, _globals);

        _renderer.OnLayout = OnLayout;

        LoggerInstance.Msg("BossMod initialized");
    }

    public override void OnUpdate()
    {
        if (_renderer == null || _watcher == null) return;

        bool catalogChanged = _watcher.Tick();
        _currentFrame = _uiFrameBuilder.Build(_watcher.CurrentSnapshots, _globals);

        if (_uiFrameBuilder.LastContext.SceneChangedOrLeftWorld)
        {
            _previousStates.Clear();
            _alertEngine.Reset();
        }

        ProcessAlerts(_watcher.CurrentSnapshots);

        if (catalogChanged) _flusher.MarkDirty();
        _flusher.Tick();
    }

    public override void OnGUI() => _renderer?.OnGUI();

    public override void OnDeinitializeMelon()
    {
        _flusher?.Dispose();
        _soundPlayer?.Dispose();
        _soundBank?.Dispose();
        _renderer?.Dispose();
    }

    private void OnLayout()
    {
        if (_ui == null || _currentFrame == null) return;

        bool settingsChanged = _ui.Render(_currentFrame);
        if (settingsChanged) _flusher.MarkDirty();
    }

    private void ProcessAlerts(IReadOnlyList<BossState> current)
    {
        var visibleNetIds = new HashSet<uint>();
        for (int i = 0; i < current.Count; i++)
        {
            var curr = current[i];
            visibleNetIds.Add(curr.NetId);

            if (_previousStates.TryGetValue(curr.NetId, out var prev))
            {
                foreach (var ev in _alertEngine.Process(prev, curr))
                {
                    _alertSubscriber.Handle(ev, _globals);
                }
            }

            _previousStates[curr.NetId] = curr;
        }

        if (_previousStates.Count == visibleNetIds.Count) return;

        var remove = new List<uint>();
        foreach (var netId in _previousStates.Keys)
        {
            if (!visibleNetIds.Contains(netId)) remove.Add(netId);
        }
        foreach (var netId in remove) _previousStates.Remove(netId);
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
