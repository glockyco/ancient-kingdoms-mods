using System;
using Il2Cpp;
using UnityEngine;

namespace BestiaryRevealer.Ui;

internal static class BestiaryGridRenderer
{
    internal static void ApplyFallbackIcons(UIJournal journal)
    {
        if (journal == null || journal.currentTab != "Bestiary" || journal.content == null)
            return;

        var gameManager = GameManager.singleton;
        if (gameManager == null || gameManager.elitesBosses == null)
            return;

        var count = Math.Min(gameManager.elitesBosses.Count, journal.content.childCount);
        for (var i = 0; i < count; i++)
        {
            var monster = gameManager.elitesBosses[i];
            if (monster == null || monster.portraitBoss != null)
                continue;

            var slot = journal.content.GetChild(i).GetComponent<UIJournalSlot>();
            if (slot == null || slot.image == null)
                continue;

            slot.image.sprite = BestiaryMonsterSprites.GridSpriteFor(monster, out var imageColor);
            slot.image.color = imageColor;
        }
    }
}
