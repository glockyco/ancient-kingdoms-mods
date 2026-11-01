using PocketCompendium.Core.Tracking;
using Xunit;

namespace PocketCompendium.Tests.Tracking;

public sealed class WorldMemoryTests
{
    private const string Key = "Xylevis";

    // Corpse 300 s, respawn 1800 s.
    private static readonly SpawnRules Rules = new(SpawnOrigin.Placed, 1800, 300, 1f, 0, 0, summoned: false);

    private static readonly ClientReading Alive = new() { Spawned = true, Alive = true };
    private static readonly ClientReading Corpse = new() { Spawned = true };

    [Fact]
    public void A_corpse_right_after_a_sighting_is_a_death_seen_as_it_happened()
    {
        var world = new WorldMemory();
        world.Observe(Key, Rules, Alive, 100.0);
        world.Observe(Key, Rules, Corpse, 101.0);

        var memory = world.Find(Key);
        Assert.Equal(StateSource.SeenDeath, memory.DeathSource);
        Assert.Equal(101.0, memory.DeathAt);
    }

    [Fact]
    public void A_corpse_found_later_dates_the_death_one_corpse_time_earlier()
    {
        var world = new WorldMemory();
        world.Observe(Key, Rules, Corpse, 1000.0);

        var memory = world.Find(Key);
        Assert.Equal(StateSource.SeenCorpse, memory.DeathSource);
        Assert.Equal(700.0, memory.DeathAt);
    }

    [Fact]
    public void A_corpse_after_the_known_respawn_time_is_a_new_death()
    {
        var world = new WorldMemory();
        world.Observe(Key, Rules, Corpse, 300.0);

        Assert.False(world.Observe(Key, Rules, Corpse, 1000.0));
        Assert.Equal(0.0, world.Find(Key).DeathAt);

        Assert.True(world.Observe(Key, Rules, Corpse, 5000.0));
        Assert.Equal(4700.0, world.Find(Key).DeathAt);
    }

    [Fact]
    public void One_death_is_recorded_once_whether_the_notice_or_the_corpse_comes_first()
    {
        var seenFirst = new WorldMemory();
        seenFirst.Observe(Key, Rules, Alive, 100.0);
        seenFirst.Observe(Key, Rules, Corpse, 101.0);
        Assert.False(seenFirst.KillNotice(Key, Rules, 101.5));
        Assert.Equal(StateSource.SeenDeath, seenFirst.Find(Key).DeathSource);

        var noticeFirst = new WorldMemory();
        noticeFirst.KillNotice(Key, Rules, 200.0);
        Assert.False(noticeFirst.Observe(Key, Rules, Corpse, 260.0));
        Assert.Equal(StateSource.KillNotice, noticeFirst.Find(Key).DeathSource);
        Assert.Equal(200.0, noticeFirst.Find(Key).DeathAt);
    }

    [Fact]
    public void A_renewal_makes_a_remembered_death_due_at_once()
    {
        var world = new WorldMemory();
        world.KillNotice(Key, Rules, 1000.0);

        Assert.True(world.Renewal(Key, Rules, 1500.0));
        var state = SpawnResolver.Client(Rules, default, world.Find(Key), 1500.0);
        Assert.Equal(SpawnState.Due, state.State);
        Assert.False(world.Renewal(Key, Rules, 1600.0));
    }

    [Fact]
    public void A_renewal_leaves_a_monster_last_seen_alive_alone()
    {
        var world = new WorldMemory();
        world.Observe(Key, Rules, Alive, 100.0);

        Assert.False(world.Renewal(Key, Rules, 200.0));
        Assert.False(world.Renewal("Unknown", Rules, 200.0));
    }

    [Fact]
    public void Memory_survives_a_save_and_load()
    {
        var world = new WorldMemory();
        world.KillNotice("Troll King Grimlok", Rules, 12345.678);
        world.Observe("Captain Aerendyl", Rules, Alive, 99.5);

        var loaded = WorldMemory.Parse(world.Serialize());

        var grimlok = loaded.Find("Troll King Grimlok");
        Assert.Equal(12345.678, grimlok.DeathAt);
        Assert.Equal(StateSource.KillNotice, grimlok.DeathSource);
        Assert.Null(grimlok.SeenUpAt);

        var aerendyl = loaded.Find("Captain Aerendyl");
        Assert.Null(aerendyl.DeathAt);
        Assert.Equal(99.5, aerendyl.SeenUpAt);
    }

    [Fact]
    public void Unreadable_files_and_lines_are_skipped()
    {
        Assert.Equal(0, WorldMemory.Parse("something else\nXylevis\t1\tKillNotice\t\n").Count);

        var loaded = WorldMemory.Parse("# Pocket Compendium world memory 1\nbroken line\nXylevis\t1\tNoSuchSource\t\nPyroth\t5\tSeenDeath\t\n");
        Assert.Null(loaded.Find("Xylevis"));
        Assert.Equal(5.0, loaded.Find("Pyroth").DeathAt);
    }
}
