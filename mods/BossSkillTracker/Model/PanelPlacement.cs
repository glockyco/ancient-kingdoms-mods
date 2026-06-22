using System;

namespace BossSkillTracker.Model;

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
    public static PanelPoint ClampCentered(float x, float y, float screenWidth, float screenHeight, float panelWidth, float panelHeight, float pad)
    {
        float halfWidth = screenWidth * 0.5f;
        float halfHeight = screenHeight * 0.5f;
        float halfPanelWidth = panelWidth * 0.5f;
        float halfPanelHeight = panelHeight * 0.5f;

        float minX = -halfWidth + pad + halfPanelWidth;
        float maxX = halfWidth - pad - halfPanelWidth;
        float minY = -halfHeight + pad + halfPanelHeight;
        float maxY = halfHeight - pad - halfPanelHeight;

        return new PanelPoint(Clamp(x, minX, maxX), Clamp(y, minY, maxY));
    }

    private static float Clamp(float value, float min, float max)
    {
        if (min > max) return 0f;
        return Math.Min(Math.Max(value, min), max);
    }
}
