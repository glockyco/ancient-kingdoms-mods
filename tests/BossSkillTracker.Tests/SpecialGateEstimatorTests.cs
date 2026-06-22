using BossSkillTracker.Model;
using Xunit;

public sealed class SpecialGateEstimatorTests
{
    private static SpecialGateEstimator Engaged(double start)
    {
        var estimator = new SpecialGateEstimator();
        estimator.Observe(start, engaged: true, currentSkillIndex: -1, isCasting: false, currentIsSpecial: false, currentCastEnd: 0);
        return estimator;
    }

    [Fact]
    public void Warmup_in_first_window()
    {
        var estimator = Engaged(100);
        estimator.Observe(102, engaged: true, currentSkillIndex: -1, isCasting: false, currentIsSpecial: false, currentCastEnd: 0);

        Assert.Equal(GateStatus.Warmup, estimator.Evaluate(102, anySpecialOffCooldown: true).Status);
    }

    [Fact]
    public void Unknown_after_warmup_until_a_special_seen()
    {
        var estimator = Engaged(100);
        estimator.Observe(100 + Tuning.WarmupSeconds + 1, engaged: true, currentSkillIndex: -1, isCasting: false, currentIsSpecial: false, currentCastEnd: 0);

        Assert.Equal(GateStatus.Unknown, estimator.Evaluate(100 + Tuning.WarmupSeconds + 1, anySpecialOffCooldown: true).Status);
    }

    [Fact]
    public void Locked_then_armed_then_idle_after_a_special()
    {
        var estimator = Engaged(100);
        estimator.Observe(108.8, engaged: true, currentSkillIndex: 1, isCasting: true, currentIsSpecial: true, currentCastEnd: 110);
        estimator.Observe(109.5, engaged: true, currentSkillIndex: -1, isCasting: false, currentIsSpecial: false, currentCastEnd: 0);

        var locked = estimator.Evaluate(110 + Tuning.GateMin - 1, anySpecialOffCooldown: true);
        Assert.Equal(GateStatus.Locked, locked.Status);
        Assert.Equal(110 + Tuning.GateMin, locked.WindowStart, 3);
        Assert.Equal(110 + Tuning.GateMax, locked.WindowEnd, 3);

        double inWindow = 110 + Tuning.GateMin + 1;
        Assert.Equal(GateStatus.Armed, estimator.Evaluate(inWindow, anySpecialOffCooldown: true).Status);
        Assert.Equal(GateStatus.Idle, estimator.Evaluate(inWindow, anySpecialOffCooldown: false).Status);
    }

    [Fact]
    public void Disengage_resets_to_unknown()
    {
        var estimator = Engaged(100);
        estimator.Observe(108, engaged: true, currentSkillIndex: 1, isCasting: true, currentIsSpecial: true, currentCastEnd: 110);
        estimator.Observe(120, engaged: false, currentSkillIndex: -1, isCasting: false, currentIsSpecial: false, currentCastEnd: 0);

        Assert.Equal(GateStatus.Unknown, estimator.Evaluate(121, anySpecialOffCooldown: true).Status);
    }
}
