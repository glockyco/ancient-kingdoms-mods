#nullable disable
using System;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// The words and times every respawn surface shows for a state. No game references, so the test
/// project compiles this file directly.
/// </summary>
public static class StateText
{
    /// <summary>A countdown rounded up: "4:19" below an hour, "1h 05m" from an hour.</summary>
    public static string Countdown(double seconds)
    {
        int total = (int)Math.Ceiling(Math.Max(0.0, seconds));
        if (total < 3600) return $"{total / 60}:{total % 60:00}";

        int minutes = (total + 59) / 60;
        return $"{minutes / 60}h {minutes % 60:00}m";
    }

    /// <summary>A wait in whole minutes rounded up: "28 min" below an hour, "1h 05m" from an hour.</summary>
    public static string Minutes(double seconds)
    {
        int minutes = Math.Max(1, (int)Math.Ceiling(Math.Max(0.0, seconds) / 60.0));
        return minutes < 60 ? $"{minutes} min" : $"{minutes / 60}h {minutes % 60:00}m";
    }

    /// <summary>The compact tile's caption: "4:19", "1h05", "28m".</summary>
    public static string Short(double seconds)
    {
        int total = (int)Math.Ceiling(Math.Max(0.0, seconds));
        if (total < 3600) return $"{total / 60}:{total % 60:00}";

        int minutes = (total + 59) / 60;
        return $"{minutes / 60}h{minutes % 60:00}";
    }

    /// <summary>How long ago something happened: "just now", "4 min ago", "2h 10m ago".</summary>
    public static string Ago(double seconds)
    {
        if (seconds < 60.0) return "just now";

        int minutes = (int)Math.Floor(seconds / 60.0);
        return minutes < 60 ? $"{minutes} min ago" : $"{minutes / 60}h {minutes % 60:00}m ago";
    }

    /// <summary>The row's value, without its icon.</summary>
    public static string Value(in TrackedState state, double now)
    {
        string mark = state.Estimate ? "~" : "";
        switch (state.State)
        {
            case SpawnState.Up:
                return "Up";
            case SpawnState.InCombat:
                return "In combat";
            case SpawnState.Respawns:
            case SpawnState.Estimated:
            case SpawnState.Chance:
                return mark + Countdown(state.At.Value - now);
            case SpawnState.Window:
                return state.At.HasValue ? mark + Minutes(state.At.Value - now) : "Never";
            case SpawnState.Due:
                return "Due";
            case SpawnState.Guards:
                return state.GuardsLeft >= 0 ? $"{state.GuardsLeft} left" : "Guards";
            case SpawnState.Altar:
                return "Altar";
            case SpawnState.Seen:
                return "Seen up";
            default:
                return "Not seen";
        }
    }

    /// <summary>The compact tile's caption for a state.</summary>
    public static string Caption(in TrackedState state, double now)
    {
        string mark = state.Estimate ? "~" : "";
        switch (state.State)
        {
            case SpawnState.Up:
            case SpawnState.InCombat:
                return "Up";
            case SpawnState.Respawns:
            case SpawnState.Estimated:
            case SpawnState.Chance:
                return mark + Short(state.At.Value - now);
            case SpawnState.Window:
                return state.At.HasValue ? mark + Math.Max(1, (int)Math.Ceiling((state.At.Value - now) / 60.0)) + "m" : "";
            case SpawnState.Due:
                return "Due";
            case SpawnState.Guards:
                return state.GuardsLeft >= 0 ? state.GuardsLeft.ToString() : "";
            case SpawnState.Altar:
                return "Altar";
            case SpawnState.Seen:
                return "Seen";
            default:
                return "?";
        }
    }

    /// <summary>
    /// The share of the wait still to run, for the darkening sweep over a dead portrait, or 0 for
    /// a state without a countdown.
    /// </summary>
    public static float Remaining(in TrackedState state, SpawnRules rules, double now)
    {
        if (state.At == null || state.State is not (SpawnState.Respawns or SpawnState.Estimated or SpawnState.Chance)) return 0f;

        // After a kill the wait is corpse time plus respawn time. After a failed roll, or at world
        // start, it is one respawn time.
        double wait = state.ObservedAt != null && !state.LastRollFailed ? rules.KillToRespawnSeconds : rules.RespawnSeconds;
        if (wait <= 0.0) return 0f;
        return (float)Math.Min(1.0, Math.Max(0.0, (state.At.Value - now) / wait));
    }
}
