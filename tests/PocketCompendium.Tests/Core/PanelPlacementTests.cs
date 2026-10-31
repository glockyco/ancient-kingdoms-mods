using PocketCompendium.Core.Ui;
using Xunit;

namespace PocketCompendium.Tests.Core;

public sealed class PanelPlacementTests
{
    // A 1920x1080 canvas spans -960..960 and -540..540. Margin 6, header 30.
    [Theory]
    [InlineData(100f, 200f, 300f, 400f, 100f, 200f)] // Inside: stays put.
    [InlineData(1000f, 200f, 300f, 400f, 654f, 200f)] // Past the right edge: full width shows.
    [InlineData(-1200f, 200f, 300f, 400f, -954f, 200f)] // Past the left edge.
    [InlineData(100f, 700f, 300f, 400f, 100f, 534f)] // Above the top.
    [InlineData(100f, -900f, 300f, 400f, 100f, -504f)] // Below the bottom: only the header must show.
    [InlineData(100f, -900f, 300f, 20f, 100f, -514f)] // Shorter than the header: all of it shows.
    [InlineData(500f, 200f, 2000f, 400f, -954f, 200f)] // Wider than the canvas: left edge shows.
    public void Keeps_the_full_width_and_the_header_on_the_canvas(float x, float y, float width, float height, float expectedX, float expectedY)
    {
        var kept = PanelPlacement.KeepVisible(x, y, 1920f, 1080f, width, height, 30f, 6f);

        Assert.Equal(expectedX, kept.X);
        Assert.Equal(expectedY, kept.Y);
    }
}
