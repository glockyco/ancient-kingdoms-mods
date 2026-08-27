namespace BossSkillTracker.Model;

public readonly struct GateVm
{
    public readonly GateStatus Status;

    /// <summary>Whether the figures are the server's own or derived from observed casts.</summary>
    public readonly GateProvenance Provenance;

    /// <summary>Server time the gate opens. No special starts before it.</summary>
    public readonly double ReadyAt;

    /// <summary>Server time the current window began, so the strip fills over its real span.</summary>
    public readonly double LockStart;

    /// <summary>Server time the cast is due by. An observed window can overrun it.</summary>
    public readonly double LatestAt;

    public GateVm(GateStatus status, GateProvenance provenance, double readyAt, double lockStart, double latestAt)
    {
        Status = status;
        Provenance = provenance;
        ReadyAt = readyAt;
        LockStart = lockStart;
        LatestAt = latestAt;
    }
}
