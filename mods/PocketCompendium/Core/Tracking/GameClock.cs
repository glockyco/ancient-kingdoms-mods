using System;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// The game's time of day on the server clock. One game day lasts one real hour, so one game hour
/// lasts 150 seconds. <see cref="Hour"/> copies <c>Monster.EventTimeSpawn</c>, float arithmetic
/// included, so the window test agrees with the game to the frame. No game references, so the
/// test project compiles this file directly.
/// </summary>
public static class GameClock
{
    public const double DaySeconds = 3600.0;
    public const double HourSeconds = 150.0;

    public static int Hour(double serverTime) =>
        (short)Math.Floor((double)((float)serverTime % 3600f) / 2.5) / 60;

    /// <summary>Whether <paramref name="hour"/> lies in [start, end), wrapping past midnight.</summary>
    public static bool IsHourBetween(int hour, int start, int end) =>
        start <= end ? hour >= start && hour < end : hour >= start || hour < end;

    /// <summary>Whether a monster with this window may spawn at <paramref name="serverTime"/>.</summary>
    public static bool InWindow(double serverTime, int start, int end) =>
        (start == 0 && end == 0) || IsHourBetween(Hour(serverTime), start, end);

    /// <summary>
    /// The first moment at or after <paramref name="serverTime"/> inside the window, or null for a
    /// window that never opens.
    /// </summary>
    public static double? FirstOpen(double serverTime, int start, int end)
    {
        if (InWindow(serverTime, start, end)) return serverTime;
        if (start == end) return null;

        double open = Math.Floor(serverTime / DaySeconds) * DaySeconds + start * HourSeconds;
        return open > serverTime ? open : open + DaySeconds;
    }
}
