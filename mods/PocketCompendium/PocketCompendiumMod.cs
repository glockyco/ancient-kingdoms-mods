using System.Collections.Generic;
using AncientKingdomsMods.Shared;
using MelonLoader;
using PocketCompendium.Core;
using PocketCompendium.Core.Feedback;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Settings;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Core.Updates;
using PocketCompendium.Features.Alerts;
using PocketCompendium.Features.BestiaryCollection;
using PocketCompendium.Features.BestiaryCountdown;
using PocketCompendium.Features.BestiaryPages;
using PocketCompendium.Features.Fatecharms;
using PocketCompendium.Features.BossList;
using PocketCompendium.Features.MapPins;
using PocketCompendium.Features.BossSkills;
using PocketCompendium.Features.Sharing;
using PocketCompendium.Features.WorldMarkers;

[assembly: MelonInfo(typeof(PocketCompendium.PocketCompendiumMod), "Pocket Compendium", "1.3.2", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]
[assembly: HarmonyDontPatchAll]

namespace PocketCompendium;

public sealed class PocketCompendiumMod : MelonMod
{
    private NoticeCard _noticeCard;
    private FeatureRegistry _features;
    private SettingsWindow _settings;
    private LayoutSettings _layout;
    private Tracker _tracker;
    private UpdateService _updates;
    private StartScreen _startScreen;
    private bool _worldLogged;

    public override void OnInitializeMelon()
    {
        Log.Initialize(LoggerInstance);
        Patching.Initialize(HarmonyInstance);

        _tracker = new Tracker();
        _ = new Watchlist();
        _features = new FeatureRegistry();
        var bossList = new BossListFeature();
        var worldMarkers = new WorldMarkersFeature();
        var edgeArrows = new EdgeArrowsFeature(worldMarkers.EarlierEdgeArrows);
        var mapPins = new MapPinsFeature();
        var dungeonEntrances = new DungeonEntrancesFeature();
        var bestiaryCountdown = new BestiaryCountdownFeature();
        var alerts = new AlertsFeature();
        var bossSkills = new BossSkillsFeature();
        var bestiaryPages = new BestiaryPagesFeature();
        var dropsFound = new DropsFoundFeature();
        var fatecharms = new FatecharmsFeature();
        var sharing = new SharingFeature();
        _features.Add(bossList);
        _features.Add(worldMarkers);
        _features.Add(edgeArrows);
        _features.Add(mapPins);
        _features.Add(dungeonEntrances);
        _features.Add(bestiaryCountdown);
        _features.Add(alerts);
        _features.Add(bossSkills);
        _features.Add(bestiaryPages);
        _features.Add(dropsFound);
        _features.Add(fatecharms);
        _features.Add(sharing);

        string build = ModBuild.Commit(typeof(PocketCompendiumMod).Assembly);
        var general = new GeneralSettings(bestiaryPages.EarlierUndiscoveredMonsters);
        _layout = new LayoutSettings();
        _noticeCard = new NoticeCard(_layout.Page);
        _layout.Page.Action(
            "Notices",
            "Show example",
            "Shows an example card so you can move it where you want it.",
            _noticeCard.ShowExample);
        _features.StoppedAfterError += _noticeCard.Add;
        _updates = new UpdateService(Info.Version);
        _startScreen = new StartScreen(_updates, _layout);
        _settings = new SettingsWindow(new[]
        {
            SettingsGroup.Shared(general.Page.Title, Icons.Sliders, general.Page, _layout.Page),
            SettingsGroup.Of("Respawns", Icons.Timer, bossList, mapPins, dungeonEntrances, worldMarkers, edgeArrows, alerts, sharing),
            SettingsGroup.Of("Bestiary", Icons.BookOpen, bestiaryPages, bestiaryCountdown, dropsFound),
            SettingsGroup.Of("Combat", Icons.Swords, bossSkills, fatecharms),
            SettingsGroup.Drawn(new UpdatesPage(_updates)),
            SettingsGroup.Drawn(new AboutPage(Info.Version, build, _features.Features)),
        }, _layout);

        LoggerInstance.Msg($"Pocket Compendium {Info.Version}, build {build}. Switched on: {_features.SwitchedOn()}. {_layout.SettingsKey.Value} opens the settings.");
    }

    public override void OnUpdate()
    {
        // Errors logged in this frame carry its world.
        SessionRecord.Observe(GameAccess.NetworkActive);
        Overlay.Update();
        _updates.Update();
        _startScreen.Update();

        // The window updates first, so a click on it never reaches a panel below.
        _settings.Update();
        // The tracker refreshes before the features that read it.
        _tracker.Update(_features.TrackerWanted);
        _features.Update();
        // After the features, which set this frame's hover texts.
        Tooltip.Update();

        // A feature can stop before the player exists, so its card waits for the player.
        bool inWorld = GameAccess.InWorld && GameAccess.LocalPlayer != null;
        _noticeCard.Update(inWorld);
        if (inWorld) LogWorldEntry();
    }

    // A log then shows the world and setting of the errors that follow.
    private void LogWorldEntry()
    {
        if (_worldLogged) return;
        _worldLogged = true;
        LoggerInstance.Msg($"Entered world {SessionRecord.WorldsEntered}. Playing: {ProblemReport.SettingText(SetupReader.Setting())}.");
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
        _startScreen.Destroy();
        Overlay.Dispose();
        Tooltip.Dispose();
        Icons.Dispose();
        Shapes.Dispose();
        HudFactory.Dispose();
        Theme.Dispose();
    }
}
