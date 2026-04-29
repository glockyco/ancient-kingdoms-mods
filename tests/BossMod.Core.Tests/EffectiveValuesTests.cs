using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using Xunit;

namespace BossMod.Core.Tests;

public class EffectiveValuesTests
{
    [Fact]
    public void OutgoingDamage_AddsCasterBaseAndSkillAdditive()
    {
        // Single additive (skill.damage.Get(level)) plus caster base; the caller
        // chooses which caster-base scalar to pass (damage vs magicDamage).
        // Server reference: AreaDamageSkill.Apply lines 95-114.
        var d = EffectiveValues.OutgoingDamage(skillAdditive: 50, damagePercent: 0, casterBase: 30);
        Assert.Equal(80, d);
    }

    [Fact]
    public void OutgoingDamage_DamagePercentApplied_MultipliesAfterAddition()
    {
        // (30 + 50) * 1.5 = 120
        var d = EffectiveValues.OutgoingDamage(skillAdditive: 50, damagePercent: 1.5f, casterBase: 30);
        Assert.Equal(120, d);
    }

    [Fact]
    public void OutgoingDamage_ZeroDamagePercent_TreatedAsUnsetMultiplier()
    {
        // server-scripts treats damagePercent <= 0 as "no multiplier"
        var d = EffectiveValues.OutgoingDamage(skillAdditive: 50, damagePercent: 0f, casterBase: 30);
        Assert.Equal(80, d);
    }

    [Fact]
    public void OutgoingDamage_RawSkillOnly_NoBaseAdded()
    {
        // For skills like AreaObjectSpawnSkill where the server uses just
        // skill.damage[level] (no caster base added).
        var d = EffectiveValues.OutgoingDamage(skillAdditive: 50, damagePercent: 0, casterBase: 0);
        Assert.Equal(50, d);
    }

    [Fact]
    public void OutgoingDamageRange_AppliesPlusMinus10Percent()
    {
        var (min, max) = EffectiveValues.OutgoingDamageRange(100);
        Assert.Equal(90, min);
        Assert.Equal(110, max);
    }

    [Fact]
    public void CastTimeEffective_NonSpell_IgnoresSpellHaste()
    {
        var t = EffectiveValues.CastTimeEffective(rawCastTime: 2.0f, isSpell: false, spellHasteBonus: 0.5f);
        Assert.Equal(2.0f, t);
    }

    [Fact]
    public void CastTimeEffective_Spell_ReducesByHasteFraction()
    {
        // 2.0 - 2.0 * 0.25 = 1.5
        var t = EffectiveValues.CastTimeEffective(rawCastTime: 2.0f, isSpell: true, spellHasteBonus: 0.25f);
        Assert.Equal(1.5f, t, 4);
    }

    [Fact]
    public void CooldownEffectiveWithHaste_AppliesHasteFraction()
    {
        // 10 * (1 - 0.2) = 8
        var c = EffectiveValues.CooldownEffectiveWithHaste(rawCooldown: 10f, hasteBonus: 0.2f);
        Assert.Equal(8f, c, 4);
    }

    [Fact]
    public void AuraDpsApprox_AbsoluteHpsPlusAttributeBonus()
    {
        // |healingPerSecondBonus| = 50, attribute = 100
        // base 50 + 100 * 0.004 * 50 = 50 + 20 = 70
        var d = EffectiveValues.AuraDpsApprox(healingPerSecondBonus: -50, casterAttribute: 100);
        Assert.Equal(70, d);
    }
}
