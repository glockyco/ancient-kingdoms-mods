using System;
using System.Text;
using PocketCompendium.Core.Tracking;
using Xunit;

namespace PocketCompendium.Tests.Tracking;

public sealed class KillNoticeTests
{
    private static string Mark(string name) => "[[entity:" + Convert.ToBase64String(Encoding.UTF8.GetBytes(name)) + "]]";

    [Fact]
    public void Reads_the_boss_from_a_dedicated_server_kill_notice()
    {
        Assert.Equal("Troll King Grimlok", KillNotice.SlainName("Aria has slain " + Mark("Troll King Grimlok") + "."));
        Assert.Equal("Mor'Zhul the Deathcaller", KillNotice.SlainName("Bo has slain " + Mark("Mor'Zhul the Deathcaller") + "."));
    }

    [Theory]
    [InlineData("You gain 12 experience!")]
    [InlineData("has slain [[entity:WHlsZXZpcw==]].")]
    [InlineData("Aria has slain [[entity:not base64!]].")]
    [InlineData("Aria has slain [[entity:WHlsZXZpcw==]]")]
    public void Ignores_other_info_messages(string message)
    {
        Assert.Null(KillNotice.SlainName(message));
    }

    [Fact]
    public void Ignores_stun_notices_that_carry_a_marker()
    {
        Assert.Null(KillNotice.SlainName(Mark("Xylevis") + " has been stunned!"));
    }
}
