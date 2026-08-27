using BossSkillTracker.Model;
using Xunit;

/// <summary>
/// A client of a remote server derives its window from the game's constants, so the window has to
/// contain what a monster actually does. The trace below was measured against Ancient Cyclops in
/// Steam build 24925347, reading only fields a client receives: the synchronized skill list.
/// </summary>
public sealed class ObservedGateTraceTests
{
    private const double BasicCycle = 2.0; // Troll Attack: 1.0 cast + 0.5 cooldown + 0.5 refractory.

    /// <summary>Special casts as (start, end), in server-corrected time.</summary>
    private static readonly (double Start, double End)[] Casts =
    {
        (8417.497, 8417.597),
        (8430.952, 8431.952),
        (8439.252, 8439.352),
        (8449.719, 8450.719),
        (8462.701, 8462.801),
        (8473.135, 8474.135),
    };

    [Fact]
    public void Every_measured_cast_falls_inside_the_window_the_previous_cast_implies()
    {
        var gate = new SpecialGate();
        gate.Evaluate(Casts[0].Start - Tuning.SpecialWarmupSeconds - 1, engaged: true, Idle(), anySpecialOffCooldown: true);

        for (int index = 0; index < Casts.Length - 1; index++)
        {
            gate.Evaluate(Casts[index].End, engaged: true, Casting(Casts[index].End), anySpecialOffCooldown: true);

            double nextStart = Casts[index + 1].Start;
            var window = gate.Evaluate(Casts[index].End + 0.5, engaged: true, Idle(), anySpecialOffCooldown: true);

            Assert.Equal(GateProvenance.Observed, window.Provenance);
            Assert.InRange(nextStart, window.ReadyAt, window.LatestAt);
        }
    }

    [Fact]
    public void The_window_stays_locked_until_its_earliest_bound()
    {
        var gate = new SpecialGate();
        gate.Evaluate(Casts[0].Start - Tuning.SpecialWarmupSeconds - 1, engaged: true, Idle(), anySpecialOffCooldown: true);
        gate.Evaluate(Casts[0].End, engaged: true, Casting(Casts[0].End), anySpecialOffCooldown: true);

        double earliest = Casts[0].End + Tuning.SpecialGateMinSeconds;
        Assert.Equal(GateStatus.Locked, gate.Evaluate(earliest - 0.1, engaged: true, Idle(), anySpecialOffCooldown: true).Status);
        Assert.Equal(GateStatus.Armed, gate.Evaluate(earliest, engaged: true, Idle(), anySpecialOffCooldown: true).Status);
    }

    private static GateReading Casting(double castEnd) => GateReading.FromObservation(castEnd, BasicCycle);

    private static GateReading Idle() => GateReading.FromObservation(0, BasicCycle);
}
