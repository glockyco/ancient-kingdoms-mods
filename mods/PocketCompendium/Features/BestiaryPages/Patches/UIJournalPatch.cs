using System;
using HarmonyLib;
using Il2Cpp;
using PocketCompendium.Core.Tracking;

namespace PocketCompendium.Features.BestiaryPages.Patches;

// Source: UIJournal.cs:Update sets every tile's colour on every frame while the Bestiary shows,
// black for a monster without an entry in Player.bossesKilled. A postfix runs after that write in
// the same frame, so an undiscovered tile never flickers back to black.
[HarmonyPatch(typeof(UIJournal), "Update")]
internal static class UIJournalPatch
{
    [HarmonyPostfix]
    private static void ShowUndiscoveredPortraits(UIJournal __instance)
    {
        if (!BestiaryPagesFeature.Active) return;
        try
        {
            if (__instance.panel == null || !__instance.panel.activeSelf || __instance.currentTab != "Bestiary")
                return;

            var monsters = GameManager.singleton.elitesBosses;
            int count = Math.Min(monsters.Count, __instance.content.childCount);
            for (int index = 0; index < count; index++)
            {
                var monster = monsters[index];
                if (monster == null || Discovery.Known(monster.nameEntity) || !Discovery.Shown(monster.nameEntity))
                    continue;
                var slot = __instance.content.GetChild(index).GetComponent<UIJournalSlot>();
                // The game's own grey for a monster seen but never killed.
                if (slot != null && slot.image != null) slot.image.color = UIJournal.itemDiscoveredColor;
            }
        }
        catch (Exception ex)
        {
            BestiaryPagesFeature.ReportFailure(ex);
        }
    }
}
