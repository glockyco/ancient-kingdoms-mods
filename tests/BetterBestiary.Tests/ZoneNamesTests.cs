using System.Collections.Generic;
using AncientKingdomsMods.Shared;
using Xunit;

namespace BetterBestiary.Tests;

/// <summary>Monster zone texts as the game stores them, against its zone table names.</summary>
public class ZoneNamesTests
{
    private static readonly Dictionary<int, string> Zones = new()
    {
        [2] = "The Lone-lands",
        [3] = "Everfrost",
        [5] = "The Molten Summit",
        [24] = "Molten Sanctuary",
    };

    [Theory]
    [InlineData("Everfrost", 3)]
    [InlineData("Molten Summit", 5)]
    [InlineData("The Lone-Lands", 2)]
    [InlineData("  molten sanctuary ", 24)]
    public void FreeTextNamesTheZoneDespiteArticleAndCase(string zoneText, int zoneId)
    {
        Assert.Equal(zoneId, ZoneNames.Match(zoneText, Zones));
    }

    [Theory]
    [InlineData("Orc Village")]
    [InlineData("The")]
    [InlineData("")]
    [InlineData(null)]
    public void SubZonesAndEmptyTextMatchNoZone(string? zoneText)
    {
        Assert.Null(ZoneNames.Match(zoneText!, Zones));
    }
}
