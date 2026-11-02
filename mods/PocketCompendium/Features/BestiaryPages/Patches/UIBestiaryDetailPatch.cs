using System;
using HarmonyLib;
using Il2Cpp;

namespace PocketCompendium.Features.BestiaryPages.Patches;

// An exception in a patch reaches the game, which logs it on every frame. So a failure while
// drawing one page leaves that page to the game, and any other failure stops the feature.
[HarmonyPatch(typeof(UIBestiaryDetail), "Update")]
internal static class UIBestiaryDetailPatch
{
    // The game's update hides undiscovered pages and toggles the loot tooltips off, which cancels
    // a pending hover tooltip, so it runs only for pages Pocket Compendium does not draw. While
    // the feature is off, Draws is false for every page and the game draws them all.
    [HarmonyPrefix]
    private static bool RunGameUpdateOnlyForPagesTheModDoesNotDraw(UIBestiaryDetail __instance)
    {
        try
        {
            return !BestiaryPagesFeature.Draws(__instance.monster);
        }
        catch (Exception ex)
        {
            BestiaryPagesFeature.ReportFailure(ex);
            return true;
        }
    }

    [HarmonyPostfix]
    private static void DrawAfterGameUpdate(UIBestiaryDetail __instance)
    {
        if (BestiaryPagesFeature.Active) Draw(__instance);
    }

    internal static void Draw(UIBestiaryDetail __instance)
    {
        try
        {
            var monster = __instance.monster;
            if (!BestiaryPagesFeature.Draws(monster))
            {
                LeaveToGame(__instance);
                return;
            }

            try
            {
                Ui.BestiaryDetailRenderer.Reveal(__instance);
                bool skills = Ui.SkillsPanelController.OnBestiaryUpdate(__instance);
                Ui.WatchButtonController.OnBestiaryUpdate(__instance, slot: skills ? 1 : 0);
            }
            catch (Exception ex)
            {
                BestiaryPagesFeature.ReportPageFailure(monster, ex);
                LeaveToGame(__instance);
            }
        }
        catch (Exception ex)
        {
            BestiaryPagesFeature.ReportFailure(ex);
        }
    }

    private static void LeaveToGame(UIBestiaryDetail detail)
    {
        Ui.BestiaryLootRenderer.RestoreGameLayout(detail);
        Ui.SkillsPanelController.Hide();
        Ui.WatchButtonController.Hide();
    }
}
