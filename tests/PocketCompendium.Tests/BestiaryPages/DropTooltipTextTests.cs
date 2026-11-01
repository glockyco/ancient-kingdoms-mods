using PocketCompendium.Features.BestiaryPages.Model;
using Xunit;

namespace PocketCompendium.Tests.BestiaryPages;

public class DropTooltipTextTests
{
    // The game picks the reward by level plus veteran points: 40, 50 and 150 (DefaultEvent.cs:237).
    [Theory]
    [InlineData(DropTooltipText.AltarTier.Normal, "below level 40")]
    [InlineData(DropTooltipText.AltarTier.Magic, "level 40 - 49")]
    [InlineData(DropTooltipText.AltarTier.Epic, "level 50 with 0 - 99 veteran points")]
    [InlineData(DropTooltipText.AltarTier.Legendary, "level 50 with 100 or more veteran points")]
    internal void NamesTheActivatorRangeOfEachAltarReward(DropTooltipText.AltarTier tier, string condition)
    {
        Assert.Equal("Only when the player who starts the altar is " + condition + ".", DropTooltipText.Altar(tier, 50));
    }
}
