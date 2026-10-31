using System;
using HarmonyLib;
using Il2Cpp;

namespace PocketCompendium.Features.BestiaryPages.Patches;

[HarmonyPatch(typeof(UIBestiaryDetail), "Update")]
internal static class UIBestiaryDetailPatch
{
    // The game's update hides undiscovered pages and toggles the loot tooltips off, which cancels
    // a pending hover tooltip, so it runs only for pages Pocket Compendium does not draw. While
    // the feature is off, Draws is false for every page and the game draws them all.
    [HarmonyPrefix]
    private static bool RunGameUpdateOnlyForPagesTheModDoesNotDraw(UIBestiaryDetail __instance) =>
        !BestiaryPagesFeature.Draws(__instance.monster);

    [HarmonyPostfix]
    private static void DrawAfterGameUpdate(UIBestiaryDetail __instance)
    {
        if (BestiaryPagesFeature.Active) Draw(__instance);
    }

    internal static void Draw(UIBestiaryDetail __instance)
    {
        var monster = __instance.monster;
        if (!BestiaryPagesFeature.Draws(monster))
        {
            Ui.BestiaryLootRenderer.RestoreGameLayout(__instance);
            Ui.SkillsPanelController.Hide();
            return;
        }

        try
        {
            Ui.BestiaryDetailRenderer.Reveal(__instance);
            Ui.SkillsPanelController.OnBestiaryUpdate(__instance);
        }
        catch (Exception ex)
        {
            BestiaryPagesFeature.ReportPageFailure(monster, ex);
            Ui.BestiaryLootRenderer.RestoreGameLayout(__instance);
            Ui.SkillsPanelController.Hide();
        }
    }
}
