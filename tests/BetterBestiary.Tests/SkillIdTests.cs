using BetterBestiary.Data;
using Xunit;

namespace BetterBestiary.Tests;

public class SkillIdTests
{
    [Theory]
    [InlineData("Seismic Slam", "seismic_slam")]
    [InlineData("Frost Nova", "frost_nova")]
    [InlineData("Fire-Ball!", "fire-ball")]
    [InlineData("A B  C", "a_b__c")]
    public void Sanitize_MatchesExporterScheme(string input, string expected)
        => Assert.Equal(expected, SkillId.Sanitize(input));

    [Fact]
    public void Sanitize_PassesThroughNullOrEmpty()
    {
        Assert.Equal("", SkillId.Sanitize(""));
        Assert.Null(SkillId.Sanitize(null!));
    }
}
