using System;
using Il2Cpp;

namespace BestiaryRevealer;

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
            BestiaryRevealer.LogWarning($"Could not open Bestiary details for '{monster.nameEntity}': {ex.Message}");
            return false;
        }
    }

    private static bool OpenCore(Monster monster)
    {
        var journal = UIJournal.singleton;
        var detail = UIBestiaryDetail.singleton;
        if (journal == null || journal.panel == null || detail == null)
            return false;

        if (IsUniqueBestiaryMonster(monster))
            EnsureBestiaryEntry(monster);

        journal.currentTab = "Bestiary";
        journal.panel.SetActive(true);

        var skillbar = UISkillbar.singleton;
        if (skillbar != null && skillbar.outlineJournalButton != null)
            skillbar.outlineJournalButton.SetActive(false);

        detail.monster = monster;
        RefreshGridSelection(journal, monster);
        Ui.BestiaryDetailRenderer.Reveal(detail);
        return true;
    }

    private static bool IsUniqueBestiaryMonster(Monster monster)
    {
        return monster.isBoss || monster.isElite || monster.isFabled;
    }

    private static void EnsureBestiaryEntry(Monster monster)
    {
        var gameManager = GameManager.singleton;
        if (gameManager == null || gameManager.elitesBosses == null)
            return;

        foreach (var existing in gameManager.elitesBosses)
        {
            if (existing != null && existing.nameEntity == monster.nameEntity)
                return;
        }

        gameManager.elitesBosses.Add(monster);
        BestiaryRevealer.LogMessage($"Added '{monster.nameEntity}' to the Bestiary list for Alt+Click selection.");
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

        Ui.BestiaryGridRenderer.ApplyFallbackIcons(journal);
    }
}
