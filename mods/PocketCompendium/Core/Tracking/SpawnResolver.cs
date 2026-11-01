#nullable disable
using System;

namespace PocketCompendium.Core.Tracking;

/// <summary>What a host reads from one tracked monster's live object.</summary>
public struct HostReading
{
    /// <summary>A live object exists: the placement, or a running altar or placeholder spawn.</summary>
    public bool Present;

    /// <summary>
    /// The placement ran <c>Start</c>, which applies the saved deadline. Before that, its zone has
    /// been empty since the world started, and the object still shows its full health.
    /// </summary>
    public bool Started;

    public bool Alive;
    public bool Engaged;

    /// <summary><c>respawnTimeEnd</c> once started, the saved deadline before that, 0 for none.</summary>
    public double Deadline;

    public bool SummonReady;
    public int GuardsAlive;
    public int GuardsTotal;
    public bool LastRollFailed;
    public double? KilledAt;
}

/// <summary>What a client sees of one tracked monster now.</summary>
public struct ClientReading
{
    /// <summary>Spawned for this client, which means in range and not hidden.</summary>
    public bool Spawned;

    public bool Alive;
    public bool Engaged;
}

/// <summary>
/// Turns spawn rules and readings into one named state. No game references, so the test project
/// compiles this file directly.
/// </summary>
public static class SpawnResolver
{
    public static TrackedState Host(SpawnRules rules, in HostReading reading, double now)
    {
        if (rules.Origin != SpawnOrigin.Placed)
            return reading.Present && reading.Alive
                ? Live(reading.Engaged, StateSource.Host, now)
                : NotPlaced(rules, reading.GuardsAlive, reading.GuardsTotal, StateSource.Host);

        if (!reading.Started) return Unstarted(rules, reading, now);
        if (reading.Alive)
            return CountsAsUp(rules, reading.Engaged, now)
                ? Live(reading.Engaged, StateSource.Host, now)
                : Window(rules, now, estimate: false, StateSource.Host, observedAt: null);

        return Dead(rules, reading.Deadline, now, estimate: false, StateSource.Host, reading.KilledAt, reading.LastRollFailed,
            new Guards(reading.SummonReady, reading.GuardsAlive, reading.GuardsTotal));
    }

    public static TrackedState Client(SpawnRules rules, in ClientReading reading, MonsterMemory memory, double now)
    {
        if (reading.Spawned && reading.Alive && CountsAsUp(rules, reading.Engaged, now))
            return Live(reading.Engaged, StateSource.Sighting, now);

        // The window is exact on a client too, because the server clock is.
        if (rules.HasWindow && !GameClock.InWindow(now, rules.WindowStart, rules.WindowEnd))
            return Window(rules, now, estimate: false, StateSource.None, observedAt: null);

        if (rules.Origin != SpawnOrigin.Placed) return NotPlaced(rules, -1, 0, StateSource.None);

        if (memory != null && memory.KnowsDeath)
            return Dead(rules, memory.DeathAt.Value + rules.KillToRespawnSeconds, now, estimate: true, memory.DeathSource,
                memory.DeathAt, lastRollFailed: false, Guards.Unknown);

        if (memory?.SeenUpAt != null)
            return new TrackedState { State = SpawnState.Seen, Source = StateSource.Sighting, ObservedAt = memory.SeenUpAt, GuardsLeft = -1 };

        return new TrackedState { State = SpawnState.NotSeen, GuardsLeft = -1 };
    }

    /// <summary>
    /// Outside its window the game hides an idle monster at its next update, and one in an empty
    /// zone when someone enters, so a live one is up only while it fights. Clients see this case
    /// for bosses the game shows to everyone, while their empty zone keeps them at full health.
    /// </summary>
    internal static bool CountsAsUp(SpawnRules rules, bool engaged, double now) =>
        engaged || !rules.HasWindow || GameClock.InWindow(now, rules.WindowStart, rules.WindowEnd);

    // Start runs when someone first enters the zone. SetRespawnBosses then applies the saved
    // deadline, starts a rolling monster dead for one more interval, and hides summoned ones.
    private static TrackedState Unstarted(SpawnRules rules, in HostReading reading, double now)
    {
        if (reading.Deadline > now || rules.Summoned)
            return Dead(rules, reading.Deadline, now, estimate: false, StateSource.Host, observedAt: null, lastRollFailed: false,
                new Guards(ready: false, reading.GuardsAlive, reading.GuardsTotal));

        if (rules.Rolls)
            return new TrackedState { State = SpawnState.Due, Source = StateSource.Host, WaitsForEntry = true };

        if (rules.HasWindow && !GameClock.InWindow(now, rules.WindowStart, rules.WindowEnd))
            return Window(rules, now, estimate: false, StateSource.Host, observedAt: null);

        return new TrackedState { State = SpawnState.Up, Source = StateSource.Host };
    }

    // Follows Monster.UpdateServer_DEAD: the deadline, then the window, then summon readiness.
    private static TrackedState Dead(SpawnRules rules, double deadline, double now, bool estimate, StateSource source,
        double? observedAt, bool lastRollFailed, Guards guards)
    {
        double from = Math.Max(now, deadline);
        if (rules.HasWindow)
        {
            double? open = GameClock.FirstOpen(from, rules.WindowStart, rules.WindowEnd);
            if (open == null || open.Value > from) return Window(rules, from, estimate, source, observedAt);
        }

        if (deadline > now)
            return new TrackedState
            {
                State = rules.Rolls ? SpawnState.Chance : estimate ? SpawnState.Estimated : SpawnState.Respawns,
                At = deadline,
                Estimate = estimate,
                Source = source,
                ObservedAt = observedAt,
                LastRollFailed = lastRollFailed,
                GuardsLeft = guards.Alive,
                GuardsTotal = guards.Total,
            };

        if (rules.Summoned && guards.Known && !guards.Ready)
            return new TrackedState
            {
                State = SpawnState.Guards,
                Source = source,
                ObservedAt = observedAt,
                GuardsLeft = guards.Alive,
                GuardsTotal = guards.Total,
            };

        return new TrackedState
        {
            State = SpawnState.Due,
            Estimate = estimate,
            Source = source,
            ObservedAt = observedAt,
            LastRollFailed = lastRollFailed,
            GuardsLeft = guards.Alive,
            GuardsTotal = guards.Total,
        };
    }

    private static TrackedState Window(SpawnRules rules, double from, bool estimate, StateSource source, double? observedAt) =>
        new()
        {
            State = SpawnState.Window,
            At = GameClock.FirstOpen(from, rules.WindowStart, rules.WindowEnd),
            Estimate = estimate,
            Source = source,
            ObservedAt = observedAt,
            GuardsLeft = -1,
        };

    private static TrackedState NotPlaced(SpawnRules rules, int guardsAlive, int guardsTotal, StateSource source) =>
        rules.Origin == SpawnOrigin.Altar
            ? new TrackedState { State = SpawnState.Altar, Source = source, GuardsLeft = -1 }
            : new TrackedState { State = SpawnState.Guards, Source = source, GuardsLeft = guardsAlive, GuardsTotal = guardsTotal };

    private static TrackedState Live(bool engaged, StateSource source, double now) =>
        new()
        {
            State = engaged ? SpawnState.InCombat : SpawnState.Up,
            Source = source,
            ObservedAt = now,
            GuardsLeft = -1,
        };

    private readonly struct Guards
    {
        public static readonly Guards Unknown = new(ready: false, alive: -1, total: 0);

        public Guards(bool ready, int alive, int total)
        {
            Ready = ready;
            Alive = alive;
            Total = total;
        }

        public bool Ready { get; }
        public int Alive { get; }
        public int Total { get; }
        public bool Known => Alive >= 0;
    }
}
