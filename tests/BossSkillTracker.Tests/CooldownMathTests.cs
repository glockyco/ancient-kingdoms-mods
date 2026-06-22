using BossSkillTracker.Model;
using Xunit;

public sealed class CooldownMathTests
{
    [Fact]
    public void Remaining_clamps_to_zero_past_end()
        => Assert.Equal(0.0, CooldownMath.Remaining(10, 12), 5);

    [Fact]
    public void Remaining_positive_before_end()
        => Assert.Equal(3.0, CooldownMath.Remaining(10, 7), 5);

    [Fact]
    public void Fill_full_when_ready()
        => Assert.Equal(1f, CooldownMath.Fill(10, 30f, 10));

    [Fact]
    public void Fill_zero_at_cast()
        => Assert.Equal(0f, CooldownMath.Fill(40, 30f, 10));

    [Fact]
    public void Fill_half_midway()
        => Assert.Equal(0.5f, CooldownMath.Fill(25, 30f, 10), 3);

    [Fact]
    public void Fill_zero_total_is_full()
        => Assert.Equal(1f, CooldownMath.Fill(5, 0f, 0));

    [Fact]
    public void IsReady_at_or_after_end()
    {
        Assert.True(CooldownMath.IsReady(10, 10));
        Assert.False(CooldownMath.IsReady(10, 9));
    }
}
