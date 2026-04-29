using System;
using System.Collections.Generic;

namespace BossMod.Core.Catalog;

public sealed class BossRecord
{
    public string Id { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Type { get; set; } = "";          // "Undead" / "Beast" / etc
    public string Class { get; set; } = "";         // "Warrior" / "Mage" / etc
    public string ZoneBestiary { get; set; } = ""; // primary group key in Bosses tab
    public BossKind Kind { get; set; } = BossKind.Boss;
    public int LastSeenLevel { get; set; }

    public DateTime FirstSeenUtc { get; set; }
    public DateTime LastSeenUtc { get; set; }

    public Dictionary<string, BossSkillRecord> Skills { get; set; } = new();
}
