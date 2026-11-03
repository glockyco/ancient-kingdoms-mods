using AncientKingdomsMods.Shared.Updates;
using Xunit;

namespace PocketCompendium.Tests.Updates;

public sealed class ChangeLinesTests
{
    private static readonly Release[] Releases =
    {
        new(ModVersion.Parse("1.0.4"), new[] { "Shows boss respawn times on the world map.", "Adds compact tiles to the boss list.", "Fixes alerts for watched bosses." }),
        new(ModVersion.Parse("1.0.3"), new[] { "Fixes the stutter while walking." }),
        new(ModVersion.Parse("1.0.2"), new[] { "Names the Bestiary's fabled monsters." }),
    };

    private static ModVersion V(string text) => ModVersion.Parse(text);

    [Fact]
    public void One_new_version_shows_its_changes_without_its_number()
    {
        Assert.Equal(new[] { "Fixes the stutter while walking." }, ChangeLines.Between(Releases, V("1.0.2"), V("1.0.3")));
    }

    [Fact]
    public void Several_new_versions_start_each_line_with_the_version_newest_first()
    {
        Assert.Equal(
            new[]
            {
                "1.0.4: Shows boss respawn times on the world map.",
                "1.0.4: Adds compact tiles to the boss list.",
                "1.0.4: Fixes alerts for watched bosses.",
                "1.0.3: Fixes the stutter while walking.",
            },
            ChangeLines.Between(Releases, V("1.0.2"), V("1.0.4")));
    }

    [Fact]
    public void A_card_keeps_three_lines_and_says_how_many_more_changes_there_are()
    {
        Assert.Equal(
            new[]
            {
                "1.0.4: Shows boss respawn times on the world map.",
                "1.0.4: Adds compact tiles to the boss list.",
                "1.0.4: Fixes alerts for watched bosses.",
                "And 1 more change.",
            },
            ChangeLines.Between(Releases, V("1.0.2"), V("1.0.4"), ChangeLines.CardLines));
        Assert.Equal("And 2 more changes.", ChangeLines.Between(Releases, V("1.0.1"), V("1.0.4"), ChangeLines.CardLines)[^1]);
    }

    [Fact]
    public void Exactly_three_lines_need_no_count()
    {
        Assert.Equal(3, ChangeLines.Between(Releases, V("1.0.3"), V("1.0.4"), ChangeLines.CardLines).Count);
    }

    [Fact]
    public void Releases_outside_the_range_stay_out()
    {
        // The running 1.0.3 learns nothing of 1.0.4 when it compares with itself, and nothing of what it already had.
        Assert.Empty(ChangeLines.Between(Releases, V("1.0.3"), V("1.0.3")));
        Assert.Equal(new[] { "Names the Bestiary's fabled monsters." }, ChangeLines.Between(Releases, V("1.0.1"), V("1.0.2")));
    }
}
