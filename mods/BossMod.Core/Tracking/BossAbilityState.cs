namespace BossMod.Core.Tracking;

public enum BossAbilityRole { Default, Special, Passive, Aura, NotRolled }

public enum AbilityEligibilityKind
{
    Eligible,
    DefaultFallback,
    OnCooldown,
    Casting,
    Passive,
    Aura,
    NoTarget,
    TargetOutOfRange,
    NoAreaTargets,
    HealthGate,
    SummonGate,
    ResourceGate,
    Unknown,
}

public enum ChanceConfidence { ExactFromVisibleInputs, Estimated, Unknown }
public enum SpecialTimingPhase { Unknown, Locked, OpeningEstimate, OpenEstimate }

public sealed class BossSpecialTimingState
{
    public SpecialTimingPhase Phase { get; init; }
    public double? EarliestSpecialServerTime { get; init; }
    public float? WindowOpenEstimate { get; init; }
    public string DisplayText { get; init; } = "";

    public static BossSpecialTimingState Unknown(string text) => new() { Phase = SpecialTimingPhase.Unknown, DisplayText = text };
    public static BossSpecialTimingState Locked(double earliest, string text) => new() { Phase = SpecialTimingPhase.Locked, EarliestSpecialServerTime = earliest, DisplayText = text };
    public static BossSpecialTimingState Opening(float estimate, string text) => new() { Phase = SpecialTimingPhase.OpeningEstimate, WindowOpenEstimate = estimate, DisplayText = text };
    public static BossSpecialTimingState OpenEstimate(string text) => new() { Phase = SpecialTimingPhase.OpenEstimate, WindowOpenEstimate = 1f, DisplayText = text };
}

public sealed class BossAbilityState
{
    public int SkillIndex { get; init; }
    public string SkillId { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public BossAbilityRole Role { get; init; }
    public string SkillClass { get; init; } = "";
    public double CastTimeEnd { get; init; }
    public float TotalCastTime { get; init; }
    public double CooldownEnd { get; init; }
    public float TotalCooldown { get; init; }
    public bool IsCurrent { get; init; }
    public bool IsReady { get; init; }
    public AbilityEligibilityKind Eligibility { get; init; }
    public float? SelectionWeight { get; init; }
    public float? ConditionalRollChance { get; init; }
    public ChanceConfidence ChanceConfidence { get; init; } = ChanceConfidence.Unknown;
}
