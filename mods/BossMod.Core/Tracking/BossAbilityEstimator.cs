using System;
using System.Collections.Generic;
using System.Linq;

namespace BossMod.Core.Tracking;

public sealed record BossAbilityInput(
    int SkillIndex,
    string SkillId,
    string DisplayName,
    string SkillClass,
    double CastTimeEnd,
    float TotalCastTime,
    double CooldownEnd,
    float TotalCooldown,
    bool IsCurrent,
    bool IsReady,
    bool IsAura,
    bool HasTarget,
    bool TargetInRange,
    float TargetDistance,
    float CastRange,
    int AreaTargetCount,
    float BossHealthPercent,
    int ActiveSummonCount,
    int MaxActiveSummons,
    bool InputsComplete)
{
    public static BossAbilityInput ForTests(
        int index,
        string id,
        string name,
        string skillClass,
        bool ready,
        bool hasTarget = false,
        bool targetInRange = false,
        int areaTargetCount = 0,
        float bossHealthPercent = 1f,
        float targetDistance = 0f,
        float castRange = 0f) =>
        new(index, id, name, skillClass, 0, 0, ready ? 0 : 10, 10, false, ready, false, hasTarget, targetInRange, targetDistance, castRange, areaTargetCount, bossHealthPercent, 0, 0, true);
}

public sealed record BossAbilityEvaluationInput(
    IReadOnlyList<BossAbilityInput> Abilities,
    BossSpecialTimingState SpecialTiming,
    bool IsChasingTarget = false)
{
    public static BossAbilityEvaluationInput ForTests(
        IReadOnlyList<BossAbilityInput> abilities,
        BossSpecialTimingState specialTiming,
        bool isChasingTarget = false) =>
        new(abilities, specialTiming, isChasingTarget);
}

public sealed class BossAbilityEvaluationResult
{
    public BossAbilityEvaluationResult(IReadOnlyList<BossAbilityState> abilities, BossSpecialTimingState specialTiming)
    {
        Abilities = abilities;
        SpecialTiming = specialTiming;
    }

    public IReadOnlyList<BossAbilityState> Abilities { get; }
    public BossSpecialTimingState SpecialTiming { get; }
}

public static class BossAbilityEstimator
{
    public static BossAbilityEvaluationResult Evaluate(BossAbilityEvaluationInput input)
    {
        var candidates = input.Abilities
            .Where(ability => ability.SkillIndex > 0)
            .Select(ability => new Candidate(ability, RoleFor(ability), EligibilityFor(ability), WeightFor(ability)))
            .Where(candidate => candidate.Role == BossAbilityRole.Special && candidate.Eligibility == AbilityEligibilityKind.Eligible && candidate.Weight > 0f)
            .ToList();

        float totalWeight = candidates.Sum(candidate => candidate.Weight);
        var states = input.Abilities
            .OrderBy(ability => ability.SkillIndex)
            .Select(ability => BuildState(ability, candidates, totalWeight))
            .ToList();

        return new BossAbilityEvaluationResult(states, input.SpecialTiming);
    }

    private static BossAbilityState BuildState(BossAbilityInput input, IReadOnlyList<Candidate> candidates, float totalWeight)
    {
        var role = RoleFor(input);
        var eligibility = EligibilityFor(input);
        Candidate? candidate = candidates.FirstOrDefault(candidate => candidate.Input.SkillIndex == input.SkillIndex);
        float? weight = candidate?.Weight;
        float? chance = totalWeight > 0f && weight.HasValue ? weight.Value / totalWeight : null;

        return new BossAbilityState
        {
            SkillIndex = input.SkillIndex,
            SkillId = input.SkillId,
            DisplayName = input.DisplayName,
            Role = role,
            SkillClass = input.SkillClass,
            CastTimeEnd = input.CastTimeEnd,
            TotalCastTime = input.TotalCastTime,
            CastRange = input.CastRange,
            CooldownEnd = input.CooldownEnd,
            TotalCooldown = input.TotalCooldown,
            IsCurrent = input.IsCurrent,
            IsReady = input.IsReady,
            Eligibility = eligibility,
            SelectionWeight = weight,
            ConditionalRollChance = chance,
            ChanceConfidence = chance.HasValue ? ChanceConfidence.ExactFromVisibleInputs : ChanceConfidence.Unknown,
        };
    }

    private static BossAbilityRole RoleFor(BossAbilityInput input)
    {
        if (input.SkillIndex == 0) return BossAbilityRole.Default;
        if (input.IsAura) return BossAbilityRole.Aura;
        if (input.SkillClass.Contains("Passive", StringComparison.OrdinalIgnoreCase)) return BossAbilityRole.Passive;
        return BossAbilityRole.Special;
    }

    private static AbilityEligibilityKind EligibilityFor(BossAbilityInput input)
    {
        var role = RoleFor(input);
        if (role == BossAbilityRole.Default) return AbilityEligibilityKind.DefaultFallback;
        if (role == BossAbilityRole.Aura) return AbilityEligibilityKind.Aura;
        if (role == BossAbilityRole.Passive) return AbilityEligibilityKind.Passive;
        if (input.IsCurrent) return AbilityEligibilityKind.Casting;
        if (!input.IsReady) return AbilityEligibilityKind.OnCooldown;
        if (RequiresCombatTarget(input.SkillClass) && !input.HasTarget) return AbilityEligibilityKind.NoTarget;
        if (RequiresCombatTarget(input.SkillClass) && !input.TargetInRange) return AbilityEligibilityKind.TargetOutOfRange;
        if (IsArea(input.SkillClass) && input.AreaTargetCount <= 0) return AbilityEligibilityKind.NoAreaTargets;
        if (IsHealthGated(input.SkillClass) && input.BossHealthPercent >= 0.75f) return AbilityEligibilityKind.HealthGate;
        if (input.SkillClass == "SummonSkillMonsters" && input.MaxActiveSummons > 0 && input.ActiveSummonCount >= input.MaxActiveSummons) return AbilityEligibilityKind.SummonGate;
        return AbilityEligibilityKind.Eligible;
    }

    private static float WeightFor(BossAbilityInput input)
    {
        float weight = 1f;
        if (input.SkillClass == "SummonSkillMonsters") weight *= 1.5f;
        if (IsHealthGated(input.SkillClass))
        {
            if (input.BossHealthPercent >= 0.75f) return 0f;
            weight *= input.BossHealthPercent < 0.30f ? 4f : input.BossHealthPercent < 0.50f ? 2.5f : 1.5f;
        }
        if (IsArea(input.SkillClass))
        {
            if (input.AreaTargetCount <= 0) return 0f;
            weight *= input.AreaTargetCount >= 3 ? 3f : input.AreaTargetCount == 2 ? 2f : 1.3f;
        }
        if (input.SkillClass == "TargetProjectileSkill" && input.CastRange > 0f && input.TargetDistance > input.CastRange * 0.7f)
            weight *= 1.5f;
        return weight;
    }

    private static bool RequiresCombatTarget(string skillClass) =>
        skillClass is "TargetDamageSkill" or "TargetDebuffSkill" or "TargetProjectileSkill" or "FrontalDamageSkill";

    private static bool IsArea(string skillClass) =>
        skillClass is "AreaDamageSkill" or "AreaDebuffSkill";

    private static bool IsHealthGated(string skillClass) =>
        skillClass is "TargetHealSkill" or "TargetBuffSkill";

    private sealed record Candidate(BossAbilityInput Input, BossAbilityRole Role, AbilityEligibilityKind Eligibility, float Weight);
}

public static class BossSpecialTimingEstimator
{
    public static BossSpecialTimingState Estimate(
        double serverTime,
        double? engagementStartServerTime,
        double? lastNonDefaultAbilityServerTime,
        bool anySpecialIndividuallyReady,
        double? nextIndividualReadyInSeconds)
    {
        if (!engagementStartServerTime.HasValue)
            return BossSpecialTimingState.Unknown("Special timing starts on engagement");

        if (!anySpecialIndividuallyReady && nextIndividualReadyInSeconds.HasValue)
            return BossSpecialTimingState.Unknown($"Next special: waiting for cooldown {nextIndividualReadyInSeconds.Value:0.0}s");
        if (!anySpecialIndividuallyReady)
            return BossSpecialTimingState.Unknown("Next special: waiting for eligible special");


        double earliest = lastNonDefaultAbilityServerTime.HasValue
            ? lastNonDefaultAbilityServerTime.Value + 5.0
            : engagementStartServerTime.Value + 5.0;
        double latest = lastNonDefaultAbilityServerTime.HasValue
            ? lastNonDefaultAbilityServerTime.Value + 9.0
            : earliest;

        if (serverTime < earliest)
        {
            double remaining = earliest - serverTime;
            string label = lastNonDefaultAbilityServerTime.HasValue ? "Next special" : "First special";
            return BossSpecialTimingState.Locked(earliest, $"{label}: locked, earliest in {remaining:0.0}s");
        }

        if (lastNonDefaultAbilityServerTime.HasValue && serverTime < latest)
        {
            float estimate = Math.Clamp((float)((serverTime - earliest) / (latest - earliest)), 0f, 1f);
            return BossSpecialTimingState.Opening(estimate, $"Next special: opening {estimate * 100f:0}% (estimate)");
        }

        return BossSpecialTimingState.OpenEstimate("Next special: open estimate");
    }
}
