using AncientKingdomsMods.Shared;
using MelonLoader;
using PocketCompendium.Core;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BestiaryPages;
using PocketCompendium.Features.BossSkills;

[assembly: MelonInfo(typeof(PocketCompendium.PocketCompendiumMod), "Pocket Compendium", "1.0.0", "WoW_Much")]
[assembly: MelonGame("ancientpixels", "ancientkingdoms")]
[assembly: HarmonyDontPatchAll]

namespace PocketCompendium;

public sealed class PocketCompendiumMod : MelonMod
{
    private FeatureRegistry _features;

    public override void OnInitializeMelon()
    {
        Log.Initialize(LoggerInstance);
        Patching.Initialize(HarmonyInstance);

        _features = new FeatureRegistry();
        _features.Add(new BossSkillsFeature());
        _features.Add(new BestiaryPagesFeature());

        LoggerInstance.Msg($"Pocket Compendium {Info.Version}, build {ModBuild.Commit(typeof(PocketCompendiumMod).Assembly)}. Switched on: {_features.SwitchedOn()}");
    }

    public override void OnUpdate() => _features.Update();

    public override void OnSceneWasUnloaded(int buildIndex, string sceneName) => _features.OnSceneUnloaded(sceneName);

    public override void OnDeinitializeMelon()
    {
        _features.StopAll();
        Icons.Dispose();
        Theme.Dispose();
    }
}
