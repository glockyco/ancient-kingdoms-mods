using System;
using HarmonyLib;
using Il2Cpp;

namespace BetterBestiary.Patches;

[HarmonyPatch(typeof(UIBestiaryDetail), "Update")]
internal static class UIBestiaryDetailPatch
{
    [HarmonyPostfix]
    private static void RevealAfterVanillaUpdate(UIBestiaryDetail __instance)
    {
        if (BetterBestiary.IsPatchDisabled)
            return;

        try
        {
            Ui.BestiaryDetailRenderer.Reveal(__instance);
            Ui.SkillsPanelController.OnBestiaryUpdate(__instance);
        }
        catch (Exception ex)
        {
            BetterBestiary.ReportPatchException(ex);
        }
    }
}
