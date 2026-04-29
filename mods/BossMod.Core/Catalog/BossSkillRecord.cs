using System;

namespace BossMod.Core.Catalog;

public sealed class BossSkillRecord
{
    public BossSkillSnapshot EffectiveSnapshot { get; set; } = new();
    public ThreatTier AutoThreat { get; set; } = ThreatTier.Low;

    // Boss-level overrides — wins over SkillRecord.
    public ThreatTier? UserThreat { get; set; }
    public string? Sound { get; set; }
    public string? AlertText { get; set; }
    public AlertTrigger? FireOn { get; set; }
    public bool? Muted { get; set; }

    public DateTime LastObservedUtc { get; set; }
}
