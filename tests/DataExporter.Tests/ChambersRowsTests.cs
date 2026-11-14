using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter;
using DataExporter.Exporters;
using DataExporter.Models;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace DataExporter.Tests;

public sealed class ChambersRowsTests
{
    private static ChambersOfChaosData Definition() => new()
    {
        zone_id = "chambers_of_chaos", keeper_npc_id = "keeper", seal_item_id = "seal", reward_item_id = "reward",
        monster_pool = new() { "guard", "support" },
        encounter_groups = new()
        {
            new() { id = "watch", name = "Watch", guards_monster_id = "guard", support_monster_id = "support" },
            new() { id = "colony", name = "Colony", guards_monster_id = "guard" }
        }
    };

    private static void Validate(ChambersOfChaosData data) => ChambersRows.ValidateReferences(data,
        new HashSet<string> { "keeper" }, new HashSet<string> { "seal", "reward" },
        new HashSet<string> { "guard", "support" }, new HashSet<string> { "chambers_of_chaos" });

    [Fact]
    public void ReferencesPreserveAbsentSupportAndRoundTrip()
    {
        var data = Definition();
        Validate(data);
        var json = ExportJson.Serialize(data);
        var parsed = JObject.Parse(json);
        Assert.Equal(JTokenType.Null, parsed["encounter_groups"]![1]!["support_monster_id"]!.Type);
        var restored = JsonConvert.DeserializeObject<ChambersOfChaosData>(json)!;
        Validate(restored);
        Assert.Null(restored.encounter_groups[1].support_monster_id);
        Assert.Equal("support", restored.encounter_groups[0].support_monster_id);
        Assert.Equal(json, ExportJson.Serialize(restored));
    }

    [Theory]
    [InlineData("zone")]
    [InlineData("keeper")]
    [InlineData("seal")]
    [InlineData("reward")]
    [InlineData("pool")]
    [InlineData("guards")]
    [InlineData("support")]
    public void MissingRequiredReferenceFailsWithContext(string context)
    {
        var data = Definition();
        switch (context)
        {
            case "zone": data.zone_id = "missing"; break;
            case "keeper": data.keeper_npc_id = "missing"; break;
            case "seal": data.seal_item_id = "missing"; break;
            case "reward": data.reward_item_id = "missing"; break;
            case "pool": data.monster_pool.Add("missing"); break;
            case "guards": data.encounter_groups[0].guards_monster_id = "missing"; break;
            case "support": data.encounter_groups[0].support_monster_id = "missing"; break;
        }
        var error = Assert.Throws<InvalidOperationException>(() => Validate(data));
        Assert.Contains(context, error.Message);
        Assert.Contains("missing", error.Message);
    }

    [Fact]
    public void EmptyAndInconsistentConfigurationFails()
    {
        var data = Definition();
        data.monster_pool.Clear();
        Assert.Throws<InvalidOperationException>(() => Validate(data));
        data = Definition();
        data.encounter_groups.Clear();
        Assert.Throws<InvalidOperationException>(() => Validate(data));
        data = Definition();
        data.seal_item_id = data.reward_item_id;
        Assert.Throws<InvalidOperationException>(() => Validate(data));
        data = Definition();
        data.monster_pool.Add("guard");
        Assert.Throws<InvalidOperationException>(() => Validate(data));
        data = Definition();
        data.encounter_groups.Add(data.encounter_groups[0]);
        Assert.Throws<InvalidOperationException>(() => Validate(data));
        data = Definition();
        data.monster_pool.Remove("support");
        Assert.Throws<InvalidOperationException>(() => Validate(data));
    }

    private static ChambersRulesData Rules(int cap = 50, int veteranCap = 200)
    {
        var rules = new ChambersRulesData { minimum_level = 40, room_count = 3 };
        ChambersRows.Tabulate(rules, cap, veteranCap,
            level => level * 10000L, veteran => 1 + Math.Min(veteran, 100) / 20,
            (level, veteran, room, guardian) => level * 10000 + veteran * 10 + room + (guardian ? 1 : 0),
            (level, veteran, room, guardian) => level + veteran + room + (guardian ? 1 : 0));
        ChambersRows.AddStochasticMetadata(rules);
        return rules;
    }

    [Fact]
    public void DomainsIncludeEveryIntegerAndBothGuardianVariantsWithoutInterpolation()
    {
        var rules = Rules();
        Assert.Equal(Enumerable.Range(40, 11), rules.player_levels);
        Assert.Equal(Enumerable.Range(0, 201), rules.veteran_points);
        Assert.Equal(Enumerable.Range(37, 20), rules.enemy_levels);
        Assert.Equal(new[] { 0, 1, 2 }, rules.room_indices);
        Assert.Equal(50, rules.completion_experience.Count);
        Assert.Equal(201, rules.maximum_enemy_level_bonus.Count);
        Assert.Equal(20 * 201 * 3 * 2, rules.scaling.Count);
        Assert.Equal(rules.scaling.Count, rules.scaling.Select(row => (row.enemy_level, row.veteran_points, row.room_index, row.guardian)).Distinct().Count());
        Assert.All(rules.scaling, row =>
        {
            Assert.Equal(row.enemy_level * 10000 + row.veteran_points * 10 + row.room_index + (row.guardian ? 1 : 0), row.health);
            Assert.Equal(row.enemy_level + row.veteran_points + row.room_index + (row.guardian ? 1 : 0), row.power);
        });
        Assert.Equal(6, rules.maximum_enemy_level_bonus.Single(row => row.veteran_points == 100).bonus);
        Assert.Equal(6, rules.maximum_enemy_level_bonus.Single(row => row.veteran_points == 200).bonus);
    }

    [Fact]
    public void TabulationRetainsIntegerGameResultsExactly()
    {
        var rules = new ChambersRulesData { minimum_level = 40, room_count = 3 };
        ChambersRows.Tabulate(rules, 40, 0, _ => 150000,
            _ => 1, (_, _, room, guardian) => guardian ? 17976 : new[] { 4200, 4347, 4494 }[room],
            (_, _, room, guardian) => guardian ? 265 : new[] { 180, 184, 189 }[room]);
        var ordinary = rules.scaling.Single(row => row.enemy_level == 40 && row.room_index == 1 && !row.guardian);
        Assert.Equal(4347, ordinary.health);
        Assert.Equal(184, ordinary.power);
        var restored = JsonConvert.DeserializeObject<ChambersRulesData>(ExportJson.Serialize(rules))!;
        Assert.Equal(rules.scaling.Select(row => row.health), restored.scaling.Select(row => row.health));
    }

    [Theory]
    [InlineData(39, 200)]
    [InlineData(50, -1)]
    public void InvalidDomainsFail(int cap, int veteranCap)
    {
        Assert.Throws<InvalidOperationException>(() => ChambersRows.Tabulate(
            new() { minimum_level = 40, room_count = 3 }, cap, veteranCap,
            _ => 0, _ => 1, (_, _, _, _) => 0, (_, _, _, _) => 0));
    }

    [Theory]
    [InlineData(39, 0, 0, 0)]
    [InlineData(40, 200, 1, 2)]
    [InlineData(49, 200, 1, 2)]
    [InlineData(50, 99, 1, 3)]
    [InlineData(50, 100, 2, 4)]
    [InlineData(50, 199, 2, 4)]
    [InlineData(50, 200, 3, 5)]
    public void SeededProbesMatchExactBandsAndWeights(int level, int veteran, int minimum, int maximum)
    {
        var rules = Rules();
        foreach (var seed in new[] { 0, 1, 42, int.MaxValue })
        foreach (var guardian in new[] { false, true })
        {
            var random = new Random(seed);
            var offsets = Enumerable.Range(guardian ? 0 : -3, 1 + Math.Min(veteran, 100) / 20 - (guardian ? 0 : -3) + 1).ToArray();
            var draw = random.Next(offsets.Sum(offset => 7 - Math.Abs(offset)));
            var chosen = offsets.Last();
            foreach (var offset in offsets)
            {
                draw -= 7 - Math.Abs(offset);
                if (draw >= 0) continue;
                chosen = offset;
                break;
            }
            var probe = new ChambersRandomProbeData
            {
                seed = seed, player_level = level, veteran_points = veteran, guardian = guardian,
                reward = maximum == 0 ? 0 : new Random(seed).Next(minimum, maximum + 1), enemy_level = level + chosen
            };
            ChambersRows.VerifyRandomProbe(rules, probe);
            probe.enemy_level++;
            Assert.Throws<InvalidOperationException>(() => ChambersRows.VerifyRandomProbe(rules, probe));
            probe.enemy_level--;
            probe.reward++;
            Assert.Throws<InvalidOperationException>(() => ChambersRows.VerifyRandomProbe(rules, probe));
        }
    }

    [Fact]
    public void TrialProbesDetectChangedBagAndFinalTrial()
    {
        var rules = Rules();
        foreach (var seed in new[] { 0, 1, 42, int.MaxValue })
        {
            var bag = rules.trial_bag.ToArray();
            var random = new Random(seed);
            for (var i = bag.Length - 1; i > 0; i--)
            {
                var j = random.Next(i + 1);
                (bag[i], bag[j]) = (bag[j], bag[i]);
            }
            var probe = new ChambersTrialProbeData { seed = seed, trials = new() { bag[0], bag[1], "Guardian" } };
            ChambersRows.VerifyTrialProbe(rules, probe);
            probe.trials[2] = "Battle";
            Assert.Throws<InvalidOperationException>(() => ChambersRows.VerifyTrialProbe(rules, probe));
        }
        Assert.Equal(new[] { 2, 2, 1, 1, 1 }, rules.trial_bag.GroupBy(kind => kind).Select(group => group.Count()));
    }

    [Fact]
    public void PrivateChallengeFieldsAndStableIdsRoundTripExplicitly()
    {
        var data = Definition();
        data.riddles.Add(new()
        {
            id = "chambers_riddle_0", source_index = 0, question = "Private question",
            choices = new() { "First", "Second", "Third", "Fourth" }, correct_answer_index = 2
        });
        data.rune_puzzles.Add(new()
        {
            id = "chambers_rune_puzzle_7", source_id = 7, title = "Private title", clue = "Private clue",
            rune_words = new() { "One", "Two", "Three", "Four" }, solution_order = new() { 0, 1, 2, 3 }
        });
        ChambersRows.ValidateChallenges(data);
        var restored = JsonConvert.DeserializeObject<ChambersOfChaosData>(ExportJson.Serialize(data))!;
        Assert.Equal("chambers_riddle_0", restored.riddles[0].id);
        Assert.Equal(2, restored.riddles[0].correct_answer_index);
        Assert.Equal("Private clue", restored.rune_puzzles[0].clue);
        Assert.Equal(new[] { 0, 1, 2, 3 }, restored.rune_puzzles[0].solution_order);
        ChambersRows.ValidateChallenges(restored);
        restored.riddles[0].correct_answer_index = 4;
        Assert.Throws<InvalidOperationException>(() => ChambersRows.ValidateChallenges(restored));
        restored.riddles[0].correct_answer_index = 2;
        restored.rune_puzzles[0].solution_order[3] = 2;
        Assert.Throws<InvalidOperationException>(() => ChambersRows.ValidateChallenges(restored));
    }

    [Fact]
    public void AddedItemAndKeeperFieldsSerializeIncludingExplicitNull()
    {
        var nullItem = JObject.Parse(ExportJson.Serialize(new ItemData { item_type = "augment" }));
        Assert.Equal(JTokenType.Null, nullItem["augment_next_quality_id"]!.Type);
        var linkedItem = JObject.Parse(ExportJson.Serialize(new ItemData { augment_next_quality_id = "next" }));
        Assert.Equal("next", linkedItem.Value<string>("augment_next_quality_id"));
        var catalyst = JObject.Parse(ExportJson.Serialize(new ItemData { item_type = "augment_upgrade" }));
        Assert.Equal("augment_upgrade", catalyst.Value<string>("item_type"));
        Assert.True(JObject.Parse(ExportJson.Serialize(new NpcRoles { is_chambers_of_chaos_keeper = true })).Value<bool>("is_chambers_of_chaos_keeper"));
        Assert.False(JObject.Parse(ExportJson.Serialize(new NpcRoles())).Value<bool>("is_chambers_of_chaos_keeper"));
    }
}
