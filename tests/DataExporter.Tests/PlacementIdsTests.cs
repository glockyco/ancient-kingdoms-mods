using System;
using System.Globalization;
using DataExporter;
using Xunit;

namespace DataExporter.Tests;

public class PlacementIdsTests
{
    [Theory]
    [InlineData(411.6, -337.6, "chest_zone_412_-338")]
    [InlineData(1.5, -2.5, "chest_zone_2_-3")]
    [InlineData(-0.4, 0.4, "chest_zone_0_0")]
    [InlineData(-0.0, 0.0, "chest_zone_0_0")]
    public void FormatsWholeWorldUnits(double x, double y, string expected) =>
        Assert.Equal(expected, PlacementIds.Format("chest_zone", x, y));

    [Fact]
    public void FormattingDoesNotDependOnCulture()
    {
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("fr-FR");
            Assert.Equal("altar_name_zone_412_-338", PlacementIds.Format("altar_name_zone", 411.6, -337.6));
        }
        finally { CultureInfo.CurrentCulture = previous; }
    }

    [Fact]
    public void IndependentExportsAndReferencesShareIdentities()
    {
        var first = new PlacementIds().Register("monster_zone", 1.5, -2.5);
        Assert.Equal(first, new PlacementIds().Register("monster_zone", 1.5, -2.5));
        Assert.Equal(first, PlacementIds.Format("monster_zone", 1.5, -2.5));
    }

    [Fact]
    public void RoundedCollisionFailsLoudlyWithinSet()
    {
        var ids = new PlacementIds();
        ids.Register("trap_zone", 1.1, 2.1);
        var error = Assert.Throws<InvalidOperationException>(() => ids.Register("trap_zone", 1.2, 2.2));
        Assert.Contains("trap_zone_1_2", error.Message);
        Assert.Equal("trap_other_zone_1_2", ids.Register("trap_other_zone", 1.2, 2.2));
    }
}
