using System;
using HarmonyLib;
using Il2Cpp;

namespace BetterBestiary.Patches;

[HarmonyPatch(typeof(UIBestiaryDetail), "Update")]
internal static class UIBestiaryDetailPatch
{
    // The game's update hides undiscovered pages and toggles the loot tooltips off, which cancels
    // a pending hover tooltip, so it runs only for pages Better Bestiary does not draw.
    [HarmonyPrefix]
    private static bool RunGameUpdateOnlyForPagesTheModDoesNotDraw(UIBestiaryDetail __instance) =>
        !BetterBestiary.Draws(__instance.monster);

    [HarmonyPostfix]
    private static void DrawAfterGameUpdate(UIBestiaryDetail __instance) => Draw(__instance);

    internal static void Draw(UIBestiaryDetail __instance)
    {
        var monster = __instance.monster;
        if (!BetterBestiary.Draws(monster))
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
            BetterBestiary.ReportPageFailure(monster, ex);
            Ui.BestiaryLootRenderer.RestoreGameLayout(__instance);
            Ui.SkillsPanelController.Hide();
        }
    }
}
