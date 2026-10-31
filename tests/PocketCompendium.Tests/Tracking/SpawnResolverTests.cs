using PocketCompendium.Core.Tracking;
using Xunit;

namespace PocketCompendium.Tests.Tracking;

public sealed class SpawnResolverTests
{
    // Rules as the game authors them.
    private static readonly SpawnRules Xylevis = new(SpawnOrigin.Placed, 1800, 300, 1f, 0, 0, summoned: false);
    private static readonly SpawnRules SpiritOfTheForest = new(SpawnOrigin.Placed, 7200, 300, 1f, 20, 8, summoned: false);
    private static readonly SpawnRules ForsakenSkeleton = new(SpawnOrigin.Placed, 1800, 120, 0.75f, 0, 0, summoned: false);
    private static readonly SpawnRules SeerKzhal = new(SpawnOrigin.Placed, 600, 120, 0.2f, 0, 0, summoned: false);
    private static readonly SpawnRules TrollKingGrimlok = new(SpawnOrigin.Placed, 3600, 300, 1f, 0, 0, summoned: false);
    private static readonly SpawnRules TheArchon = new(SpawnOrigin.Placed, 3600, 300, 1f, 0, 0, summoned: true);
    private static readonly SpawnRules VyrissTheWithered = new(SpawnOrigin.Altar, 10, 120, 1f, 0, 0, summoned: false);
    private static readonly SpawnRules KeeperRemnant = new(SpawnOrigin.Placeholder, 10, 120, 1f, 0, 0, summoned: false);

    // Game hour 19 of a game day, one game hour before Spirit of the Forest's window opens.
    private const double Hour19 = 36000.0 + 19 * GameClock.HourSeconds;
    private const double Hour20 = 36000.0 + 20 * GameClock.HourSeconds;

    private static HostReading Started(bool alive = false, double deadline = 0.0) =>
        new() { Present = true, Started = true, Alive = alive, Deadline = deadline };

    [Fact]
    public void A_host_kill_counts_down_corpse_time_plus_respawn_time()
    {
        var reading = Started(deadline: 10000.0 + 2100.0);
        reading.KilledAt = 10000.0;

        var state = SpawnResolver.Host(Xylevis, reading, 10000.0);

        Assert.Equal(SpawnState.Respawns, state.State);
        Assert.Equal(12100.0, state.At);
        Assert.False(state.Estimate);
        Assert.Equal(10000.0, state.ObservedAt);
    }

    [Fact]
    public void An_engaged_monster_is_in_combat()
    {
        var reading = Started(alive: true);
        Assert.Equal(SpawnState.Up, SpawnResolver.Host(Xylevis, reading, 100.0).State);

        reading.Engaged = true;
        Assert.Equal(SpawnState.InCombat, SpawnResolver.Host(Xylevis, reading, 100.0).State);
    }

    [Fact]
    public void A_window_boss_hidden_at_full_health_waits_for_its_window_and_is_never_up()
    {
        // The game hides it and sets it DEAD without touching its health.
        var hidden = SpawnResolver.Host(SpiritOfTheForest, Started(), Hour19);
        Assert.Equal(SpawnState.Window, hidden.State);
        Assert.Equal(Hour20, hidden.At);

        // In a zone nobody entered yet, the object still reads alive at full health.
        var unstarted = SpawnResolver.Host(SpiritOfTheForest, new HostReading { Present = true, Alive = true }, Hour19);
        Assert.Equal(SpawnState.Window, unstarted.State);
        Assert.Equal(Hour20, unstarted.At);
    }

    [Fact]
    public void A_window_boss_whose_respawn_falls_outside_its_window_waits_for_the_next_opening()
    {
        double deadline = 36000.0 + 10 * GameClock.HourSeconds;

        var state = SpawnResolver.Host(SpiritOfTheForest, Started(deadline: deadline), deadline - 600.0);

        Assert.Equal(SpawnState.Window, state.State);
        Assert.Equal(Hour20, state.At);
    }

    [Fact]
    public void A_failed_roll_shows_the_time_to_the_next_roll()
    {
        var reading = Started(deadline: 5000.0);
        reading.LastRollFailed = true;

        var state = SpawnResolver.Host(ForsakenSkeleton, reading, 3605.0);

        Assert.Equal(SpawnState.Chance, state.State);
        Assert.Equal(5000.0, state.At);
        Assert.True(state.LastRollFailed);
    }

    [Fact]
    public void An_elapsed_roll_in_an_empty_zone_is_due()
    {
        var state = SpawnResolver.Host(SeerKzhal, Started(deadline: 900.0), 1000.0);

        Assert.Equal(SpawnState.Due, state.State);
        Assert.False(state.WaitsForEntry);
    }

    [Fact]
    public void A_rolling_monster_in_a_zone_empty_since_the_world_started_waits_for_entry()
    {
        // Start would kill it for one more interval before its first roll.
        var state = SpawnResolver.Host(SeerKzhal, new HostReading { Present = true, Alive = true }, 1000.0);

        Assert.Equal(SpawnState.Due, state.State);
        Assert.True(state.WaitsForEntry);
    }

    [Fact]
    public void A_monster_that_has_not_started_follows_its_saved_deadline()
    {
        var dead = SpawnResolver.Host(Xylevis, new HostReading { Present = true, Alive = true, Deadline = 2000.0 }, 1000.0);
        Assert.Equal(SpawnState.Respawns, dead.State);
        Assert.Equal(2000.0, dead.At);

        var up = SpawnResolver.Host(Xylevis, new HostReading { Present = true, Alive = true, Deadline = 900.0 }, 1000.0);
        Assert.Equal(SpawnState.Up, up.State);
    }

    [Fact]
    public void A_summoned_monster_waits_for_a_fresh_kill_of_its_guards_after_its_time()
    {
        var reading = Started(deadline: 900.0);
        reading.GuardsAlive = 3;
        reading.GuardsTotal = 8;

        var waiting = SpawnResolver.Host(TheArchon, reading, 1000.0);
        Assert.Equal(SpawnState.Guards, waiting.State);
        Assert.Equal(3, waiting.GuardsLeft);
        Assert.Equal(8, waiting.GuardsTotal);

        reading.SummonReady = true;
        Assert.Equal(SpawnState.Due, SpawnResolver.Host(TheArchon, reading, 1000.0).State);

        Assert.Equal(SpawnState.Respawns, SpawnResolver.Host(TheArchon, Started(deadline: 1100.0), 1000.0).State);
    }

    [Fact]
    public void An_altar_monster_is_altar_until_an_event_spawns_it()
    {
        Assert.Equal(SpawnState.Altar, SpawnResolver.Host(VyrissTheWithered, new HostReading(), 100.0).State);
        Assert.Equal(SpawnState.Up, SpawnResolver.Host(VyrissTheWithered, new HostReading { Present = true, Alive = true }, 100.0).State);
    }

    [Fact]
    public void A_placeholder_spawn_waits_for_the_monster_whose_death_spawns_it()
    {
        var state = SpawnResolver.Host(KeeperRemnant, new HostReading { GuardsAlive = 1, GuardsTotal = 1 }, 100.0);

        Assert.Equal(SpawnState.Guards, state.State);
        Assert.Equal(1, state.GuardsLeft);
    }

    [Fact]
    public void A_kill_notice_estimates_corpse_time_plus_respawn_time()
    {
        var memory = new MonsterMemory { DeathAt = 5000.0, DeathSource = StateSource.KillNotice };

        var state = SpawnResolver.Client(TrollKingGrimlok, new ClientReading(), memory, 5000.0);

        Assert.Equal(SpawnState.Estimated, state.State);
        Assert.Equal(5000.0 + 3900.0, state.At);
        Assert.True(state.Estimate);
        Assert.Equal(StateSource.KillNotice, state.Source);
        Assert.Equal(5000.0, state.ObservedAt);
    }

    [Fact]
    public void A_client_estimate_for_a_rolling_monster_is_an_estimated_roll()
    {
        var memory = new MonsterMemory { DeathAt = 100.0, DeathSource = StateSource.SeenDeath };

        var state = SpawnResolver.Client(ForsakenSkeleton, new ClientReading(), memory, 200.0);

        Assert.Equal(SpawnState.Chance, state.State);
        Assert.True(state.Estimate);
    }

    [Fact]
    public void A_passed_estimate_is_due()
    {
        var memory = new MonsterMemory { DeathAt = 100.0, DeathSource = StateSource.KillNotice };

        var state = SpawnResolver.Client(TrollKingGrimlok, new ClientReading(), memory, 100.0 + 4000.0);

        Assert.Equal(SpawnState.Due, state.State);
        Assert.True(state.Estimate);
    }

    [Fact]
    public void The_latest_news_wins_between_a_death_and_a_sighting()
    {
        var memory = new MonsterMemory { DeathAt = 100.0, DeathSource = StateSource.SeenDeath, SeenUpAt = 5000.0 };

        var seen = SpawnResolver.Client(TrollKingGrimlok, new ClientReading(), memory, 6000.0);
        Assert.Equal(SpawnState.Seen, seen.State);
        Assert.Equal(5000.0, seen.ObservedAt);

        Assert.Equal(SpawnState.NotSeen, SpawnResolver.Client(TrollKingGrimlok, new ClientReading(), null, 6000.0).State);
    }

    [Fact]
    public void A_client_shows_the_window_exactly()
    {
        var window = SpawnResolver.Client(SpiritOfTheForest, new ClientReading(), null, Hour19);
        Assert.Equal(SpawnState.Window, window.State);
        Assert.Equal(Hour20, window.At);
        Assert.False(window.Estimate);

        var up = SpawnResolver.Client(SpiritOfTheForest, new ClientReading { Spawned = true, Alive = true }, null, Hour20);
        Assert.Equal(SpawnState.Up, up.State);
        Assert.Equal(StateSource.Sighting, up.Source);
    }

    [Fact]
    public void A_live_window_boss_outside_its_window_is_up_only_while_it_fights()
    {
        // Clients see this for bosses the game shows to everyone, frozen at full health while
        // their zone is empty. A host sees it for a boss caught by the window's end.
        var idle = new ClientReading { Spawned = true, Alive = true };
        Assert.Equal(SpawnState.Window, SpawnResolver.Client(SpiritOfTheForest, idle, null, Hour19).State);
        Assert.Equal(SpawnState.Window, SpawnResolver.Host(SpiritOfTheForest, Started(alive: true), Hour19).State);

        var fighting = new ClientReading { Spawned = true, Alive = true, Engaged = true };
        Assert.Equal(SpawnState.InCombat, SpawnResolver.Client(SpiritOfTheForest, fighting, null, Hour19).State);

        var world = new WorldMemory();
        Assert.False(world.Observe("Spirit of the Forest", SpiritOfTheForest, idle, Hour19));
        Assert.Null(world.Find("Spirit of the Forest"));
    }
}
