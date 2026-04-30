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


    public int HealthCurrent { get; set; }
    public int HealthMax { get; set; }

    public CastInfo? ActiveCast { get; set; }
    public List<SkillCooldown> Cooldowns { get; set; } = new();

    public double ServerTime { get; set; }

    public bool IsActive { get; set; }   // Engaged ∪ Proximate gate result
}
