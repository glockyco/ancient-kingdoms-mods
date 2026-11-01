using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Exporters;
using DataExporter.Models;
using Xunit;

namespace DataExporter.Tests;

public sealed class VirtueRowsTests
{
    private static readonly string[] Virtues = { "Compassion", "Valor" };
    private static readonly int[] Thresholds = { 0, 100, 500, 2000, 6000, 15000 };
    private static readonly float[] Humility = { 0.5f, 0.6f, 0.65f, 0.8f, 0.9f, 1.05f };

    private static Dictionary<string, string> Texts()
    {
        var texts = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["rank.initial"] = "Apprentice",
            ["shrine.name"] = "Shrine of {0}",
        };
        foreach (var virtue in Virtues)
        {
            texts[$"virtue.{virtue}"] = virtue;
            texts[$"effect.{virtue}"] = $"{virtue} summary.";
            for (var rank = 0; rank < 6; rank++)
                texts[$"effect.{virtue}.{rank}"] = $"{virtue} effect {rank}.";
        }
        return texts;
    }

    private static VirtueExportData Create(
        Dictionary<string, string>? texts = null,
        IEnumerable<(string, string)>? skills = null) =>
        VirtueRows.Create(
            Virtues, Thresholds, Humility, 75, 30,
            key => (texts ?? Texts()).TryGetValue(key, out var text) ? text : null,
            (virtue, rank) => $"{virtue} title {rank}",
            skills ?? new[] { ("blessing_of_compassion", "Compassion"), ("blessing_of_valor", "Valor") });

    [Fact]
    public void EachVirtueCarriesSixRanksWithPointsTitlesAndEffects()
    {
        var data = Create();

        var valor = Assert.Single(data.virtues, virtue => virtue.id == "valor");
        Assert.Equal("blessing_of_valor", valor.blessing_skill_id);
        Assert.Equal("Valor summary.", valor.summary);
        Assert.Equal(Thresholds, valor.ranks.Select(rank => rank.points));
        Assert.Equal("", valor.ranks[0].title);
        Assert.Equal("Valor title 5", valor.ranks[5].title);
        Assert.Equal("Valor effect 3.", valor.ranks[3].effect);
        Assert.Equal("Apprentice", data.rank_zero_label);
    }

    [Fact]
    public void AVirtueWithoutABlessingSkillFailsAndNamesIt()
    {
        var error = Assert.Throws<InvalidOperationException>(
            () => Create(skills: new[] { ("blessing_of_compassion", "Compassion") }));

        Assert.Contains("Valor", error.Message);
    }

    [Fact]
    public void TwoBlessingSkillsForOneVirtueFail()
    {
        Assert.Throws<InvalidOperationException>(() => Create(skills: new[]
        {
            ("blessing_of_compassion", "Compassion"), ("blessing_of_valor", "Valor"), ("old_valor", "Valor"),
        }));
    }

    [Fact]
    public void AMissingEffectTextFailsAndNamesItsKey()
    {
        var texts = Texts();
        texts.Remove("effect.Compassion.4");

        var error = Assert.Throws<InvalidOperationException>(() => Create(texts));

        Assert.Contains("effect.Compassion.4", error.Message);
    }

    [Fact]
    public void AShrineIsNamedInEnglishAndIdentifiedByVirtueZoneAndPosition()
    {
        var texts = Texts();
        var shrine = VirtueRows.Shrine("Valor", Virtues, key => texts.GetValueOrDefault(key), new PlacementIds(),
            "northern_wastes", "", new Position(478.97f, 1246.74f, 0));

        Assert.Equal("shrine_valor_northern_wastes_479_1247", shrine.id);
        Assert.Equal("Shrine of Valor", shrine.name);
        Assert.Equal("valor", shrine.virtue_id);
    }

    [Fact]
    public void AShrineThatNamesNoVirtueFails()
    {
        var texts = Texts();

        Assert.Throws<InvalidOperationException>(() => VirtueRows.Shrine("None", Virtues,
            key => texts.GetValueOrDefault(key), new PlacementIds(), "lone_lands", "", new Position(0, 0, 0)));
    }
}
