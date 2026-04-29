using System;
using BossMod.Core.Catalog;

namespace BossMod.Core.Effects;

/// <summary>
/// Pure formulas — no side effects, deterministic, no IL2CPP types.
/// Locked against server-scripts/Combat.cs and server-scripts/Skills.cs.
/// </summary>
public static class EffectiveValues
{
    /// <summary>
    /// Outgoing damage = casterBase + skillAdditive, optionally times damagePercent.
    /// Caller picks which caster-base scalar to pass (combat.damage vs
    /// combat.magicDamage), so this function stays type-agnostic. For skills like
    /// AreaObjectSpawnSkill that don't add caster base, pass casterBase: 0.
    /// </summary>
    /// <remarks>
    /// Reference: server-scripts/AreaDamageSkill.cs lines 95-114
    ///   int num2 = (damageType is Magic|Fire|Cold|Disease) ? combat.magicDamage : combat.damage;
    ///   int num3 = num2 + damage.Get(skillLevel);
    ///   if (damagePercent.Get(skillLevel) > 0f)
    ///       num3 = Mathf.RoundToInt(num3 * damagePercent.Get(skillLevel));
    /// </remarks>
    public static int OutgoingDamage(int skillAdditive, float damagePercent, int casterBase)
    {
        int raw = casterBase + skillAdditive;
        return damagePercent > 0f ? (int)Math.Round(raw * damagePercent) : raw;
    }

    public static (int Min, int Max) OutgoingDamageRange(int outgoing) =>
        ((int)Math.Round(outgoing * 0.9f), (int)Math.Round(outgoing * 1.1f));

    public static float CastTimeEffective(float rawCastTime, bool isSpell, float spellHasteBonus) =>
        isSpell ? rawCastTime - rawCastTime * spellHasteBonus : rawCastTime;

    /// <summary>
    /// Effective cooldown WITH haste applied. Use only for skills the server runs
    /// through the haste path: see Skills.FinishCastMeleeAttackMonster line 814.
    /// Boss special skills (Skills.FinishCast lines 767-772) do NOT apply haste —
    /// the synced cooldownEnd uses raw cooldown. For special skills, snapshot
    /// builders should pass the raw value through and skip this helper.
    /// </summary>
    public static float CooldownEffectiveWithHaste(float rawCooldown, float hasteBonus) =>
        rawCooldown * (1f - hasteBonus);

    /// <summary>
    /// Approximate aura/DoT-debuff DPS contribution. Mirrors the bonus formula in
    /// server-scripts/Skills.cs:GetHealthRecoveryBonus (lines 165-183).
    /// </summary>
    public static int AuraDpsApprox(int healingPerSecondBonus, int casterAttribute)
    {
        int abs = Math.Abs(healingPerSecondBonus);
        int bonus = (int)Math.Round(casterAttribute * 0.004f * abs);
        return abs + bonus;
    }
}
