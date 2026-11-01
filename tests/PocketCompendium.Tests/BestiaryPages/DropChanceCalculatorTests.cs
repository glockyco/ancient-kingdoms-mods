using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using PocketCompendium.Features.BestiaryPages.Model;
using Xunit;

namespace PocketCompendium.Tests.BestiaryPages;

public class DropChanceCalculatorTests
{
    private static DropEntry Equipment(string id, double probability, bool quest = false, string? name = null) => new()
    {
        ItemId = id,
        ItemName = name ?? id,
        Probability = probability,
        CountsAsEquipment = true,
        RequiresQuest = quest,
    };

    private static double Boss(DropEntry[] drops, string id, bool fatecharm = false, IReadOnlySet<string>? needed = null) =>
        DropChanceCalculator.Calculate(drops, id, isBoss: true, fatecharm, needed);

    [Fact]
    public void GuaranteedPieceUsesWeightedTopUpsAfterIndependentRolls()
    {
        var drops = new[] { Equipment("a", 0.1), Equipment("b", 0.2), Equipment("c", 0.3) };
        Assert.Equal(0.184, Boss(drops, "a"), 12);
        Assert.Equal(1, Boss(new[] { Equipment("only", 0.1) }, "only"), 12);
        Assert.Equal(0, Boss(new[] { Equipment("zero", 0) }, "zero"));
    }

    [Fact]
    public void FatecharmRaisesTheEquipmentMinimumButDoesNotCreateUnavailablePieces()
    {
        var drops = new[] { Equipment("a", 0.1), Equipment("b", 0.2), Equipment("c", 0.3) };
        Assert.Equal(0.4135, Boss(drops, "a", fatecharm: true), 12);
        Assert.Equal(1, Boss(new[] { Equipment("only", 0.1) }, "only", fatecharm: true), 12);
        Assert.Equal(0, Boss(Array.Empty<DropEntry>(), "missing", fatecharm: true));
    }

    [Fact]
    public void RepeatedEquipmentRowsSupplyBothWeightsAndPerNameCaps()
    {
        var repeatedTarget = new[] { Equipment("a", 0.1), Equipment("a", 0.1), Equipment("b", 0.3) };
        Assert.Equal(0.4168, Boss(repeatedTarget, "a"), 12);
        var repeatedCompetitor = new[] { Equipment("a", 0.1), Equipment("b", 0.2), Equipment("b", 0.2) };
        Assert.Equal(0.36496, Boss(repeatedCompetitor, "a", fatecharm: true), 12);
    }

    [Fact]
    public void NonEquipmentDoesNotPreventTheGuaranteedPieceOrReceiveTopUps()
    {
        var drops = new[]
        {
            Equipment("a", 0.1),
            new DropEntry { ItemId = "augment", ItemName = "augment", Probability = 0.9 },
        };
        Assert.Equal(1, Boss(drops, "a"), 12);
        Assert.Equal(0.9, Boss(drops, "augment", fatecharm: true), 12);
    }

    [Fact]
    public void UnneededQuestEquipmentConsumesFailedTopUpAttempts()
    {
        var drops = new[] { Equipment("a", 0.1), Equipment("quest", 0.9, quest: true) };
        Assert.Equal(1 - Math.Pow(0.9, 101), Boss(drops, "a"), 12);
        Assert.Equal(0, Boss(drops, "quest"));
        var needed = new HashSet<string> { "quest" };
        Assert.Equal(1, Boss(drops, "a", needed: needed), 12);
        Assert.Equal(0.981, Boss(drops, "quest", needed: needed), 12);
    }

    [Fact]
    public void RandomEquipmentCountsTowardTheMinimumButItsWrapperCannotBeToppedUp()
    {
        var random = new DropEntry
        {
            ItemId = "random", ItemName = "random", Probability = 0.8,
            RandomItems = new[] { new DropOutcome { ItemId = "other", CountsAsEquipment = true } },
        };
        var drops = new[] { Equipment("a", 0.1), random };
        Assert.Equal(0.28, Boss(drops, "a"), 12);
        Assert.Equal(1, Boss(drops, "a", fatecharm: true), 12);
        Assert.Equal(0.8, Boss(drops, "other"), 12);
        Assert.Equal(0, Boss(drops, "random"));
        Assert.Equal(0, Boss(new[] { new DropEntry { Probability = 1, RandomItems = Array.Empty<DropOutcome>() } }, "other"));
    }

    [Fact]
    public void RepeatedRandomOutcomesKeepTheirWeightAndBossQuestGatesPrecedeResolution()
    {
        var pool = new[]
        {
            new DropOutcome { ItemId = "a", CountsAsEquipment = true },
            new DropOutcome { ItemId = "a", CountsAsEquipment = true },
            new DropOutcome { ItemId = "b" },
        };
        var random = new DropEntry { ItemId = "random", ItemName = "random", Probability = 0.6, RandomItems = pool };
        Assert.Equal(0.4, Boss(new[] { random }, "a"), 12);
        var quest = new DropEntry
        {
            ItemId = "random", ItemName = "random", Probability = 0.6, RandomItems = pool, RequiresQuest = true,
        };
        var needed = new HashSet<string> { "random" };
        Assert.Equal(0, Boss(new[] { quest }, "a", needed: needed));
        Assert.Equal(0.6, Boss(new[] { quest }, "random", needed: needed), 12);
    }

    [Fact]
    public void IndependentRollsCombineRepeatedRowsRatherThanAddingTheirProbabilities()
    {
        var drops = new[] { Equipment("a", 0.3), Equipment("a", 0.2) };
        Assert.Equal(0.44, DropChanceCalculator.Calculate(drops, "a", isBoss: false), 12);
        Assert.Equal(0.44, DropChanceCalculator.Calculate(drops, "a", isBoss: false, fatecharm: true), 12);
    }

    [Fact]
    public void IndependentRollsResolveRandomPoolsAndRespectQuestNeed()
    {
        var drops = new[]
        {
            new DropEntry
            {
                ItemId = "random", Probability = 0.6,
                RandomItems = new[] { new DropOutcome { ItemId = "a" }, new DropOutcome { ItemId = "a" }, new DropOutcome { ItemId = "b" } },
            },
            Equipment("a", 0.5, quest: true),
        };
        Assert.Equal(0.4, DropChanceCalculator.Calculate(drops, "a", isBoss: false), 12);
        Assert.Equal(0.7, DropChanceCalculator.Calculate(drops, "a", isBoss: false, neededQuestItemIds: new HashSet<string> { "a" }), 12);
        Assert.Equal(0, DropChanceCalculator.Calculate(drops, "random", isBoss: false));
        Assert.Equal(1, DropChanceCalculator.Calculate(new[] { Equipment("a", 2) }, "a", isBoss: false));
    }

    private sealed class MonsterCase
    {
        public string MonsterId { get; set; } = "";
        public bool IsBoss { get; set; }
        public DropEntry[] Drops { get; set; } = Array.Empty<DropEntry>();
        public Check[] Checks { get; set; } = Array.Empty<Check>();
    }

    private sealed class Check
    {
        public string ItemId { get; set; } = "";
        public int Ordinal { get; set; }
        public HashSet<string> NeededQuestItemIds { get; set; } = new();
        public double Expected { get; set; }
        public double ExpectedWithFatecharm { get; set; }
    }

    private static List<MonsterCase> LoadCases()
    {
        using var stream = typeof(DropChanceCalculatorTests).Assembly.GetManifestResourceStream("drop-chance-parity.json")
            ?? throw new InvalidOperationException("Generate the drop corpus with pnpm --filter website gen:drop-chance-parity.");
        using var reader = new StreamReader(stream);
        return JsonConvert.DeserializeObject<List<MonsterCase>>(reader.ReadToEnd())
            ?? throw new InvalidOperationException("Drop corpus deserialized to null.");
    }

    [Fact]
    public void EveryExportedDropMatchesTheWebsiteWithAndWithoutFatecharmAndQuestNeed()
    {
        var corpus = LoadCases();
        Assert.NotEmpty(corpus);
        Assert.Contains(corpus, monster => monster.IsBoss && monster.Drops.Length > 0);
        Assert.Contains(corpus, monster => !monster.IsBoss && monster.Drops.Length > 0);
        var mismatches = new List<string>();
        var count = 0;
        foreach (var monster in corpus)
        {
            for (var ordinal = 0; ordinal < monster.Drops.Length; ordinal++)
                Assert.Contains(monster.Checks, check => check.Ordinal == ordinal && check.ItemId == monster.Drops[ordinal].ItemId);
            foreach (var check in monster.Checks)
                foreach (var fatecharm in new[] { false, true })
                {
                    count++;
                    var expected = fatecharm ? check.ExpectedWithFatecharm : check.Expected;
                    var actual = DropChanceCalculator.Calculate(monster.Drops, check.ItemId, monster.IsBoss, fatecharm, check.NeededQuestItemIds);
                    if (!double.IsFinite(actual) || Math.Abs(actual - expected) > 1e-12)
                        mismatches.Add($"{monster.MonsterId}/{check.ItemId} row {check.Ordinal}, Fatecharm={fatecharm}, quest=[{string.Join(",", check.NeededQuestItemIds)}]: expected {expected:R}, got {actual:R}");
                }
        }
        Assert.True(mismatches.Count == 0, $"{mismatches.Count}/{count} drop cases diverged:\n{string.Join("\n", mismatches.Take(40))}");
    }

    [Fact]
    public void XylevisIncludesTheGuaranteedPieceInTheAmuletsPerKillChance()
    {
        var monster = LoadCases().Single(value => value.MonsterId == "xylevis");
        Assert.Equal(0.3, monster.Drops.Single(drop => drop.ItemId == "amulet_of_the_false_king").Probability);
        Assert.Equal(0.492, Boss(monster.Drops, "amulet_of_the_false_king"), 12);
    }

    [Fact]
    public void VerdantGlaciusHasSixCommonAndTwoRarerEquipmentChances()
    {
        var monster = LoadCases().Single(value => value.MonsterId == "verdant_glacius");
        var equipment = monster.Drops.Where(drop => drop.CountsAsEquipment).ToArray();
        Assert.Equal(8, equipment.Length);
        foreach (var drop in equipment)
        {
            var common = drop.Probability == 0.2;
            Assert.Equal(common ? 0.22525320533333332 : 0.168939904, Boss(monster.Drops, drop.ItemId), 12);
            Assert.Equal(common ? 0.2966166813903134 : 0.22502163582905996, Boss(monster.Drops, drop.ItemId, fatecharm: true), 12);
        }
        Assert.Equal(6, equipment.Count(drop => drop.Probability == 0.2));
        Assert.Equal(2, equipment.Count(drop => drop.Probability == 0.15));
    }
}
