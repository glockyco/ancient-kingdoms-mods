using System;

namespace PocketCompendium.Core.Ui;

/// <summary>A panel's top-left corner in canvas units, relative to the canvas centre.</summary>
public readonly struct PanelPoint
{
    public readonly float X;
    public readonly float Y;

    public PanelPoint(float x, float y)
    {
        X = x;
        Y = y;
    }
}

public static class PanelPlacement
{
    /// <summary>
    /// Moves a panel back inside the canvas so its full width and at least
    /// <paramref name="visibleHeight"/> of its top show. A panel wider than the canvas keeps its
    /// left edge in view. Sizes are in canvas units after the panel's scale.
    /// </summary>
    public static PanelPoint KeepVisible(float x, float y, float canvasWidth, float canvasHeight, float width, float height, float visibleHeight, float margin)
    {
        float minX = -canvasWidth * 0.5f + margin;
        float maxX = canvasWidth * 0.5f - margin - width;
        float maxY = canvasHeight * 0.5f - margin;
        float minY = -canvasHeight * 0.5f + margin + Math.Min(height, visibleHeight);

        return new PanelPoint(maxX < minX ? minX : Clamp(x, minX, maxX), Clamp(y, minY, maxY));
    }

    // With min above max, max wins, so a canvas too short for the header keeps the top in view.
    private static float Clamp(float value, float min, float max) => Math.Min(Math.Max(value, min), max);
}
