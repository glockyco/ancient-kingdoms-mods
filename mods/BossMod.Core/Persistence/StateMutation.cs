using System.Collections.Generic;
using BossMod.Core.Catalog;

namespace BossMod.Core.Persistence;

public static class StateMutation
{
    public static bool ApplyLoadedStateInPlace(
        SkillCatalog targetCatalog,
        Globals targetGlobals,
        SkillCatalog loadedCatalog,
        Globals loadedGlobals)
    {
        bool changed = !CatalogsEqual(targetCatalog, loadedCatalog) || !GlobalsEqual(targetGlobals, loadedGlobals);
        if (!changed) return false;

        CopyCatalog(targetCatalog, loadedCatalog);
        CopyGlobals(targetGlobals, loadedGlobals);
        return true;
    }

    public static bool ResetUserSettingsToDefaults(SkillCatalog catalog, Globals globals)
    {
        bool changed = !GlobalsEqual(globals, new Globals());

        foreach (var skill in catalog.Skills.Values)
        {
            changed |= skill.UserThreat.HasValue || skill.CastBarVisibility.HasValue || skill.BossAbilityVisibility.HasValue;
            skill.UserThreat = null;
            skill.CastBarVisibility = null;
            skill.BossAbilityVisibility = null;
        }

        foreach (var boss in catalog.Bosses.Values)
        {
            foreach (var bossSkill in boss.Skills.Values)
            {
                changed |= bossSkill.UserThreat.HasValue || bossSkill.CastBarVisibility.HasValue || bossSkill.BossAbilityVisibility.HasValue;
                bossSkill.UserThreat = null;
                bossSkill.CastBarVisibility = null;
                bossSkill.BossAbilityVisibility = null;
            }
        }

        CopyGlobals(globals, new Globals());
        return changed;
    }

    private static void CopyCatalog(SkillCatalog target, SkillCatalog source)
    {
        target.Skills.Clear();
        foreach (var entry in source.Skills) target.Skills[entry.Key] = entry.Value;

        target.Bosses.Clear();
        foreach (var entry in source.Bosses) target.Bosses[entry.Key] = entry.Value;
    }

    private static void CopyGlobals(Globals target, Globals source)
    {
        target.Thresholds ??= new Thresholds();
        target.Thresholds.CriticalDamage = source.Thresholds.CriticalDamage;
        target.Thresholds.HighDamage = source.Thresholds.HighDamage;
        target.Thresholds.AuraDpsHigh = source.Thresholds.AuraDpsHigh;
        target.Thresholds.CriticalCastTime = source.Thresholds.CriticalCastTime;

        target.ProximityRadius = source.ProximityRadius;
        target.UiScale = source.UiScale;
        target.MaxCastBars = source.MaxCastBars;
        target.BossAbilitiesDensity = source.BossAbilitiesDensity;
        target.ShowCastBarWindow = source.ShowCastBarWindow;
        target.ShowBossAbilitiesWindow = source.ShowBossAbilitiesWindow;
        target.ConfigMode = source.ConfigMode;

        target.Hotkeys ??= new Dictionary<string, string>();
        target.Hotkeys.Clear();
        foreach (var entry in source.Hotkeys) target.Hotkeys[entry.Key] = entry.Value;
    }

    private static bool CatalogsEqual(SkillCatalog a, SkillCatalog b)
    {
        if (a.Skills.Count != b.Skills.Count || a.Bosses.Count != b.Bosses.Count) return false;

        foreach (var entry in a.Skills)
        {
            if (!b.Skills.TryGetValue(entry.Key, out var other)) return false;
            if (!SkillsEqual(entry.Value, other)) return false;
        }

        foreach (var entry in a.Bosses)
        {
            if (!b.Bosses.TryGetValue(entry.Key, out var other)) return false;
            if (!BossesEqual(entry.Value, other)) return false;
        }

        return true;
    }

    private static bool GlobalsEqual(Globals a, Globals b) =>
        ThresholdsEqual(a.Thresholds, b.Thresholds) &&
        a.ProximityRadius == b.ProximityRadius &&
        a.UiScale == b.UiScale &&
        a.MaxCastBars == b.MaxCastBars &&
        a.BossAbilitiesDensity == b.BossAbilitiesDensity &&
        a.ShowCastBarWindow == b.ShowCastBarWindow &&
        a.ShowBossAbilitiesWindow == b.ShowBossAbilitiesWindow &&
        a.ConfigMode == b.ConfigMode &&
        DictionariesEqual(a.Hotkeys, b.Hotkeys);

    private static bool SkillsEqual(SkillRecord a, SkillRecord b) =>
        a.Id == b.Id &&
        a.DisplayName == b.DisplayName &&
        a.FirstSeenUtc == b.FirstSeenUtc &&
        a.LastSeenInBoss == b.LastSeenInBoss &&
        SkillSnapshotsEqual(a.RawSnapshot, b.RawSnapshot) &&
        a.UserThreat == b.UserThreat &&
        a.CastBarVisibility == b.CastBarVisibility &&
        a.BossAbilityVisibility == b.BossAbilityVisibility;

    private static bool BossesEqual(BossRecord a, BossRecord b)
    {
        if (a.Id != b.Id ||
            a.DisplayName != b.DisplayName ||
            a.Type != b.Type ||
            a.Class != b.Class ||
            a.ZoneBestiary != b.ZoneBestiary ||
            a.Kind != b.Kind ||
            a.LastSeenLevel != b.LastSeenLevel ||
            a.FirstSeenUtc != b.FirstSeenUtc ||
            a.LastSeenUtc != b.LastSeenUtc ||
            a.Skills.Count != b.Skills.Count)
        {
            return false;
        }

        foreach (var entry in a.Skills)
        {
            if (!b.Skills.TryGetValue(entry.Key, out var other)) return false;
            if (!BossSkillsEqual(entry.Value, other)) return false;
        }

        return true;
    }

    private static bool BossSkillsEqual(BossSkillRecord a, BossSkillRecord b) =>
        a.SkillIndex == b.SkillIndex &&
        BossSkillSnapshotsEqual(a.EffectiveSnapshot, b.EffectiveSnapshot) &&
        a.AutoThreat == b.AutoThreat &&
        a.UserThreat == b.UserThreat &&
        a.CastBarVisibility == b.CastBarVisibility &&
        a.BossAbilityVisibility == b.BossAbilityVisibility &&
        a.LastObservedUtc == b.LastObservedUtc;

    private static bool SkillSnapshotsEqual(SkillSnapshot a, SkillSnapshot b) =>
        a.SkillClass == b.SkillClass &&
        a.IsSpell == b.IsSpell &&
        a.IsAura == b.IsAura &&
        a.CastTime == b.CastTime &&
        a.Cooldown == b.Cooldown &&
        a.CastRange == b.CastRange &&
        a.RawDamage == b.RawDamage &&
        a.RawMagicDamage == b.RawMagicDamage &&
        a.DamagePercent == b.DamagePercent &&
        a.DamageType == b.DamageType &&
        a.AoeRadius == b.AoeRadius &&
        a.AoeDelay == b.AoeDelay &&
        a.Debuffs == b.Debuffs &&
        a.StunChance == b.StunChance &&
        a.StunTime == b.StunTime &&
        a.FearChance == b.FearChance &&
        a.FearTime == b.FearTime;

    private static bool BossSkillSnapshotsEqual(BossSkillSnapshot a, BossSkillSnapshot b) =>
        a.OutgoingDamage == b.OutgoingDamage &&
        a.OutgoingDamageMin == b.OutgoingDamageMin &&
        a.OutgoingDamageMax == b.OutgoingDamageMax &&
        a.AuraDpsApprox == b.AuraDpsApprox &&
        a.CastTimeEffective == b.CastTimeEffective &&
        a.CooldownEffective == b.CooldownEffective &&
        a.ComputedAtUtc == b.ComputedAtUtc;

    private static bool ThresholdsEqual(Thresholds a, Thresholds b) =>
        a.CriticalDamage == b.CriticalDamage &&
        a.HighDamage == b.HighDamage &&
        a.AuraDpsHigh == b.AuraDpsHigh &&
        a.CriticalCastTime == b.CriticalCastTime;

    private static bool DictionariesEqual(Dictionary<string, string> a, Dictionary<string, string> b)
    {
        if (a.Count != b.Count) return false;
        foreach (var entry in a)
        {
            if (!b.TryGetValue(entry.Key, out var value)) return false;
            if (entry.Value != value) return false;
        }
        return true;
    }
}
