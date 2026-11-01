using System.Collections.Generic;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Features.BossList.Model;
using Xunit;

namespace PocketCompendium.Tests.BossList;

public sealed class ListModelTests
{
    private const int CrescentCoast = 4;
    private const int TwilightForest = 1;

    private static ListEntry Entry(string key, int zone, int level, SpawnState state, double? at = null, float distance = float.NaN, bool watched = false) =>
        new()
        {
            Key = key,
            Zone = zone,
            Tier = Tier.Boss,
            Level = level,
            State = new TrackedState { State = state, At = at },
            Watched = watched,
            Discovered = true,
            Distance = distance,
        };

    private static List<ListGroup> Build(IReadOnlyList<ListEntry> entries, ListFilter filter, int playerLevel = 14)
    {
        var groups = new List<ListGroup>();
        ListModel.Build(entries, filter, playerLevel, CrescentCoast, groups);
        return groups;
    }

    [Fact]
    public void The_players_zone_comes_first_and_watched_monsters_elsewhere_follow_under_their_zone()
    {
        var entries = new[]
        {
            Entry("Spirit of the Forest", TwilightForest, 55, SpawnState.Window, at: 1680.0, watched: true),
            Entry("Seer Kzhal", TwilightForest, 42, SpawnState.Due),
            Entry("Xylevis", CrescentCoast, 12, SpawnState.Respawns, at: 259.0, distance: 4f),
        };

        var groups = Build(entries, new ListFilter());

        Assert.Equal(new[] { CrescentCoast, TwilightForest }, groups.ConvertAll(group => group.Zone));
        Assert.Equal(new[] { 2 }, groups[0].Rows);
        Assert.Equal(new[] { 0 }, groups[1].Rows);
        Assert.Equal("1 watched", ListModel.CountText(groups[1], ZoneFilter.ThisZone));
    }

    [Fact]
    public void Near_my_level_collapses_monsters_far_above_into_one_line_but_keeps_watched_ones()
    {
        var entries = new[]
        {
            Entry("Ancient Cyclops", CrescentCoast, 55, SpawnState.Up, distance: 208f),
            Entry("Forsaken Skeleton", CrescentCoast, 25, SpawnState.Chance, at: 1395.0, distance: 199f),
            Entry("Vyriss the Withered", CrescentCoast, 40, SpawnState.Altar, distance: 259f),
            Entry("Xylevis", CrescentCoast, 12, SpawnState.Respawns, at: 259.0, distance: 4f),
            Entry("Seer Kzhal", TwilightForest, 42, SpawnState.Due, watched: true),
        };

        var groups = Build(entries, new ListFilter { Levels = LevelFilter.NearMine });

        Assert.Equal(new[] { 3 }, groups[0].Rows);
        Assert.Equal("3 more than 10 levels above you", groups[0].HiddenText);
        Assert.Equal("1 of 4", ListModel.CountText(groups[0], ZoneFilter.ThisZone));
        Assert.Equal(new[] { 4 }, groups[1].Rows);
    }

    [Fact]
    public void This_zone_leaves_out_unwatched_monsters_of_other_zones_and_all_zones_lists_them()
    {
        var entries = new[]
        {
            Entry("Xylevis", CrescentCoast, 12, SpawnState.Up),
            Entry("Seer Kzhal", TwilightForest, 42, SpawnState.Due),
        };

        Assert.Single(Build(entries, new ListFilter()));
        Assert.Equal(2, Build(entries, new ListFilter { Zones = ZoneFilter.AllZones }).Count);
    }

    [Fact]
    public void Sorting_by_state_puts_the_nearest_up_monster_first_then_the_soonest_spawn()
    {
        var entries = new[]
        {
            Entry("Altar", CrescentCoast, 12, SpawnState.Altar),
            Entry("Late", CrescentCoast, 12, SpawnState.Respawns, at: 900.0),
            Entry("Far up", CrescentCoast, 12, SpawnState.Up, distance: 200f),
            Entry("Soon", CrescentCoast, 12, SpawnState.Chance, at: 100.0),
            Entry("Near up", CrescentCoast, 12, SpawnState.Up, distance: 20f),
        };

        var groups = Build(entries, new ListFilter());

        Assert.Equal(new[] { 4, 2, 3, 1, 0 }, groups[0].Rows);
    }
}
