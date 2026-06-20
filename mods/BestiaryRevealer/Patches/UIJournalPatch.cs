using HarmonyLib;
using Il2Cpp;

namespace BestiaryRevealer.Patches;

[HarmonyPatch(typeof(UIJournal), "OpenBestiary")]
internal static class UIJournalPatch
{
    [HarmonyPrefix]
    private static void AddMissingBestiaryEntriesBeforeOpen()
    {
        BestiaryListAugmenter.AddLoadedMissingEntries();
    }
}
