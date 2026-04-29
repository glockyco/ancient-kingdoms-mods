using BossMod.Core.Catalog;

namespace BossMod.Core.Effects;

/// <summary>
/// Classifies a skill into a ThreatTier based on its effective values + thresholds.
/// Pure, deterministic, no I/O. Tuning of thresholds happens via the Thresholds
/// argument; rules here are the architectural baseline locked in the spec.
/// </summary>
public static class ThreatClassifier
{
    public static ThreatTier Classify(SkillSnapshot raw, BossSkillSnapshot eff, Thresholds t)
    {
        // Critical: long-cast telegraph
        if (eff.CastTimeEffective >= t.CriticalCastTime)
            return ThreatTier.Critical;

        // Critical: heavy AOE damage
        bool isArea = raw.SkillClass is "AreaDamageSkill" or "AreaObjectSpawnSkill";
        if (isArea && eff.OutgoingDamage >= t.CriticalDamage)
            return ThreatTier.Critical;

        // High: hard CC debuffs
        if ((raw.Debuffs & (DebuffKind.Stun | DebuffKind.Fear | DebuffKind.Blindness | DebuffKind.Mezz)) != 0)
            return ThreatTier.High;

        // High: significant damage (any class)
        if (eff.OutgoingDamage >= t.HighDamage)
            return ThreatTier.High;

        // High: significant aura DPS
        if (raw.IsAura && eff.AuraDpsApprox >= t.AuraDpsHigh)
            return ThreatTier.High;

        // Medium: any debuff or single-target damage
        bool isDebuff = raw.SkillClass is "AreaDebuffSkill" or "TargetDebuffSkill";
        bool isDamage = raw.SkillClass is "AreaDamageSkill" or "TargetDamageSkill" or "TargetProjectileSkill" or "AreaObjectSpawnSkill";
        if (isDebuff || isDamage)
            return ThreatTier.Medium;

        // Low: buffs, passive auras, basics
        return ThreatTier.Low;
    }
}
