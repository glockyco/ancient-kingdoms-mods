using BossSkillTracker.Model;
using Xunit;

public sealed class RowLayoutTests
{
    [Fact]
    public void Name_right_edge_uses_state_slot_when_not_casting()
    {
        var layout = RowLayout.For(Tuning.RowStateWidth, Tuning.Pad, Tuning.RowCastWidth, casting: false);

        Assert.Equal(-(Tuning.RowStateWidth + Tuning.Pad), layout.NameRightOffset);
        Assert.False(layout.ShowCastLabel);
    }

    [Fact]
    public void Name_right_edge_reserves_casting_label_when_casting()
    {
        var layout = RowLayout.For(Tuning.RowStateWidth, Tuning.Pad, Tuning.RowCastWidth, casting: true);

        Assert.Equal(-(Tuning.RowStateWidth + Tuning.Pad + Tuning.RowCastWidth), layout.NameRightOffset);
        Assert.True(layout.ShowCastLabel);
    }
}
