using System.Globalization;
using AncientKingdomsMods.Shared;
using Il2Cpp;
using Il2CppTMPro;
using UnityEngine;

namespace BetterBestiary.Ui;

internal static class BestiaryDetailRenderer
{
    private const string NoKillCount = "<color=#808080>-</color>";

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
            SetLocalizedText(detail.nameBoss, GameText.MonsterName(monster));
            detail.nameBoss.color = MonsterNameColor(monster);
        }

        SetLocalizedText(detail.levelBoss, GameText.Level(monster.level.current));
        SetLocalizedText(detail.loreBoss, GameText.WithEntityNames(monster.loreBoss));
        SetText(detail.hpBoss, FormatHealth(monster.health.max));
        SetText(detail.armorBoss, monster.combat.defense.ToString());
        SetText(detail.magicResistanceBoss, monster.combat.magicResist.ToString());
        SetText(detail.poisonResistanceBoss, monster.combat.poisonResist.ToString());
        SetText(detail.fireResistanceBoss, monster.combat.fireResist.ToString());
        SetText(detail.coldResistanceBoss, monster.combat.coldResist.ToString());
        SetText(detail.diseaseResistanceBoss, monster.combat.diseaseResist.ToString());
        SetText(detail.typeBoss, monster.typeMonster);
        SetLocalizedText(detail.classBoss, GameText.ClassName(monster.classMonster));
        SetLocalizedText(detail.zoneBoss, GameText.ZoneName(monster.zoneMonster, monster.idZone));
        SetText(detail.kills, KillText(monster));

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

    // Same rule as the game's page (UIBestiaryDetail.Update), with the game's group separator.
    // Utils.nfi is an IL2CPP NumberFormatInfo, which managed formatting cannot take directly.
    private static string FormatHealth(long health)
    {
        var shown = health > 10000 ? health / 1000 : health;
        var digits = shown.ToString("N0", CultureInfo.InvariantCulture).Replace(",", Utils.nfi.NumberGroupSeparator);
        return health > 10000 ? digits + "K" : digits;
    }

    // The game counts kills only for bosses, elites and fabled monsters (Player.TargetRpcUpdateKillsBestiary),
    // so any other monster gets no number rather than a misleading 0.
    private static string KillText(Monster monster)
    {
        if (!monster.isBoss && !monster.isElite && !monster.isFabled)
            return NoKillCount;

        var player = Player.localPlayer;
        if (player != null && player.bossesKilled.TryGetValue(monster.nameEntity, out var kills) && kills > 0)
            return $"<color=green>{kills}</color>";

        return "<color=red>0</color>";
    }

    // Text that can be Chinese or Japanese needs the game's CJK font, which it applies the same way.
    private static void SetLocalizedText(TextMeshProUGUI text, string value)
    {
        if (text == null)
            return;
        GameText.ApplyFont(text);
        text.text = value ?? string.Empty;
    }

    private static void SetText(TextMeshProUGUI text, string value)
    {
        if (text != null)
            text.text = value ?? string.Empty;
    }
}
