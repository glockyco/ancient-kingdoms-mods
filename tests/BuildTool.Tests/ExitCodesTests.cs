using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

public class ExitCodesTests
{
    [Theory]
    [InlineData("server_unreachable", 3)]
    [InlineData("auth_failed", 4)]
    [InlineData("lease_conflict", 5)]
    [InlineData("timeout", 6)]
    [InlineData("command_failed", 7)]
    [InlineData("cancelled", 8)]
    [InlineData("internal", 1)]
    [InlineData("invalid_request", 2)]
    public void For_MapsKnownKindsToCategoryCodes(string kind, int expected)
    {
        Assert.Equal(expected, ExitCodes.For(kind));
    }

    [Fact]
    public void For_UnknownKindReturnsOne()
    {
        Assert.Equal(1, ExitCodes.For("something_unexpected"));
    }
}
