using System;
using HarmonyLib;
using Il2Cpp;

namespace BestiaryRevealer.Patches;

[HarmonyPatch(typeof(UIBestiaryDetail), "Update")]
internal static class UIBestiaryDetailPatch
{
    [HarmonyPostfix]
    private static void RevealAfterVanillaUpdate(UIBestiaryDetail __instance)
    {
        if (BestiaryRevealer.IsPatchDisabled)
            return;

        try
        {
            Ui.BestiaryDetailRenderer.Reveal(__instance);
        }
        catch (Exception ex)
        {
            BestiaryRevealer.ReportPatchException(ex);
        }
    }
}
