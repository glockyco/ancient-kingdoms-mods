using BossSkillTracker.Model;
using Xunit;

public sealed class SpecialGateTests
{
    private const double CombatStart = 100.0;
    private const double Cycle = 2.0;

    private static GateReading Server(double nextSpecialCastTime, double basicOnlyEnd = 0.0, double specialCastEnd = 0.0)
        => GateReading.FromServer(nextSpecialCastTime, CombatStart, basicOnlyEnd, specialCastEnd, Cycle);

    private static GateReading Observed(double specialCastEnd = 0.0)
        => GateReading.FromObservation(specialCastEnd, Cycle);

    [Fact]
    public void Warmup_holds_until_the_game_allows_a_special()
    {
        var gate = new SpecialGate();
        double warmupEnd = CombatStart + Tuning.SpecialWarmupSeconds;

        var warmup = gate.Evaluate(CombatStart + 2, engaged: true, Server(CombatStart), anySpecialOffCooldown: true);
        Assert.Equal(GateStatus.Warmup, warmup.Status);
        Assert.Equal(warmupEnd, warmup.ReadyAt, 3);
        Assert.Equal(CombatStart, warmup.LockStart, 3);
        Assert.Equal(warmupEnd + Cycle, warmup.LatestAt, 3);

        Assert.Equal(GateStatus.Armed, gate.Evaluate(warmupEnd, engaged: true, Server(CombatStart), anySpecialOffCooldown: true).Status);
    }

    [Fact]
    public void A_served_window_runs_from_the_read_deadline_to_one_basic_cycle_later()
    {
        var gate = new SpecialGate();

        var locked = gate.Evaluate(120, engaged: true, Server(131.5), anySpecialOffCooldown: true);
        Assert.Equal(GateStatus.Locked, locked.Status);
        Assert.Equal(GateProvenance.Server, locked.Provenance);
        Assert.Equal(131.5, locked.ReadyAt, 3);
        Assert.Equal(133.5, locked.LatestAt, 3);
        Assert.Equal(120, locked.LockStart, 3);
    }

    [Fact]
    public void A_cast_sized_push_stays_locked()
    {
        var gate = new SpecialGate();
        gate.Evaluate(120, engaged: true, Server(126), anySpecialOffCooldown: true);

        // MonsterSkills.NextSkill selected a skill: the push is castTime plus 6 to 12 seconds.
        var pushed = gate.Evaluate(126, engaged: true, Server(133), anySpecialOffCooldown: true);
        Assert.Equal(GateStatus.Locked, pushed.Status);
        Assert.Equal(133, pushed.ReadyAt, 3);
        Assert.Equal(126, pushed.LockStart, 3);
    }

    [Fact]
    public void A_reroll_sized_push_reports_the_monster_as_held()
    {
        var gate = new SpecialGate();
        gate.Evaluate(120, engaged: true, Server(126), anySpecialOffCooldown: true);

        // NextSkill found nothing castable and pushed the deadline by 2 to 4 seconds.
        var held = gate.Evaluate(126, engaged: true, Server(129), anySpecialOffCooldown: true);
        Assert.Equal(GateStatus.Held, held.Status);
        Assert.Equal(129, held.ReadyAt, 3);
        Assert.Equal(126, held.LockStart, 3);

        // A later cast-sized push clears it.
        Assert.Equal(GateStatus.Locked, gate.Evaluate(129, engaged: true, Server(138), anySpecialOffCooldown: true).Status);
    }

    [Fact]
    public void Armed_only_while_a_special_is_off_cooldown()
    {
        var gate = new SpecialGate();

        Assert.Equal(GateStatus.Armed, gate.Evaluate(130, engaged: true, Server(129), anySpecialOffCooldown: true).Status);
        Assert.Equal(GateStatus.Idle, gate.Evaluate(130, engaged: true, Server(129), anySpecialOffCooldown: false).Status);
    }

    [Fact]
    public void Basic_only_window_outranks_an_open_deadline()
    {
        var gate = new SpecialGate();
        var basicOnly = gate.Evaluate(130, engaged: true, Server(129, basicOnlyEnd: 140), anySpecialOffCooldown: true);

        Assert.Equal(GateStatus.BasicOnly, basicOnly.Status);
        Assert.Equal(140, basicOnly.ReadyAt, 3);
        Assert.Equal(140 - Tuning.BasicOnlySeconds, basicOnly.LockStart, 3);
    }

    [Fact]
    public void Disengage_reports_no_gate()
    {
        var gate = new SpecialGate();
        gate.Evaluate(120, engaged: true, Server(126), anySpecialOffCooldown: true);

        Assert.Equal(GateStatus.Inactive, gate.Evaluate(121, engaged: false, Server(126), anySpecialOffCooldown: true).Status);
    }

    [Fact]
    public void A_first_reading_is_not_a_reroll()
    {
        var gate = new SpecialGate();

        Assert.Equal(GateStatus.Locked, gate.Evaluate(120, engaged: true, Server(122), anySpecialOffCooldown: true).Status);
    }

    [Fact]
    public void A_client_without_a_seen_cast_states_that_it_knows_nothing()
    {
        var gate = new SpecialGate();
        gate.Evaluate(100, engaged: true, Observed(), anySpecialOffCooldown: true);

        var unknown = gate.Evaluate(100 + Tuning.SpecialWarmupSeconds, engaged: true, Observed(), anySpecialOffCooldown: true);
        Assert.Equal(GateStatus.Unknown, unknown.Status);
        Assert.Equal(GateProvenance.Observed, unknown.Provenance);
    }

    [Fact]
    public void A_client_derives_its_window_from_the_last_seen_cast()
    {
        var gate = new SpecialGate();
        gate.Evaluate(100, engaged: true, Observed(), anySpecialOffCooldown: true);
        gate.Evaluate(110, engaged: true, Observed(specialCastEnd: 111), anySpecialOffCooldown: true);

        var locked = gate.Evaluate(112, engaged: true, Observed(), anySpecialOffCooldown: true);
        Assert.Equal(GateStatus.Locked, locked.Status);
        Assert.Equal(GateProvenance.Observed, locked.Provenance);
        Assert.Equal(111 + Tuning.SpecialGateMinSeconds, locked.ReadyAt, 3);
        Assert.Equal(111 + Tuning.SpecialGateMaxSeconds + Cycle, locked.LatestAt, 3);
        Assert.Equal(111, locked.LockStart, 3);
    }

    [Fact]
    public void A_client_arms_once_the_earliest_bound_passes()
    {
        var gate = new SpecialGate();
        gate.Evaluate(100, engaged: true, Observed(), anySpecialOffCooldown: true);
        gate.Evaluate(110, engaged: true, Observed(specialCastEnd: 111), anySpecialOffCooldown: true);

        double earliest = 111 + Tuning.SpecialGateMinSeconds;
        Assert.Equal(GateStatus.Armed, gate.Evaluate(earliest, engaged: true, Observed(), anySpecialOffCooldown: true).Status);
        Assert.Equal(GateStatus.Idle, gate.Evaluate(earliest, engaged: true, Observed(), anySpecialOffCooldown: false).Status);
    }

    [Fact]
    public void A_client_never_reports_a_server_only_status()
    {
        var gate = new SpecialGate();
        gate.Evaluate(100, engaged: true, Observed(), anySpecialOffCooldown: true);
        gate.Evaluate(110, engaged: true, Observed(specialCastEnd: 111), anySpecialOffCooldown: true);

        // A held state needs a deadline push, and a basic-only window needs a server field.
        for (double now = 111; now < 140; now += 0.5)
        {
            var status = gate.Evaluate(now, engaged: true, Observed(), anySpecialOffCooldown: true).Status;
            Assert.True(status is GateStatus.Locked or GateStatus.Armed, $"unexpected {status} at {now}");
        }
    }
}
