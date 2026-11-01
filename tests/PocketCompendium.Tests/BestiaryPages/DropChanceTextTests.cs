using PocketCompendium.Features.BestiaryPages.Model;
using Xunit;

namespace PocketCompendium.Tests.BestiaryPages;

public class DropChanceTextTests
{
    [Theory]
    [InlineData(0.49215, "49.2%")]
    [InlineData(0.30, "30.0%")]
    [InlineData(1.0, "100.0%")]
    [InlineData(0.00049, "<0.1%")]
    [InlineData(0.0005, "0.1%")]
    [InlineData(0.99951, ">99.9%")]
    [InlineData(0.0, "0.0%")]
    public void ShowsOneDecimalWithoutRoundingAChanceAwayOrToCertain(double chance, string expected)
    {
        Assert.Equal(expected, DropChanceText.Percent(chance));
    }
}
