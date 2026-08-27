namespace BossSkillTracker.Model;

public enum GateStatus
{
    /// <summary>The monster is not in a fight, so no gate applies.</summary>
    Inactive,

    /// <summary>Engaged, but nothing seen yet that a window could be derived from.</summary>
    Unknown,

    Warmup,
    BasicOnly,
    Locked,
    Held,
    Armed,
    Idle,
}
