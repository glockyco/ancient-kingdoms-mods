namespace BossSkillTracker.Model;

/// <summary>
/// Estimates a monster's shared special-cast gate from observed casts. The exact gate is
/// server-only and unsynced; this only exposes the bounds implied by observed cast ends.
/// </summary>
public sealed class SpecialGateEstimator
{
    private double? _combatStart;
    private double? _lastSpecialCastEnd;

    public void Reset()
    {
        _combatStart = null;
        _lastSpecialCastEnd = null;
    }

    public void Observe(double now, bool engaged, int currentSkillIndex, bool isCasting, bool currentIsSpecial, double currentCastEnd)
    {
        if (!engaged)
        {
            Reset();
            return;
        }

        _combatStart ??= now;
        if (isCasting && currentIsSpecial && currentSkillIndex >= 1)
            _lastSpecialCastEnd = currentCastEnd;
    }

    public GateVm Evaluate(double now, bool anySpecialOffCooldown)
    {
        if (_combatStart is null) return new GateVm(GateStatus.Unknown, 0, 0);
        if (now - _combatStart.Value < Tuning.WarmupSeconds) return new GateVm(GateStatus.Warmup, 0, 0);
        if (_lastSpecialCastEnd is null) return new GateVm(GateStatus.Unknown, 0, 0);

        double windowStart = _lastSpecialCastEnd.Value + Tuning.GateMin;
        double windowEnd = _lastSpecialCastEnd.Value + Tuning.GateMax;
        if (now < windowStart) return new GateVm(GateStatus.Locked, windowStart, windowEnd);

        return new GateVm(anySpecialOffCooldown ? GateStatus.Armed : GateStatus.Idle, windowStart, windowEnd);
    }
}
