using BossSkillTracker.Model;
using Xunit;

public sealed class PanelPlacementTests
{
    [Fact]
    public void Defaults_place_panel_at_center_anchor()
    {
        Assert.Equal(0f, Tuning.PanelDefaultX);
        Assert.Equal(0f, Tuning.PanelDefaultY);
    }

    [Fact]
    public void Clamp_centered_panel_keeps_all_edges_visible()
    {
        var clamped = PanelPlacement.ClampCentered(-900f, -700f, 1920f, 1080f, 300f, 400f, 6f);

        Assert.Equal(-804f, clamped.X);
        Assert.Equal(-334f, clamped.Y);
    }

    [Fact]
    public void Clamp_centered_panel_keeps_center_when_visible()
    {
        var clamped = PanelPlacement.ClampCentered(0f, 0f, 1920f, 1080f, 300f, 400f, 6f);

        Assert.Equal(0f, clamped.X);
        Assert.Equal(0f, clamped.Y);
    }
}
