using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter;
using DataExporter.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace DataExporter.Tests;

public sealed class StatCatalogTests
{
    [Fact]
    public void RealCatalogueCoversEveryNumericModelProperty()
    {
        StatCatalog.Validate();
        Assert.Equal(32, StatCatalog.Stats.Count);
    }

    [Fact]
    public void MissingMappingNamesModelAndProperty()
    {
        var stats = Replace("strength", stat => Copy(stat, fields: stat.Fields.Where(field => field.source != "item").ToArray()));
        AssertFailure(stats, "ItemStats.strength", "no stat or non-stat declaration");
    }

    [Fact]
    public void DuplicateMappingNamesModelAndProperty()
    {
        var stats = Replace("strength", stat => Copy(stat, fields: stat.Fields.Append(stat.Fields[0]).ToArray()));
        AssertFailure(stats, "ItemStats.strength", "duplicate");
    }

    [Fact]
    public void MappingAndNonStatDeclarationCannotOverlap()
    {
        var nonStats = StatCatalog.NonStatFields.Append(new NonStatFieldData("item", nameof(ItemStats.strength), "Not a stat")).ToArray();
        var error = Assert.Throws<InvalidOperationException>(() => StatCatalog.Validate(StatCatalog.Stats, nonStats));
        Assert.Contains("ItemStats.strength", error.Message);
        Assert.Contains("duplicate", error.Message);
    }

    [Fact]
    public void UnknownPerPointStatNamesAffectedField()
    {
        var stats = Replace("block_chance", stat => Copy(stat, perPointOf: new[] { new StatPerPointData("unknown_stat", 1) }));
        AssertFailure(stats, "ItemStats.block_chance", "unknown_stat");
    }

    [Fact]
    public void UnknownPropertyNamesModelAndProperty()
    {
        var stats = Replace("strength", stat => Copy(stat, fields: stat.Fields.Append(new StatFieldData("item", "unknown_property", "flat")).ToArray()));
        AssertFailure(stats, "ItemStats.unknown_property", "not a numeric export property");
    }

    [Fact]
    public void NonNumericPropertyIsNotAStat()
    {
        var stats = Replace("strength", stat => Copy(stat, fields: stat.Fields.Append(new StatFieldData("item", nameof(ItemStats.augment_bonus_set), "flat")).ToArray()));
        AssertFailure(stats, "ItemStats.augment_bonus_set", "not a numeric export property");
    }

    [Fact]
    public void DuplicateStatIdFails()
    {
        var stats = StatCatalog.Stats.Append(StatCatalog.Stats.Single(stat => stat.Id == "strength")).ToArray();
        AssertFailure(stats, "Duplicate stat id", "strength");
    }

    [Fact]
    public void UnknownPoolNamesAffectedField()
    {
        var stats = Replace("health_regen", stat => Copy(stat, poolId: "missing_pool"));
        AssertFailure(stats, "ItemStats.hp_regen_bonus", "missing_pool");
    }

    [Fact]
    public void PoolRequiresRegenerationModifier()
    {
        var stats = Replace("strength", stat => Copy(stat, poolId: "health"));
        AssertFailure(stats, "ItemStats.strength", "requires a regeneration field");
    }

    [Fact]
    public void FractionalStatsUseFlatModifiersForFractionPointBonuses()
    {
        var block = StatCatalog.Stats.Single(stat => stat.Id == "block_chance");
        Assert.Equal("percent", block.Format);
        Assert.Equal(0d, block.Min);
        Assert.Equal(0.8, block.Max);
        Assert.All(block.Fields, field => Assert.Equal("flat", field.modifier));
        Assert.Contains(block.PerPointOf, term => term.stat_id == "armor_class" && term.amount == 0.0001);
    }

    [Theory]
    [InlineData("health_regen", "health")]
    [InlineData("mana_regen", "mana")]
    [InlineData("rage_regen", "rage")]
    public void RegenerationFieldsUseRateModifiersAndTheRightPool(string id, string pool)
    {
        var stat = StatCatalog.Stats.Single(stat => stat.Id == id);
        Assert.Equal(pool, stat.PoolId);
        Assert.Equal("decimal", stat.Format);
        Assert.All(stat.Fields, field => Assert.Contains(field.modifier, new[] { "per_second", "percent_of_max_per_second" }));
    }

    [Fact]
    public void NullContractFieldsRemainPresentWithExporterSettings()
    {
        var data = new StatVocabularyData(new[]
        {
            new StatData
            {
                id = "ward", name = "Ward", format = "integer", override_reason = "Site name",
                fields = new[] { new StatFieldData("skill", "ward_bonus", "flat") },
                per_point_of = Array.Empty<StatPerPointData>(),
            },
        }, Array.Empty<NonStatFieldData>());
        var json = JObject.Parse(JsonConvert.SerializeObject(data, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore }));
        var stat = Assert.IsType<JObject>(json["stats"]![0]);
        foreach (var key in new[] { "name_key", "item_name", "item_label", "weapon_item_name", "min_value", "max_value", "pool_id" })
        {
            Assert.True(stat.ContainsKey(key), key);
            Assert.Equal(JTokenType.Null, stat[key]!.Type);
        }
        Assert.Equal(JTokenType.Null, stat["fields"]![0]!["curve"]!.Type);
    }

    private static StatDefinition[] Replace(string id, Func<StatDefinition, StatDefinition> update) =>
        StatCatalog.Stats.Select(stat => stat.Id == id ? update(stat) : stat).ToArray();

    private static StatDefinition Copy(
        StatDefinition stat, IReadOnlyList<StatFieldData>? fields = null,
        IReadOnlyList<StatPerPointData>? perPointOf = null, string? poolId = null) =>
        new(stat.Id, stat.NameKey, stat.ItemLabel, stat.Format, fields ?? stat.Fields,
            stat.Min, stat.Max, perPointOf ?? stat.PerPointOf, poolId ?? stat.PoolId,
            stat.SiteName, stat.OverrideReason);

    private static void AssertFailure(IReadOnlyList<StatDefinition> stats, params string[] fragments)
    {
        var error = Assert.Throws<InvalidOperationException>(() => StatCatalog.Validate(stats, StatCatalog.NonStatFields));
        foreach (var fragment in fragments)
            Assert.Contains(fragment, error.Message);
    }
}
