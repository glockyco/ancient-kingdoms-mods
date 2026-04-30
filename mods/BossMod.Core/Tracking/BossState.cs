using System.Collections.Generic;
using BossMod.Core.Catalog;

namespace BossMod.Core.Tracking;

/// <summary>
/// Snapshot of one tracked Monster at one frame. Plain data; built each frame
/// by MonsterWatcher from live SyncVars.
/// </summary>
public sealed class BossState
{
    public uint NetId { get; set; }
    public string BossId { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public int Level { get; set; }
    public BossKind Kind { get; set; }
    public float PositionX { get; set; }
    public float PositionY { get; set; }
    public float DistanceToPlayer { get; set; }
    public bool IsTargeted { get; set; }
    public bool IsEngaged { get; set; }
    public bool IsProximate { get; set; }
    public bool IsChasingTarget { get; set; }
    public int HealthCurrent { get; set; }
    public int HealthMax { get; set; }
    public List<BossAbilityState> Abilities { get; set; } = new();
    public BossSpecialTimingState SpecialTiming { get; set; } = BossSpecialTimingState.Unknown("Special timing starts on engagement");
    public double ServerTime { get; set; }
    public bool IsActive { get; set; }
}
