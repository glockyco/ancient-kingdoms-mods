using System;

namespace BossMod.Core.Catalog;

public sealed class SkillRecord
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public DateTime FirstSeenUtc { get; set; }
    public string LastSeenInBoss { get; set; } = "";

    public SkillSnapshot RawSnapshot { get; set; } = new();

    // Skill-level overrides — null means "fall through to defaults".
    public ThreatTier? UserThreat { get; set; }
    public string? Sound { get; set; }
    public string? AlertText { get; set; }
    public AlertTrigger? FireOn { get; set; }
    public bool? Muted { get; set; }
}
