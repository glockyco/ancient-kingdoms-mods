using BossSkillTracker.Model;
using Xunit;

public sealed class ReadoutTests
{
    [Theory]
    [InlineData(0.0)]
    [InlineData(1.0)]
    [InlineData(9.96)]
    [InlineData(12.5)]
    [InlineData(99.9)]
    public void A_countdown_keeps_its_width(double seconds)
        => Assert.Equal(5, Readout.Seconds(seconds).Length);

    [Fact]
    public void A_span_keeps_its_width_across_magnitudes()
        => Assert.Equal(Readout.Span(10.5, 12.5).Length, Readout.Span(9.8, 1.0).Length);

    [Fact]
    public void One_decimal_is_always_shown()
    {
        Assert.EndsWith("1.0s", Readout.Seconds(1.0));
        Assert.EndsWith("12.0s", Readout.Seconds(12.0));
    }

    [Fact]
    public void A_negative_remainder_reads_as_zero()
        => Assert.EndsWith("0.0s", Readout.Seconds(-3.2));

    [Fact]
    public void Padding_uses_a_character_tmp_keeps()
    {
        Assert.StartsWith("\u00A0", Readout.Seconds(1.0));
        Assert.DoesNotContain(" ", Readout.Seconds(1.0));
    }
}
