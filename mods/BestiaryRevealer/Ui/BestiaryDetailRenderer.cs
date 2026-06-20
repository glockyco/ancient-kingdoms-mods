using System.Globalization;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;

namespace BestiaryRevealer.Ui;

internal static class BestiaryDetailRenderer
{
    internal static void Reveal(UIBestiaryDetail detail)
    {
        var journal = UIJournal.singleton;
        if (detail == null ||
            detail.monster == null ||
            detail.gameObject == null ||
            !detail.gameObject.activeInHierarchy ||
            journal == null ||
            journal.panel == null ||
            !journal.panel.activeSelf ||
            journal.currentTab != "Bestiary")
            return;

        var monster = detail.monster;

        if (detail.imageBoss != null)
        {
            detail.imageBoss.sprite = BestiaryMonsterSprites.DetailSpriteFor(monster, out var imageColor);
            detail.imageBoss.color = imageColor;
        }

        if (detail.nameBoss != null)
        {
            detail.nameBoss.text = monster.nameEntity;
            detail.nameBoss.color = MonsterNameColor(monster);
        }

        SetText(detail.levelBoss, "Level " + monster.level.current);
        SetText(detail.loreBoss, monster.loreBoss);
        SetText(detail.hpBoss, FormatHealth(monster.health.max));
        SetText(detail.armorBoss, monster.combat.defense.ToString());
        SetText(detail.magicResistanceBoss, monster.combat.magicResist.ToString());
        SetText(detail.poisonResistanceBoss, monster.combat.poisonResist.ToString());
        SetText(detail.fireResistanceBoss, monster.combat.fireResist.ToString());
        SetText(detail.coldResistanceBoss, monster.combat.coldResist.ToString());
        SetText(detail.diseaseResistanceBoss, monster.combat.diseaseResist.ToString());
        SetText(detail.typeBoss, monster.typeMonster);
        SetText(detail.classBoss, monster.classMonster);
        SetText(detail.zoneBoss, monster.zoneMonster);

        BestiaryLootRenderer.Reveal(detail, monster);
    }

    private static Color MonsterNameColor(Monster monster)
    {
        if (monster.isFabled)
            return Utils.fabledMonsterColor;

        if (monster.isBoss)
            return Utils.bossMonsterColor;
        if (monster.isElite)
            return Utils.eliteMonsterColor;
        return monster.noAggroMonster ? Utils.noAggroMonsterColor : Utils.normalMonsterColor;
    }

    private static string FormatHealth(long health)
    {
        return health > 10000
            ? (health / 1000).ToString("N0", CultureInfo.InvariantCulture) + "K"
            : health.ToString("N0", CultureInfo.InvariantCulture);
    }

    private static void SetText(TextMeshProUGUI text, string value)
    {
        if (text != null)
            text.text = value ?? string.Empty;
    }
}
