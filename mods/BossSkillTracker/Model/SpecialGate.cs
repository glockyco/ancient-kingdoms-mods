namespace BossSkillTracker.Model;

/// <summary>
/// Turns what this process can see of a monster into the panel's gate state.
/// </summary>
/// <remarks>
/// On a server the deadline is exact and the status ladder follows
/// Monster.SelectNextCombatSkillIndex: the basic-only window, then the combat warmup, then
/// MonsterSkills.NextSkill's own deadline. A cast is still not due when the deadline passes,
/// because a monster selects a skill only between basic attack cycles.
/// <para>
/// On a client of a remote server none of those fields arrive, so the window comes from the game's
/// constants applied to the last cast this client saw. Such a window can be overrun: NextSkill
/// silently pushes its deadline by 2 to 4 seconds whenever it finds no castable skill, and a boss
/// reposition opens a basic-only window, and a client sees neither.
/// </para>
/// </remarks>
public sealed class SpecialGate
{
    private double _deadline = double.NaN;
    private double _lockStart;
    private bool _held;
    private double _combatStart = double.NaN;
    private double _lastSpecialCastEnd = double.NaN;

    public void Reset()
    {
        _deadline = double.NaN;
        _lockStart = 0;
        _held = false;
        _combatStart = double.NaN;
        _lastSpecialCastEnd = double.NaN;
    }

    public GateVm Evaluate(double now, bool engaged, GateReading reading, bool anySpecialOffCooldown)
    {
        if (!engaged)
        {
            Reset();
            return new GateVm(GateStatus.Inactive, reading.Provenance, 0, 0, 0);
        }

        if (double.IsNaN(_combatStart)) _combatStart = now;
        if (reading.SpecialCastEnd > 0) _lastSpecialCastEnd = reading.SpecialCastEnd;

        return reading.Provenance == GateProvenance.Server
            ? FromServer(now, reading, anySpecialOffCooldown)
            : FromObservation(now, reading, anySpecialOffCooldown);
    }

    private GateVm FromServer(double now, GateReading reading, bool anySpecialOffCooldown)
    {
        if (reading.NextSpecialCastTime != _deadline)
        {
            _held = !double.IsNaN(_deadline) && reading.NextSpecialCastTime - _deadline < Tuning.SpecialGateMinSeconds;
            _deadline = reading.NextSpecialCastTime;
            _lockStart = now;
        }

        if (now <= reading.BasicOnlySkillTimeEnd)
            return Window(GateStatus.BasicOnly, reading, reading.BasicOnlySkillTimeEnd, reading.BasicOnlySkillTimeEnd - Tuning.BasicOnlySeconds);

        double warmupEnd = reading.StartCombatTime + Tuning.SpecialWarmupSeconds;
        if (now < warmupEnd)
            return Window(GateStatus.Warmup, reading, warmupEnd, reading.StartCombatTime);

        GateStatus locked = _held ? GateStatus.Held : GateStatus.Locked;
        return Window(now < _deadline ? locked : Open(anySpecialOffCooldown), reading, _deadline, _lockStart);
    }

    private GateVm FromObservation(double now, GateReading reading, bool anySpecialOffCooldown)
    {
        double warmupEnd = _combatStart + Tuning.SpecialWarmupSeconds;
        if (now < warmupEnd)
            return Window(GateStatus.Warmup, reading, warmupEnd, _combatStart);

        if (double.IsNaN(_lastSpecialCastEnd))
            return new GateVm(GateStatus.Unknown, reading.Provenance, 0, 0, 0);

        double earliest = _lastSpecialCastEnd + Tuning.SpecialGateMinSeconds;
        double latest = _lastSpecialCastEnd + Tuning.SpecialGateMaxSeconds + reading.BasicCycleSeconds;
        GateStatus status = now < earliest ? GateStatus.Locked : Open(anySpecialOffCooldown);
        return new GateVm(status, reading.Provenance, earliest, _lastSpecialCastEnd, latest);
    }

    private static GateStatus Open(bool anySpecialOffCooldown)
        => anySpecialOffCooldown ? GateStatus.Armed : GateStatus.Idle;

    private static GateVm Window(GateStatus status, GateReading reading, double readyAt, double lockStart)
        => new(status, reading.Provenance, readyAt, lockStart, readyAt + reading.BasicCycleSeconds);
}
