using System;
using Il2Cpp;

namespace BetterBestiary;

internal static class BestiaryPageOpener
{
    internal static bool Open(Monster monster)
    {
        if (monster == null || string.IsNullOrEmpty(monster.nameEntity))
            return false;

        try
        {
            return OpenCore(monster);
        }
        catch (Exception ex)
        {
            BetterBestiary.LogWarning($"Could not open Bestiary details for '{monster.nameEntity}': {ex.Message}");
            return false;
        }
    }

    private static bool OpenCore(Monster monster)
    {
        var journal = UIJournal.singleton;
        var detail = UIBestiaryDetail.singleton;
        if (journal == null || journal.panel == null || detail == null)
            return false;

        // OpenBestiary replaces the page with the player's boss or elite target, so the monster
        // is set again afterwards. A monster outside the Bestiary list still gets its page.
        detail.monster = monster;
        journal.OpenBestiary();
        detail.monster = monster;
        if (journal.rectTransformJournal != null)
            journal.rectTransformJournal.SetAsLastSibling();

        RefreshGridSelection(journal, monster);
        Patches.UIBestiaryDetailPatch.Draw(detail);
        return true;
    }

    private static void RefreshGridSelection(UIJournal journal, Monster selectedMonster)
    {
        var gameManager = GameManager.singleton;
        if (gameManager == null || gameManager.elitesBosses == null || journal.content == null || journal.slotPrefab == null)
            return;

        UIUtils.BalancePrefabs(journal.slotPrefab.gameObject, gameManager.elitesBosses.Count, journal.content);
        for (var i = 0; i < gameManager.elitesBosses.Count && i < journal.content.childCount; i++)
        {
            var slot = journal.content.GetChild(i).GetComponent<UIJournalSlot>();
            if (slot == null)
                continue;

            var monster = gameManager.elitesBosses[i];
            if (slot.frameSelected != null)
                slot.frameSelected.enabled = monster != null && monster.nameEntity == selectedMonster.nameEntity;
        }
    }
}
