using System.Collections.Generic;
using System.Linq;
using PocketCompendium.Features.Gathering.Model;
using Xunit;

namespace PocketCompendium.Tests.Gathering;

public sealed class GatherLogicTests
{
    private const int LoneLands = 2;
    private const double Now = 1000.0;

    private static GatherNode Herb(string name, float x, double readyAt, int zone = LoneLands, int level = 1) =>
        new(GatherCategory.Herbs, name, zone, x, 0f, level) { ReadyAt = readyAt };

    private static GatherNode Spot(string kind, int level, params string[] fish) =>
        new(GatherCategory.Fishing, kind, LoneLands, 0f, 0f, level, fish) { ReadyAt = 0.0 };

    [Fact]
    public void Ready_and_growing_nodes_count_apart_and_the_next_time_is_the_earliest()
    {
        var chamomile = new GatherType(GatherCategory.Herbs, "Chamomile", 1);
        var nodes = new[]
        {
            Herb("Chamomile", 0f, Now - 1),
            Herb("Chamomile", 1f, Now),
            Herb("Chamomile", 2f, Now + 300),
            Herb("Chamomile", 3f, Now + 120),
            Herb("Spike", 4f, Now + 10),
        };

        var summary = GatherLogic.Summarize(nodes, chamomile, Now);

        Assert.Equal(4, summary.Total);
        Assert.Equal(2, summary.Ready);
        Assert.Equal(Now + 120, summary.NextAt);
        Assert.False(summary.Estimate);
    }

    [Fact]
    public void Fishing_spots_are_always_ready_and_a_fish_counts_the_spots_that_list_it()
    {
        var catfish = new GatherType(GatherCategory.Fishing, "Ironjaw Catfish", 0);
        var nodes = new[]
        {
            Spot("Calm Fishing Spot", 0, "Blue Dartfish", "Emberfin Snapper"),
            Spot("Calm Fishing Spot", 0, "Ironjaw Catfish", "Driftscale Catfish"),
            Spot("Calm Fishing Spot", 0, "Ironjaw Catfish", "Driftscale Catfish"),
            new GatherNode(GatherCategory.Fishing, "Rough Fishing Spot", LoneLands, 0f, 0f, 1, new[] { "Redbubble Grouper" }) { ReadyAt = Now + 999 },
        };

        var summary = GatherLogic.Summarize(nodes, catfish, Now);

        Assert.Equal(2, summary.Total);
        Assert.Equal(2, summary.Ready);
        Assert.Null(summary.NextAt);
        Assert.True(nodes[3].IsReady(Now));
    }

    [Fact]
    public void A_fish_listed_by_spots_of_several_levels_takes_the_easiest_and_every_zone()
    {
        var nodes = new[]
        {
            new GatherNode(GatherCategory.Fishing, "Rough Fishing Spot", 3, 0f, 0f, 1, new[] { "Crimson Pike" }),
            new GatherNode(GatherCategory.Fishing, "Calm Fishing Spot", LoneLands, 0f, 0f, 0, new[] { "Crimson Pike", "Blue Dartfish" }),
            Herb("Chamomile", 0f, 0.0, level: 1),
            Herb("Rose", 0f, 0.0, zone: 1, level: 0),
        };

        var types = GatherLogic.Types(nodes);

        var pike = types[GatherCategory.Fishing].Single(type => type.Name == "Crimson Pike");
        Assert.Equal(0, pike.Level);
        Assert.Equal(new[] { LoneLands, 3 }, pike.Zones);
        Assert.Equal(new[] { "Blue Dartfish", "Crimson Pike" }, types[GatherCategory.Fishing].Select(type => type.Name));
        Assert.Equal(new[] { "Rose", "Chamomile" }, types[GatherCategory.Herbs].Select(type => type.Name));
        Assert.Empty(types[GatherCategory.Ores]);
    }

    [Fact]
    public void A_spark_that_has_not_appeared_counts_as_growing_until_it_appears()
    {
        var spark = new GatherType(GatherCategory.Sparks, "Radiant Spark", 0);
        var nodes = new[] { new GatherNode(GatherCategory.Sparks, "Radiant Spark", LoneLands, 0f, 0f, 0) { ReadyAt = Now + 2400 } };

        var summary = GatherLogic.Summarize(nodes, spark, Now);

        Assert.Equal(0, summary.Ready);
        Assert.Equal(Now + 2400, summary.NextAt);
        Assert.Equal(1, GatherLogic.Summarize(nodes, spark, Now + 2400).Ready);
    }

    [Fact]
    public void A_stale_node_marks_the_count_as_an_estimate()
    {
        var chamomile = new GatherType(GatherCategory.Herbs, "Chamomile", 1);
        var nodes = new[] { Herb("Chamomile", 0f, Now - 1), new GatherNode(GatherCategory.Herbs, "Chamomile", LoneLands, 5f, 0f, 1) { ReadyAt = Now - 1, Stale = true } };

        Assert.True(GatherLogic.Summarize(nodes, chamomile, Now).Estimate);
    }

    [Fact]
    public void The_arrow_takes_the_nearest_ready_node_off_screen()
    {
        var watched = new List<GatherType> { new(GatherCategory.Herbs, "Chamomile", 1) };
        var near = Herb("Chamomile", 5f, Now - 1);
        var far = Herb("Chamomile", 40f, Now - 1);
        var farther = Herb("Chamomile", 90f, Now - 1);
        var spike = Herb("Spike", 20f, Now - 1);
        var nodes = new[] { farther, spike, far, near };

        // The near one is on screen, so the arrow points to the nearest beyond it.
        var next = GatherLogic.Next(nodes, watched, 0f, 0f, Now, node => node.X > 10f);

        Assert.Same(far, next);
    }

    [Fact]
    public void Without_a_ready_node_the_arrow_takes_the_one_ready_first()
    {
        var watched = new List<GatherType> { new(GatherCategory.Herbs, "Chamomile", 1) };
        var later = Herb("Chamomile", 20f, Now + 300);
        var sooner = Herb("Chamomile", 90f, Now + 60);

        Assert.Same(sooner, GatherLogic.Next(new[] { later, sooner }, watched, 0f, 0f, Now, _ => true));
        Assert.Null(GatherLogic.Next(new[] { later, sooner }, watched, 0f, 0f, Now, node => node != sooner));
    }

    [Fact]
    public void Ready_nodes_all_in_view_leave_no_arrow()
    {
        var watched = new List<GatherType> { new(GatherCategory.Herbs, "Chamomile", 1) };
        var nodes = new[] { Herb("Chamomile", 5f, Now - 1), Herb("Chamomile", 90f, Now + 60) };

        Assert.Null(GatherLogic.Next(nodes, watched, 0f, 0f, Now, node => node.X > 10f && node.ReadyAt < Now));
    }

    [Fact]
    public void A_watched_fish_points_to_a_spot_that_lists_it()
    {
        var watched = new List<GatherType> { new(GatherCategory.Fishing, "Ironjaw Catfish", 0) };
        var other = new GatherNode(GatherCategory.Fishing, "Calm Fishing Spot", LoneLands, 10f, 0f, 0, new[] { "Blue Dartfish" });
        var listing = new GatherNode(GatherCategory.Fishing, "Calm Fishing Spot", LoneLands, 50f, 0f, 0, new[] { "Ironjaw Catfish" });

        Assert.Same(listing, GatherLogic.Next(new[] { other, listing }, watched, 0f, 0f, Now, _ => true));
    }

    [Theory]
    [InlineData(3, null, false, "3")]
    [InlineData(0, 1259.4, false, "4:20")]
    [InlineData(0, 4900.0, false, "1h05")]
    [InlineData(2, 1100.0, true, "~2")]
    [InlineData(0, 1060.0, true, "~1:00")]
    public void A_tile_shows_the_ready_count_or_the_next_time(int ready, double? nextAt, bool estimate, string caption)
    {
        Assert.Equal(caption, GatherLogic.Caption(new TypeSummary(5, ready, nextAt, estimate), Now));
    }
}
