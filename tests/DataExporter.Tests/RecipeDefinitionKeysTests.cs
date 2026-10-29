using System;
using System.Globalization;
using Xunit;

namespace DataExporter.Tests;

public class RecipeDefinitionKeysTests
{
    [Fact]
    public void IdenticalDefinitionsShareKeyAcrossRegistriesAndCultures()
    {
        var first = new RecipeDefinitionKeys().Register("crafting", "arrows", 1,
            new[] { ("wood", 2), ("iron", 1) }, 2, false, false, 750);
        var previous = CultureInfo.CurrentCulture;
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.GetCultureInfo("fr-FR");
            Assert.Equal(first, new RecipeDefinitionKeys().Register("crafting", "arrows", 1,
                new[] { ("wood", 2), ("iron", 1) }, 2, false, false, 750));
        }
        finally { CultureInfo.CurrentCulture = previous; }
        Assert.Equal(64, first.Length);
    }

    [Fact]
    public void CompleteBehaviorDifferencesRemainDistinctUnderOnePublicResult()
    {
        var keys = new RecipeDefinitionKeys();
        var materials = new[] { ("wood", 2), ("iron", 1) };
        var first = keys.Register("crafting", "arrows", 1, materials, 2, false, false, 750);
        Assert.NotEqual(first, keys.Register("crafting", "arrows", 25, materials, 2, false, false, 750));
        Assert.NotEqual(first, keys.Register("crafting", "arrows", 1, new[] { ("wood", 3), ("iron", 1) }, 2, false, false, 750));
        Assert.NotEqual(first, keys.Register("crafting", "arrows", 1, new[] { ("iron", 1), ("wood", 2) }, 2, false, false, 750));
        Assert.NotEqual(first, keys.Register("crafting", "arrows", 1, materials, 3, false, false, 750));
        Assert.NotEqual(first, keys.Register("crafting", "arrows", 1, materials, 2, true, false, 750));
        Assert.NotEqual(first, keys.Register("crafting", "arrows", 1, materials, 2, false, false, 3500));
        Assert.NotEqual(first, keys.Register("alchemy", "arrows", 1, materials, 2, false, false, 750));
        Assert.NotEqual(first, keys.Register("scribing", "arrows", 1, materials, 2, false, true, null));
        Assert.NotEqual(first, keys.Register("crafting", "arrows", 1, materials, 2, false, false, 750, "awakening_arrows"));
    }

    [Theory]
    [InlineData("", 1)]
    [InlineData("wood", 0)]
    [InlineData("wood", -1)]
    public void InvalidIngredientCannotSilentlyCheapenDefinition(string itemId, int amount)
    {
        Assert.Throws<InvalidOperationException>(() => new RecipeDefinitionKeys().Register(
            "crafting", "arrows", 1, new[] { (itemId, amount) }, 0, false, false, 15));
    }
}
