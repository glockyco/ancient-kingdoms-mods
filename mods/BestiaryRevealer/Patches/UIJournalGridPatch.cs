using System;
using HarmonyLib;
using Il2Cpp;

namespace BestiaryRevealer.Patches;

[HarmonyPatch(typeof(UIJournal), "Update")]
internal static class UIJournalGridPatch
{
    [HarmonyPostfix]
    private static void ApplyBestiaryIconFallbacksAfterUpdate(UIJournal __instance)
    {
        try
        {
            Ui.BestiaryGridRenderer.ApplyFallbackIcons(__instance);
        }
        catch (Exception ex)
        {
            BestiaryRevealer.LogWarning($"Could not apply Bestiary grid icon fallbacks: {ex.Message}");
        }
    }
}
