using System.Collections.Generic;
using System.Globalization;
using PocketCompendium.Features.Professions.Model;
using Xunit;

namespace PocketCompendium.Tests.Professions;

public sealed class ProfessionLevelsTests
{
    [Fact]
    public void A_level_reads_as_the_game_writes_it_and_full_from_the_games_threshold()
    {
        var culture = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
        try
        {
            Assert.Equal("47.36", ProfessionLevels.Text(0.4736f));
            Assert.Equal("0.00", ProfessionLevels.Text(0f));
            Assert.Equal("99.98", ProfessionLevels.Text(0.9998f));
            Assert.Equal("100", ProfessionLevels.Text(0.99995f));
            Assert.False(ProfessionLevels.Maxed(0.9998f));
            Assert.True(ProfessionLevels.Maxed(0.9999f));
        }
        finally
        {
            CultureInfo.CurrentCulture = culture;
        }
    }

    [Fact]
    public void Watched_only_shows_the_watched_in_order_and_every_one_while_none_is_watched()
    {
        var shown = new List<int>();
        var watched = new HashSet<int> { 6, 2, 12 };

        ProfessionLevels.Select(13, watched.Contains, watchedOnly: true, shown);
        Assert.Equal(new[] { 2, 6, 12 }, shown);

        ProfessionLevels.Select(13, watched.Contains, watchedOnly: false, shown);
        Assert.Equal(13, shown.Count);

        ProfessionLevels.Select(13, _ => false, watchedOnly: true, shown);
        Assert.Equal(13, shown.Count);
    }
}
