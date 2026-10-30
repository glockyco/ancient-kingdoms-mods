using BetterBestiary.Ui;
using Xunit;

namespace BetterBestiary.Tests;

/// <summary>
/// The Bestiary page's loot area, as measured in game: a 400 x 128 grid with 8 x 4 spacing that
/// holds twelve 56 px icons.
/// </summary>
public class LootGridLayoutTests
{
    private const float Width = 400f;
    private const float Height = 128f;
    private const float SpacingX = 8f;
    private const float SpacingY = 4f;

    private static LootGridLayout.Layout For(int count) => LootGridLayout.For(count, Width, Height, SpacingX, SpacingY);

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(12)]
    public void UpToTwelveDropsKeepTheGameLayout(int count)
    {
        var layout = For(count);

        Assert.Equal(56f, layout.Cell);
        Assert.Equal(6, layout.Columns);
        Assert.Equal(12, layout.Capacity);
    }

    [Theory]
    [InlineData(13, 50f)]
    [InlineData(14, 50f)]
    [InlineData(15, 43f)]
    [InlineData(16, 43f)]
    [InlineData(17, 40f)]
    [InlineData(24, 40f)]
    public void LargerLootTablesGetTheLargestIconThatFitsEveryDrop(int count, float cell)
    {
        var layout = For(count);

        Assert.Equal(cell, layout.Cell);
        Assert.True(layout.Capacity >= count);
        var rows = (count + layout.Columns - 1) / layout.Columns;
        Assert.True(layout.Columns * layout.Cell + (layout.Columns - 1) * SpacingX <= Width);
        Assert.True(rows * layout.Cell + (rows - 1) * SpacingY <= Height);
    }

    [Fact]
    public void IconsNeverShrinkBelowTheMinimum()
    {
        var layout = For(500);

        Assert.Equal(LootGridLayout.MinCell, layout.Cell);
        Assert.True(layout.Capacity < 500);
    }
}
