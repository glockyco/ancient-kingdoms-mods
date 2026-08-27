namespace BossSkillTracker.Model;

/// <summary>
/// Turns a <see cref="GateReading"/> into the panel's gate state. Precedence follows
/// Monster.SelectNextCombatSkillIndex: the basic-only window, then the combat warmup, then
/// MonsterSkills.NextSkill's own deadline.
/// </summary>
/// <remarks>
/// The deadline is exact, but the cast is not due when it passes. A monster selects a skill only
/// between basic attack cycles, so the cast lands inside
/// [deadline, deadline + <see cref="GateReading.BasicCycleSeconds"/>]. At that selection
/// MonsterSkills.NextSkill either casts, or finds nothing castable and pushes its deadline out by 2
/// to 4 seconds. A push that small is reported as <see cref="GateStatus.Held"/>, because a boss out
/// of range extends its own lock that way for as long as the situation lasts.
/// </remarks>
public sealed class SpecialGate
{
    private double _deadline = double.NaN;
    private double _lockStart;
    private bool _held;

    public void Reset()
    {
        _deadline = double.NaN;
        _lockStart = 0;
        _held = false;
    }

    public GateVm Evaluate(double now, bool engaged, GateReading reading, bool anySpecialOffCooldown)
    {
        if (!engaged)
        {
            Reset();
            return new GateVm(GateStatus.Unknown, 0, 0, 0);
        }

        if (reading.NextSpecialCastTime != _deadline)
        {
            _held = !double.IsNaN(_deadline) && reading.NextSpecialCastTime - _deadline < Tuning.SpecialGateMinSeconds;
            _deadline = reading.NextSpecialCastTime;
            _lockStart = now;
        }

        if (now <= reading.BasicOnlySkillTimeEnd)
            return Vm(GateStatus.BasicOnly, reading.BasicOnlySkillTimeEnd, reading.BasicOnlySkillTimeEnd - Tuning.BasicOnlySeconds, reading);

        double warmupEnd = reading.StartCombatTime + Tuning.SpecialWarmupSeconds;
        if (now < warmupEnd)
            return Vm(GateStatus.Warmup, warmupEnd, reading.StartCombatTime, reading);

        if (now < reading.NextSpecialCastTime)
            return Vm(_held ? GateStatus.Held : GateStatus.Locked, reading.NextSpecialCastTime, _lockStart, reading);

        return Vm(anySpecialOffCooldown ? GateStatus.Armed : GateStatus.Idle, reading.NextSpecialCastTime, _lockStart, reading);
    }

    private static GateVm Vm(GateStatus status, double readyAt, double lockStart, GateReading reading)
        => new(status, readyAt, lockStart, readyAt + reading.BasicCycleSeconds);
}
