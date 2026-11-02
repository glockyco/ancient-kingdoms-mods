using PocketCompendium.Core.Tracking;
using Xunit;

namespace PocketCompendium.Tests.Tracking;

public sealed class RenewalNoticeTests
{
    [Fact]
    public void The_renewal_message_names_the_dungeon()
    {
        Assert.Equal("Trolls Cave", RenewalNotice.ZoneName("Trolls Cave has been renewed!"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(" has been renewed!")]
    [InlineData("Xylevis has spawned in Crescent Coast.")]
    [InlineData("The dungeon cannot be reset while someone is still inside")]
    public void Other_messages_name_no_dungeon(string? message)
    {
        Assert.Null(RenewalNotice.ZoneName(message));
    }
}
