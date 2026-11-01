using System.Linq;
using PocketCompendium.Features.BestiaryPages.Model;
using PocketCompendium.Features.BestiaryPages.Skills;
using Xunit;

namespace PocketCompendium.Tests.BestiaryPages;

public class MonsterSkillFactsTests
{
    private static MonsterSkillFacts[] Skills(string monster) => SkillEffectFormatterTests.LoadCases()
        .Where(c => c.monster_id == monster)
        .OrderBy(c => c.delivery!.skill_index)
        .Select(c => new MonsterSkillFacts(c.input, c.delivery!))
        .ToArray();

    private static MonsterSkillFacts Skill(string monster, string skill) =>
        Skills(monster).Single(s => s.Effect.id == skill);

    [Fact]
    public void NyxarionsBreathIsAFrontalSquareWithAVisibleCastAndColdDamage()
    {
        var breath = Skill("nyxarion", "dragon_ice_breath");
        Assert.Equal(SkillShape.FrontalSquare, breath.Shape);
        Assert.Equal(5, breath.Reach);
        Assert.Equal(10, breath.Delivery.cooldown);
        Assert.Equal(1, breath.Delivery.cast_time);
        Assert.True(breath.HasCastBar);
        Assert.False(breath.ProjectileHoming);
        Assert.Equal(4650, breath.Damage);
        var stun = Assert.Single(breath.Controls);
        Assert.Equal(SkillThreatKind.Stun, stun.Kind);
        Assert.Equal(0.75, stun.Chance);
        Assert.Equal(1.5, stun.MinimumDuration);
        Assert.Equal(1.5, stun.MaximumDuration);
    }

    [Fact]
    public void NyxarionsFearHasAreaReachAndVariableDurationWithoutDamage()
    {
        var fear = Skill("nyxarion", "fear");
        Assert.Equal(SkillShape.AroundCaster, fear.Shape);
        Assert.Equal(10, fear.Reach);
        Assert.Equal(50, fear.Delivery.cooldown);
        Assert.Equal(1.2, fear.Delivery.cast_time);
        Assert.True(fear.HasCastBar);
        Assert.Null(fear.Damage);
        var control = Assert.Single(fear.Controls);
        Assert.Equal(SkillThreatKind.Fear, control.Kind);
        Assert.Equal(1, control.Chance);
        Assert.Equal(4, control.MinimumDuration);
        Assert.Equal(8, control.MaximumDuration);
    }

    [Fact]
    public void NyxarionsSummonHasNoCastBarAndStunsWithinItsReach()
    {
        var summon = Skill("nyxarion", "summon_player");
        Assert.Equal(SkillShape.Target, summon.Shape);
        Assert.True(summon.SummonsTarget);
        Assert.Equal(3, summon.SummonMinimumReach);
        Assert.Equal(15, summon.SummonMaximumReach);
        Assert.Equal(10, summon.Delivery.cooldown);
        Assert.Equal(0.1, summon.Delivery.cast_time);
        Assert.False(summon.HasCastBar);
        Assert.Null(summon.Damage);
        var stun = Assert.Single(summon.Controls);
        Assert.Equal(SkillThreatKind.Stun, stun.Kind);
        Assert.Equal(1, stun.Chance);
        Assert.Equal(2, stun.MinimumDuration);
        Assert.Equal(2, stun.MaximumDuration);
    }

    [Fact]
    public void NyxarionsKnockbackKeepsItsDistanceSeparateFromItsTargetReach()
    {
        var knockback = Skill("nyxarion", "knockback");
        Assert.Equal(SkillShape.Target, knockback.Shape);
        Assert.Equal(1, knockback.Reach);
        Assert.Equal(1625, knockback.Damage);
        Assert.Equal(30, knockback.Delivery.cooldown);
        var control = Assert.Single(knockback.Controls);
        Assert.Equal(SkillThreatKind.Knockback, control.Kind);
        Assert.Equal(0.75, control.Chance);
        Assert.Equal(1.5, control.Distance);
    }

    [Fact]
    public void NyxarionsSummaryTakesTheMaximumPerTypeAndNamesTheSummon()
    {
        var summary = new MonsterSkillSummary(Skills("nyxarion"));
        Assert.Equal(2, summary.DamageTypes.Count);
        Assert.Equal(1720, summary.DamageTypes["Physical"]);
        Assert.Equal(4650, summary.DamageTypes["Cold"]);
        Assert.DoesNotContain("Magic", summary.DamageTypes.Keys);
        Assert.Contains(summary.Threats, t => t.Kind == SkillThreatKind.Summon && t.Skill.SummonMaximumReach == 15);
        Assert.Contains(summary.Threats, t => t.Kind == SkillThreatKind.Frontal && t.Skill.Reach == 5);
        Assert.Contains(summary.Threats, t => t.Kind == SkillThreatKind.Area && t.Skill.Reach == 10);
        Assert.Contains(summary.Threats, t => t.Kind == SkillThreatKind.Stun);
        Assert.Contains(summary.Threats, t => t.Kind == SkillThreatKind.Fear);
        Assert.Contains(summary.Threats, t => t.Kind == SkillThreatKind.Knockback);
    }

    [Fact]
    public void XylevisHasOneBuffSpecialAndHisBasicAttackStillSuppliesPhysicalDamage()
    {
        var skills = Skills("xylevis");
        Assert.Equal(2, skills.Length);
        Assert.False(skills[0].IsSpecial);
        Assert.False(skills[0].HasCastBar);
        Assert.Equal(27, skills[0].Damage);
        Assert.Equal(0.009, Assert.Single(skills[0].Controls).Chance, 6);
        var buff = Assert.Single(skills, s => s.IsSpecial);
        Assert.Equal("king_of_harpies", buff.Effect.id);
        Assert.Equal(2, buff.Delivery.cast_time);
        Assert.Equal(30, buff.Delivery.cooldown);
        Assert.True(buff.HasCastBar);
        Assert.False(buff.Heals);
        Assert.Empty(buff.Controls);
        var summary = new MonsterSkillSummary(skills);
        Assert.Single(summary.DamageTypes);
        Assert.Equal(27, summary.DamageTypes["Physical"]);
        Assert.DoesNotContain(summary.Threats, t => t.Kind is SkillThreatKind.Heal or SkillThreatKind.Enrage);
    }

    [Fact]
    public void ValaarksSixSpecialsIncludeAreasAndOnlyTheFullyResistantDebuffIsUncleanseable()
    {
        var skills = Skills("valaark");
        Assert.Equal(6, skills.Count(s => s.IsSpecial));
        var annihilation = skills.Single(s => s.Effect.id == "prismatic_annihilation");
        Assert.Equal(SkillShape.AroundCaster, annihilation.Shape);
        Assert.Equal(24, annihilation.Reach);
        Assert.Equal(49000, annihilation.Damage);
        var summary = new MonsterSkillSummary(skills);
        Assert.Equal(49000, summary.DamageTypes["Magic"]);
        Assert.Equal(42000, summary.DamageTypes["Physical"]);
        var debuff = Assert.Single(summary.Threats, t => t.Kind == SkillThreatKind.UncleanseableDebuff);
        Assert.Equal("grievous_wounds", debuff.Skill.Effect.id);
        Assert.False(skills.Single(s => s.Effect.id == "chains_of_valaark").UncleanseableDebuff);
        Assert.False(skills.Single(s => s.Effect.id == "blinding_gaze").UncleanseableDebuff);
    }

    [Theory]
    [InlineData(0.1, false)]
    [InlineData(0.3, false)]
    [InlineData(0.30000000000000004, false)]
    [InlineData(0.3001, true)]
    public void OnlySpecialsStrictlyAboveTheUnityFloatThresholdHaveACastBar(double castTime, bool expected)
    {
        var effect = new SkillEffectInput { skill_type = "target_damage" };
        var delivery = new SkillDeliveryInput { skill_index = 1, cast_time = castTime };
        Assert.Equal(expected, new MonsterSkillFacts(effect, delivery).HasCastBar);
        delivery.skill_index = 0;
        Assert.False(new MonsterSkillFacts(effect, delivery).HasCastBar);
        delivery.skill_index = 1;
        delivery.is_aura = true;
        Assert.False(new MonsterSkillFacts(effect, delivery).HasCastBar);
        delivery.is_aura = false;
        effect.skill_type = "passive";
        Assert.False(new MonsterSkillFacts(effect, delivery).HasCastBar);
    }

    [Fact]
    public void GroundZonesKeepTheTargetZoneSeparateAndUseDiameterAndWarningDelay()
    {
        var skill = Skill("zorvath", "fire_whirlwind");
        Assert.Equal(SkillShape.GroundZones, skill.Shape);
        Assert.Equal(12, skill.Reach);
        Assert.Equal(12, skill.RandomGroundZones);
        Assert.Equal(1, skill.TargetGroundZones);
        Assert.Equal(2, skill.GroundZoneDiameter);
        Assert.Equal(1.75, skill.GroundWarningSeconds);
        Assert.False(skill.ProjectileHoming);
    }

    [Fact]
    public void TargetProjectilesHomeButFrontalMeleeDoesNot()
    {
        var projectile = Skill("seer_kzhal", "arcane_bolt");
        Assert.True(projectile.ProjectileHoming);
        Assert.Equal(SkillShape.Target, projectile.Shape);
        Assert.Equal(8, projectile.Reach);
        Assert.False(Skill("nyxarion", "dragon_ice_breath").ProjectileHoming);
    }

    [Fact]
    public void HealingAndEnrageCarryTheirDifferentHealthThresholds()
    {
        var heal = Skill("arcane_sentinel", "arcane_regeneration");
        Assert.True(heal.Heals);
        Assert.Equal(0.75, heal.HealBelowHealth);
        var enrage = Skill("ancient_cyclops", "rampage");
        Assert.True(enrage.Enrages);
        Assert.Equal(0.1, enrage.EnrageBelowHealth);
        Assert.True(enrage.IsPassive);
        Assert.False(enrage.HasCastBar);
        var summary = new MonsterSkillSummary(new[] { heal, enrage });
        Assert.Contains(summary.Threats, t => t.Kind == SkillThreatKind.Heal);
        Assert.Contains(summary.Threats, t => t.Kind == SkillThreatKind.Enrage);
    }

    [Fact]
    public void AMonsterWithOnlyABasicAttackStillHasADamageSummaryWithoutSpecialWarnings()
    {
        var basic = Skill("nyxarion", "dragon_claw_attack");
        var summary = new MonsterSkillSummary(new[] { basic });
        Assert.Single(summary.DamageTypes);
        Assert.Equal(1720, summary.DamageTypes["Physical"]);
        Assert.DoesNotContain(summary.Threats, t => t.Kind is SkillThreatKind.Area or SkillThreatKind.Frontal);
    }
}
