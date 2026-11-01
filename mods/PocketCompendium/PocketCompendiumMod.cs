using AncientKingdomsMods.Shared;
using MelonLoader;
using PocketCompendium.Core;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.Alerts;
using PocketCompendium.Features.BestiaryPages;
using PocketCompendium.Features.BossList;
using PocketCompendium.Features.MapPins;
using PocketCompendium.Features.BossSkills;
using PocketCompendium.Features.WorldMarkers;

[assembly: MelonInfo(typeof(PocketCompendium.PocketCompendiumMod), "Pocket Compendium", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]
[assembly: HarmonyDontPatchAll]

namespace PocketCompendium;

public sealed class PocketCompendiumMod : MelonMod
{
    private FeatureRegistry _features;
    private SettingsWindow _settings;
    private Tracker _tracker;

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
        _features.Add(new AlertsFeature());
        _features.Add(new BossSkillsFeature());
        _features.Add(new BestiaryPagesFeature());

        var layout = new LayoutSettings();
        _settings = new SettingsWindow(_features.Features, layout);

        LoggerInstance.Msg($"Pocket Compendium {Info.Version}, build {ModBuild.Commit(typeof(PocketCompendiumMod).Assembly)}. Switched on: {_features.SwitchedOn()}. {layout.SettingsKey.Value} opens the settings.");
    }

    public override void OnUpdate()
    {
        Overlay.Update();

        // The window updates first, so a click on it never reaches a panel below.
        _settings.Update();
        // The tracker refreshes before the features that read it.
        _tracker.Update(_features.TrackerWanted);
        _features.Update();
    }

    public override void OnSceneWasUnloaded(int buildIndex, string sceneName)
    {
        _tracker.EndSession();
        _features.OnSceneUnloaded(sceneName);
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
