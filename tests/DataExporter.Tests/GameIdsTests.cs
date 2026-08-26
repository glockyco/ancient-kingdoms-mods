using DataExporter;
using Xunit;

namespace DataExporter.Tests;

/// <summary>
/// The rule that turns a game asset name into an exported identifier. Anything resolving an
/// exported identifier back to a game asset applies this same rule, so a change here changes
/// what a stored fixture resolves to.
/// </summary>
public class GameIdsTests
{
    [Theory]
    [InlineData("Rusty Sword", "rusty_sword")]
    [InlineData("Guard Break", "guard_break")]
    [InlineData("Hunter's Sigil", "hunters_sigil")]
    [InlineData("Glacial Bind (M)", "glacial_bind_m")]
    [InlineData("already_an_id", "already_an_id")]
    [InlineData("Keeps-Hyphens", "keeps-hyphens")]
    public void SanitizeDerivesTheExportedIdentifier(string assetName, string expected)
        => Assert.Equal(expected, GameIds.Sanitize(assetName));

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void SanitizePassesThroughNothing(string? input)
        => Assert.Equal(input, GameIds.Sanitize(input!));

    [Theory]
    [InlineData("Player Warrior", "warrior")]
    [InlineData("Player Fire Goblin", "fire_goblin")]
    [InlineData("Warrior", "warrior")]
    public void ClassIdDropsThePrefabPrefix(string prefabName, string expected)
        => Assert.Equal(expected, GameIds.ClassId(prefabName));

    [Fact]
    public void ClassIdMatchesWhatTheCompendiumPublishes()
    {
        // The descriptor names a class the way the compendium does, so these must agree.
        foreach (var (prefab, published) in new[]
                 {
                     ("Player Warrior", "warrior"),
                     ("Player Ranger", "ranger"),
                     ("Player Cleric", "cleric"),
                     ("Player Rogue", "rogue"),
                     ("Player Wizard", "wizard"),
                     ("Player Druid", "druid"),
                 })
        {
            Assert.Equal(published, GameIds.ClassId(prefab));
        }
    }
}
