using System;

namespace BossMod.Core.Catalog;

public sealed class BossSkillRecord
{
    public int SkillIndex { get; set; } = int.MaxValue;
    public BossSkillSnapshot EffectiveSnapshot { get; set; } = new();
    public ThreatTier AutoThreat { get; set; } = ThreatTier.Low;

    // Boss-level overrides — wins over SkillRecord.
    public ThreatTier? UserThreat { get; set; }
    public AbilityDisplayPolicy? CastBarVisibility { get; set; }
    public AbilityDisplayPolicy? BossAbilityVisibility { get; set; }

    public DateTime LastObservedUtc { get; set; }
}
