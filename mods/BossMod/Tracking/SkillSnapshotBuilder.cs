using BossMod.Core.Catalog;
using Il2Cpp;
using CatalogDamageType = global::BossMod.Core.Catalog.DamageType;

namespace BossMod.Tracking;

/// <summary>
/// IL2CPP adapter that pulls fields out of the live <c>Il2Cpp.Skill</c>
/// (level + ScriptableSkill data) into the pure <see cref="SkillSnapshot"/>.
///
/// IL2CPP rules:
///   - Use <c>TryCast&lt;T&gt;()</c> for subclass detection (C# `is` patterns
///     do not follow IL2CPP wrapper-proxy inheritance reliably). Mirror the
///     precedence pattern from <c>mods/DataExporter/Exporters/SkillExporter.cs</c>.
///   - Use <c>.Get(level)</c> on <c>LinearInt</c>/<c>LinearFloat</c>; the bare
///     <c>baseValue</c> is unreliable across patches that scale per-level.
/// </summary>
internal static class SkillSnapshotBuilder
{
    public static SkillSnapshot Build(Skill skill)
    {
        var data = skill.data;
        int level = skill.level;

        var snap = new SkillSnapshot
        {
            SkillClass = ClassifyClass(data),
            IsSpell = data.isSpell,
            CastTime = data.castTime.Get(level),
            Cooldown = data.cooldown.Get(level),
            CastRange = data.castRange.Get(level),
        };

        if (data.TryCast<AreaDamageSkill>() is { } area)
        {
            snap.RawDamage = area.damage.Get(level);
            snap.DamagePercent = area.damagePercent.Get(level);
            snap.DamageType = MapDamageType(area.damageType);
            snap.AoeRadius = area.castRange.Get(level);
            snap.StunChance = area.stunChance.Get(level);
            snap.StunTime = area.stunTime.Get(level);
            snap.FearChance = area.fearChance.Get(level);
            snap.FearTime = area.fearTime.Get(level);
            if (snap.StunChance > 0 && snap.StunTime > 0) snap.Debuffs |= DebuffKind.Stun;
            if (snap.FearChance > 0 && snap.FearTime > 0) snap.Debuffs |= DebuffKind.Fear;
        }
        else if (data.TryCast<AreaObjectSpawnSkill>() is { } aos)
        {
            snap.RawDamage = aos.damage.Get(level);
            snap.DamagePercent = aos.damagePercent.Get(level);
            snap.DamageType = MapDamageType(aos.damageType);
            snap.AoeRadius = aos.sizeObject;
            snap.AoeDelay = aos.delayDamage;
        }
        else if (data.TryCast<TargetProjectileSkill>() is { } tp)
        {
            snap.RawDamage = tp.damage.Get(level);
            snap.DamagePercent = tp.damagePercent.Get(level);
            snap.DamageType = MapDamageType(tp.damageType);
        }
        else if (data.TryCast<TargetDamageSkill>() is { } td)
        {
            snap.RawDamage = td.damage.Get(level);
            snap.DamagePercent = td.damagePercent.Get(level);
            snap.DamageType = MapDamageType(td.damageType);
        }
        else if (data.TryCast<AreaBuffSkill>() is { } area_buff)
        {
            // isAura lives on AreaBuffSkill, NOT BuffSkill. server-scripts/AreaBuffSkill.cs:10
            // vs BuffSkill.cs. Plan was wrong here.
            snap.IsAura = area_buff.isAura;
            ApplyBuffDebuffFlags(area_buff, snap);
        }
        else if (data.TryCast<BuffSkill>() is { } bf)
        {
            ApplyBuffDebuffFlags(bf, snap);
        }

        return snap;
    }

    private static void ApplyBuffDebuffFlags(BuffSkill bf, SkillSnapshot snap)
    {
        if (bf.isPoisonDebuff)  snap.Debuffs |= DebuffKind.Poison;
        if (bf.isDiseaseDebuff) snap.Debuffs |= DebuffKind.Disease;
        if (bf.isFireDebuff)    snap.Debuffs |= DebuffKind.Fire;
        if (bf.isColdDebuff)    snap.Debuffs |= DebuffKind.Cold;
        if (bf.isBlindness)     snap.Debuffs |= DebuffKind.Blindness;
    }

    private static string ClassifyClass(ScriptableSkill skill)
    {
        // Order matters — match most-specific subclass first.
        if (skill.TryCast<AreaObjectSpawnSkill>()  != null) return "AreaObjectSpawnSkill";
        if (skill.TryCast<AreaDamageSkill>()       != null) return "AreaDamageSkill";
        if (skill.TryCast<FrontalDamageSkill>()    != null) return "FrontalDamageSkill";
        if (skill.TryCast<FrontalProjectilesSkill>() != null) return "FrontalProjectilesSkill";
        if (skill.TryCast<TargetProjectileSkill>() != null) return "TargetProjectileSkill";
        if (skill.TryCast<TargetDamageSkill>()     != null) return "TargetDamageSkill";
        if (skill.TryCast<DamageSkill>()           != null) return "DamageSkill";
        if (skill.TryCast<AreaDebuffSkill>()       != null) return "AreaDebuffSkill";
        if (skill.TryCast<TargetDebuffSkill>()     != null) return "TargetDebuffSkill";
        if (skill.TryCast<AreaBuffSkill>()         != null) return "AreaBuffSkill";
        if (skill.TryCast<TargetBuffSkill>()       != null) return "TargetBuffSkill";
        if (skill.TryCast<BuffSkill>()             != null) return "BuffSkill";
        if (skill.TryCast<AreaHealSkill>()         != null) return "AreaHealSkill";
        if (skill.TryCast<TargetHealSkill>()       != null) return "TargetHealSkill";
        if (skill.TryCast<HealSkill>()             != null) return "HealSkill";
        if (skill.TryCast<PassiveSkill>()          != null) return "PassiveSkill";
        if (skill.TryCast<SummonSkillMonsters>()   != null) return "SummonSkillMonsters";
        if (skill.TryCast<SummonSkill>()           != null) return "SummonSkill";
        return "ScriptableSkill";
    }

    private static CatalogDamageType MapDamageType(Il2Cpp.DamageType dt) => dt switch
    {
        Il2Cpp.DamageType.Magic   => CatalogDamageType.Magic,
        Il2Cpp.DamageType.Fire    => CatalogDamageType.Fire,
        Il2Cpp.DamageType.Cold    => CatalogDamageType.Cold,
        Il2Cpp.DamageType.Poison  => CatalogDamageType.Poison,
        Il2Cpp.DamageType.Disease => CatalogDamageType.Disease,
        _                         => CatalogDamageType.Normal,
    };
}
