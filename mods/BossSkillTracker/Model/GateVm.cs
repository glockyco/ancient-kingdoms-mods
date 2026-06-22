namespace BossSkillTracker.Model;

public readonly struct GateVm
{
    public readonly GateStatus Status;
    public readonly double WindowStart;
    public readonly double WindowEnd;

    public GateVm(GateStatus status, double windowStart, double windowEnd)
    {
        Status = status;
        WindowStart = windowStart;
        WindowEnd = windowEnd;
    }
}
