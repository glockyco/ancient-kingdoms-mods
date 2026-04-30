using System.Linq;
using BossMod.Core.Tracking;
using Xunit;

namespace BossMod.Core.Tests;

public class BossAbilityEstimatorTests
{
    [Fact]
    public void Evaluate_IncludesDefaultFirstWithoutSpecialRollChance()
    {
        var input = BossAbilityEvaluationInput.ForTests(
            abilities: new[]
            {
                BossAbilityInput.ForTests(index: 0, id: "auto", name: "Claw Swipe", skillClass: "TargetDamageSkill", ready: true),
                BossAbilityInput.ForTests(index: 1, id: "breath", name: "Frost Breath", skillClass: "TargetDamageSkill", ready: true, hasTarget: true, targetInRange: true),
            },
            specialTiming: BossSpecialTimingState.OpenEstimate("Next special: open estimate; 1 special ready"));

        var result = BossAbilityEstimator.Evaluate(input);

        Assert.Equal(0, result.Abilities[0].SkillIndex);
        Assert.Equal(BossAbilityRole.Default, result.Abilities[0].Role);
        Assert.Null(result.Abilities[0].ConditionalRollChance);
        Assert.Equal(1f, result.Abilities[1].ConditionalRollChance);
    }

    [Fact]
    public void Evaluate_WeightsEligibleSpecialsLikeServerNextSkill()
    {
        var input = BossAbilityEvaluationInput.ForTests(
            abilities: new[]
            {
                BossAbilityInput.ForTests(index: 0, id: "auto", name: "Claw Swipe", skillClass: "TargetDamageSkill", ready: true),
                BossAbilityInput.ForTests(index: 1, id: "breath", name: "Frost Breath", skillClass: "TargetDamageSkill", ready: true, hasTarget: true, targetInRange: true),
                BossAbilityInput.ForTests(index: 2, id: "aoe", name: "Ice Storm", skillClass: "AreaDamageSkill", ready: true, areaTargetCount: 3),
            },
            specialTiming: BossSpecialTimingState.OpenEstimate("Next special: open estimate; 2 specials ready"));

        var result = BossAbilityEstimator.Evaluate(input);

        Assert.Equal(0.25f, result.Abilities.Single(a => a.SkillId == "breath").ConditionalRollChance);
        Assert.Equal(0.75f, result.Abilities.Single(a => a.SkillId == "aoe").ConditionalRollChance);
    }

    [Fact]
    public void Evaluate_AppliesProjectileLongRangeWeightBonus()
    {
        var input = BossAbilityEvaluationInput.ForTests(
            abilities: new[]
            {
                BossAbilityInput.ForTests(index: 0, id: "auto", name: "Claw Swipe", skillClass: "TargetDamageSkill", ready: true),
                BossAbilityInput.ForTests(index: 1, id: "bolt", name: "Arcane Bolt", skillClass: "TargetProjectileSkill", ready: true, hasTarget: true, targetInRange: true, targetDistance: 8f, castRange: 10f),
                BossAbilityInput.ForTests(index: 2, id: "strike", name: "Heavy Strike", skillClass: "TargetDamageSkill", ready: true, hasTarget: true, targetInRange: true),
            },
            specialTiming: BossSpecialTimingState.OpenEstimate("Next special: open estimate; 2 specials ready"));

        var result = BossAbilityEstimator.Evaluate(input);

        Assert.Equal(0.6f, result.Abilities.Single(a => a.SkillId == "bolt").ConditionalRollChance);
        Assert.Equal(0.4f, result.Abilities.Single(a => a.SkillId == "strike").ConditionalRollChance);
    }

    [Fact]
    public void Evaluate_SelfTargetSupportSpecialDoesNotRequireCombatTarget()
    {
        var input = BossAbilityEvaluationInput.ForTests(
            abilities: new[]
            {
                BossAbilityInput.ForTests(index: 0, id: "auto", name: "Claw Swipe", skillClass: "TargetDamageSkill", ready: true),
                BossAbilityInput.ForTests(index: 1, id: "heal", name: "Mend Wounds", skillClass: "TargetHealSkill", ready: true, bossHealthPercent: 0.4f),
            },
            specialTiming: BossSpecialTimingState.OpenEstimate("Next special: open estimate; 1 special ready"));

        var result = BossAbilityEstimator.Evaluate(input);
        var heal = result.Abilities.Single(a => a.SkillId == "heal");

        Assert.Equal(AbilityEligibilityKind.Eligible, heal.Eligibility);
        Assert.Equal(1f, heal.ConditionalRollChance);
    }
}
