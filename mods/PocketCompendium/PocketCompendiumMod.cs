using System.Collections.Generic;
using AncientKingdomsMods.Shared;
using MelonLoader;
using PocketCompendium.Core;
using PocketCompendium.Core.Feedback;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Alerts;
using PocketCompendium.Features.BestiaryCountdown;
using PocketCompendium.Features.BestiaryPages;
using PocketCompendium.Features.BossList;
using PocketCompendium.Features.MapPins;
using PocketCompendium.Features.BossSkills;
using PocketCompendium.Features.Sharing;
using PocketCompendium.Features.WorldMarkers;

[assembly: MelonInfo(typeof(PocketCompendium.PocketCompendiumMod), "Pocket Compendium", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]
[assembly: HarmonyDontPatchAll]

namespace PocketCompendium;

public sealed class PocketCompendiumMod : MelonMod
{
    private readonly Queue<Feature> _stoppedNotices = new();
    private FeatureRegistry _features;
    private SettingsWindow _settings;
    private LayoutSettings _layout;
    private Tracker _tracker;
    private bool _worldLogged;

    public override void OnInitializeMelon()
    {
        Log.Initialize(LoggerInstance);
        Patching.Initialize(HarmonyInstance);

        _tracker = new Tracker();
        _ = new Watchlist();
        _features = new FeatureRegistry();
        _features.Add(new BossListFeature());
        _features.Add(new WorldMarkersFeature());
        _features.Add(new MapPinsFeature());
        _features.Add(new BestiaryCountdownFeature());
        _features.Add(new AlertsFeature());
        _features.Add(new BossSkillsFeature());
        _features.Add(new BestiaryPagesFeature());
        _features.Add(new SharingFeature());
        _features.StoppedAfterError += _stoppedNotices.Enqueue;

        string build = ModBuild.Commit(typeof(PocketCompendiumMod).Assembly);
        _layout = new LayoutSettings();
        _settings = new SettingsWindow(_features.Features, _layout, new AboutPage(Info.Version, build, _features.Features));

        LoggerInstance.Msg($"Pocket Compendium {Info.Version}, build {build}. Switched on: {_features.SwitchedOn()}. {_layout.SettingsKey.Value} opens the settings.");
    }

    public override void OnUpdate()
    {
        Overlay.Update();

        // The window updates first, so a click on it never reaches a panel below.
        _settings.Update();
        // The tracker refreshes before the features that read it.
        _tracker.Update(_features.TrackerWanted);
        _features.Update();

        if (GameAccess.InWorld && GameAccess.LocalPlayer != null)
        {
            LogWorldEntry();
            ShowStoppedNotices();
        }
    }

    // A log then shows the setting of the errors that follow.
    private void LogWorldEntry()
    {
        if (_worldLogged) return;
        _worldLogged = true;
        LoggerInstance.Msg($"Entered a world. Playing: {ProblemReport.SettingText(SetupReader.Setting())}.");
    }

    // A feature can stop before the player exists, so the notice waits for the player. The game
    // adds the closing period to the chat line itself.
    private void ShowStoppedNotices()
    {
        while (_stoppedNotices.Count > 0)
        {
            var feature = _stoppedNotices.Dequeue();
            GameAccess.LocalPlayer.ShowImportantMessage(
                $"{ModText.Name}: {feature.Title} stopped after an error. Please report it from the About page in its settings ({_layout.SettingsKey.Value})",
                Il2Cpp.Utils.colorImportantGolden,
                showChat: true);
        }
    }

    public override void OnSceneWasUnloaded(int buildIndex, string sceneName)
    {
        _tracker.EndSession();
        _features.OnSceneUnloaded(sceneName);
        if (sceneName == "World") _worldLogged = false;
    }

    public override void OnDeinitializeMelon()
    {
        _features.StopAll();
        _tracker.EndSession();
        _settings.Destroy();
        Overlay.Dispose();
        Icons.Dispose();
        Shapes.Dispose();
        Theme.Dispose();
    }
}
