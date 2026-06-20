using System;
using Il2Cpp;
using UnityEngine;

namespace BestiaryRevealer.Ui;

internal static class BestiaryGridRenderer
{
    private static readonly Color BlankIconColor = new(0.45f, 0.45f, 0.45f, 0.85f);
    private static Sprite _blankMonsterSprite;

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

            slot.image.sprite = monster.imageBossBestiary ?? BlankMonsterSprite();
            if (monster.imageBossBestiary == null)
                slot.image.color = BlankIconColor;
        }
    }

    private static Sprite BlankMonsterSprite()
    {
        if (_blankMonsterSprite != null)
            return _blankMonsterSprite;

        var texture = new Texture2D(1, 1);
        texture.SetPixel(0, 0, Color.white);
        texture.Apply();
        _blankMonsterSprite = Sprite.Create(texture, new Rect(0f, 0f, 1f, 1f), new Vector2(0.5f, 0.5f));
        return _blankMonsterSprite;
    }
}
