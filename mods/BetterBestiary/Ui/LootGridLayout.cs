using System;

namespace BetterBestiary.Ui;

/// <summary>
/// Picks the loot grid's icon size so that every drop fits the page's loot area. The game's
/// layout holds 12 icons of 56 px. Larger loot tables get the largest smaller icon that fits, in
/// whole pixels, keeping the game's spacing. No game references, so the test project compiles
/// this file directly.
/// </summary>
internal static class LootGridLayout
{
    internal const float VanillaCell = 56f;
    internal const float MinCell = 32f;

    internal readonly record struct Layout(float Cell, int Columns, int Capacity)
    {
        internal float Scale => Cell / VanillaCell;
    }

    /// <summary>
    /// The layout for <paramref name="count"/> icons in a <paramref name="width"/> x
    /// <paramref name="height"/> area with the given spacing. A count that fits the game's layout
    /// gets it unchanged. A count that fits no icon down to <see cref="MinCell"/> gets the
    /// smallest icon, and the caller shows as many as <see cref="Layout.Capacity"/> allows.
    /// </summary>
    internal static Layout For(int count, float width, float height, float spacingX, float spacingY)
    {
        var vanilla = Fit(VanillaCell, width, height, spacingX, spacingY);
        if (count <= vanilla.Capacity)
            return vanilla;

        for (var cell = VanillaCell - 1f; cell >= MinCell; cell -= 1f)
        {
            var layout = Fit(cell, width, height, spacingX, spacingY);
            if (count <= layout.Capacity)
                return layout;
        }

        return Fit(MinCell, width, height, spacingX, spacingY);
    }

    private static Layout Fit(float cell, float width, float height, float spacingX, float spacingY)
    {
        var columns = Math.Max(1, (int)Math.Floor((width + spacingX) / (cell + spacingX)));
        var rows = Math.Max(1, (int)Math.Floor((height + spacingY) / (cell + spacingY)));
        return new Layout(cell, columns, columns * rows);
    }
}
