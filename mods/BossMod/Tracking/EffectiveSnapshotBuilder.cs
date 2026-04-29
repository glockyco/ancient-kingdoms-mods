using System;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Il2Cpp;
using CatalogDamageType = global::BossMod.Core.Catalog.DamageType;

namespace BossMod.Tracking;

/// <summary>
/// Per-(boss, skill) effective values: caster-base damage applied + haste +
/// damageType routing. Mirrors server-scripts/AreaDamageSkill.Apply,
/// /TargetDamageSkill.Apply, /TargetProjectileSkill.Apply,
/// /AreaObjectSpawnSkill.Apply, /AreaBuffSkill.Apply.
/// </summary>
internal static class EffectiveSnapshotBuilder
{
    public static BossSkillSnapshot Build(Skill skill, Monster monster)
    {
        var data = skill.data;
        int level = skill.level;
        int casterDmg = monster.combat != null ? monster.combat.damage : 0;
        int casterMag = monster.combat != null ? monster.combat.magicDamage : 0;

        int outgoing = 0;
        int auraDps = 0;

        if (data.TryCast<AreaDamageSkill>() is { } ad)
        {
            var dt = MapDamageType(ad.damageType);
            int casterBase = IsMagicLike(dt) ? casterMag : casterDmg;
            outgoing = EffectiveValues.OutgoingDamage(
                skillAdditive: ad.damage.Get(level),
                damagePercent: ad.damagePercent.Get(level),
                casterBase: casterBase);
        }
        else if (data.TryCast<TargetProjectileSkill>() is { } tp)
        {
            var dt = MapDamageType(tp.damageType);
            int casterBase = IsMagicLike(dt) ? casterMag : casterDmg;
            outgoing = EffectiveValues.OutgoingDamage(
                skillAdditive: tp.damage.Get(level),
                damagePercent: tp.damagePercent.Get(level),
                casterBase: casterBase);
        }
        else if (data.TryCast<TargetDamageSkill>() is { } td)
        {
            // server-scripts/TargetDamageSkill.cs lines 176-208: poison routes
            // through magicDamage unless caster is a Rogue player. Monsters
            // never are, so treat poison as magic-like here too.
            var dt = MapDamageType(td.damageType);
            bool useMag = IsMagicLike(dt) || dt == CatalogDamageType.Poison;
            int casterBase = useMag ? casterMag : casterDmg;
            outgoing = EffectiveValues.OutgoingDamage(
                skillAdditive: td.damage.Get(level),
                damagePercent: td.damagePercent.Get(level),
                casterBase: casterBase);
        }
        else if (data.TryCast<AreaObjectSpawnSkill>() is { } aos)
        {
            // server-scripts/AreaObjectSpawnSkill.cs lines 113-126: server uses
            // skill.damage[level] WITHOUT adding caster base.
            outgoing = EffectiveValues.OutgoingDamage(
                skillAdditive: aos.damage.Get(level),
                damagePercent: aos.damagePercent.Get(level),
                casterBase: 0);
        }
        else if (data.TryCast<AreaBuffSkill>() is { } area_buff && area_buff.isAura)
        {
            // server-scripts/Buff.cs lines 220-225 + AreaBuffSkill.cs lines 28-32:
            // bonusAttribute is filled from the *caster's* attribute (wisdom/int/...)
            // when the buff is APPLIED. Monsters never set bonusAttribute, so for
            // monster-cast auras the bonus contribution is zero — pass 0.
            int hps = area_buff.healingPerSecondBonus.Get(level);
            auraDps = EffectiveValues.AuraDpsApprox(healingPerSecondBonus: hps, casterAttribute: 0);
        }

        var (min, max) = EffectiveValues.OutgoingDamageRange(outgoing);
        float spellHaste = monster.skills != null ? monster.skills.GetSpellHasteBonus() : 0f;
        var castTime = EffectiveValues.CastTimeEffective(
            rawCastTime: data.castTime.Get(level),
            isSpell: data.isSpell,
            spellHasteBonus: spellHaste);
        // Boss special skills do NOT get haste-applied cooldowns (see
        // server-scripts/Skills.cs lines 767-772). Use the raw cooldown.
        var cooldown = data.cooldown.Get(level);

        return new BossSkillSnapshot
        {
            OutgoingDamage = outgoing,
            OutgoingDamageMin = min,
            OutgoingDamageMax = max,
            AuraDpsApprox = auraDps,
            CastTimeEffective = castTime,
            CooldownEffective = cooldown,
            ComputedAtUtc = DateTime.UtcNow,
        };
    }

    private static bool IsMagicLike(CatalogDamageType t) => t is
        CatalogDamageType.Magic or CatalogDamageType.Fire or CatalogDamageType.Cold or CatalogDamageType.Disease;

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
