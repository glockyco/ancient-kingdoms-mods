namespace BossSkillTracker.Model;

public readonly struct GateVm
{
    public readonly GateStatus Status;

    /// <summary>Server time the current gate opens. The cast is not due before it.</summary>
    public readonly double ReadyAt;

    /// <summary>Server time the current gate closed, so the strip fills over its real span.</summary>
    public readonly double LockStart;

    /// <summary>Server time the cast is due by, one basic attack cycle after <see cref="ReadyAt"/>.</summary>
    public readonly double LatestAt;

    public GateVm(GateStatus status, double readyAt, double lockStart, double latestAt)
    {
        Status = status;
        ReadyAt = readyAt;
        LockStart = lockStart;
        LatestAt = latestAt;
    }
}
