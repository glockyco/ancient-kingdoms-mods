using System;

namespace BossSkillTracker.Model;

public static class CooldownMath
{
    public static double Remaining(double cooldownEnd, double now) => Math.Max(0.0, cooldownEnd - now);

    public static float Fill(double cooldownEnd, float total, double now)
    {
        if (total <= 0f) return 1f;

        float fill = (float)(1.0 - Remaining(cooldownEnd, now) / total);
        return fill < 0f ? 0f : fill > 1f ? 1f : fill;
    }

    public static bool IsReady(double cooldownEnd, double now) => cooldownEnd <= now;

    /// <summary>Position of <paramref name="now"/> inside [from, to], clamped to 0..1.</summary>
    public static float Progress(double from, double to, double now)
    {
        if (to <= from) return 1f;

        float progress = (float)((now - from) / (to - from));
        return progress < 0f ? 0f : progress > 1f ? 1f : progress;
    }
}
