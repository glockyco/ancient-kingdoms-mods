#nullable enable

using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;

namespace DataExporter.Exporters;

public static class ChambersRows
{
    public static void ValidateReferences(ChambersOfChaosData data, ISet<string> npcIds,
        ISet<string> itemIds, ISet<string> monsterIds, ISet<string> zoneIds)
    {
        Require(zoneIds, data.zone_id, "zone");
        Require(npcIds, data.keeper_npc_id, "keeper");
        Require(itemIds, data.seal_item_id, "seal");
        Require(itemIds, data.reward_item_id, "reward");
        if (data.seal_item_id == data.reward_item_id)
            throw new InvalidOperationException("Chambers seal and reward must be distinct.");
        if (data.monster_pool.Count == 0 || data.encounter_groups.Count == 0)
            throw new InvalidOperationException("Chambers monster pool and encounter groups must not be empty.");
        var pool = new HashSet<string>(StringComparer.Ordinal);
        foreach (var id in data.monster_pool)
        {
            Require(monsterIds, id, "pool monster");
            if (!pool.Add(id)) throw new InvalidOperationException($"Chambers duplicate pool monster '{id}'.");
        }
        var groups = new HashSet<string>(StringComparer.Ordinal);
        foreach (var group in data.encounter_groups)
        {
            if (string.IsNullOrWhiteSpace(group.id) || !groups.Add(group.id))
                throw new InvalidOperationException($"Chambers missing or duplicate encounter group identity '{group.id}'.");
            Require(pool, group.guards_monster_id, $"encounter '{group.id}' guards");
            if (group.support_monster_id != null)
                Require(pool, group.support_monster_id, $"encounter '{group.id}' support");
        }
    }

    private static void Require(ISet<string> ids, string id, string context)
    {
        if (string.IsNullOrWhiteSpace(id) || !ids.Contains(id))
            throw new InvalidOperationException($"Chambers {context}: unresolved reference '{id}'.");
    }

    public static void Tabulate(ChambersRulesData rules, int maximumLevel, int maximumVeteranPoints,
        int maximumSealLevel, Func<int, float> sealChance, Func<int, long> completionExperience,
        Func<int, int> maximumBonus, Func<int, int, int, bool, int> health,
        Func<int, int, int, bool, int> power)
    {
        if (rules.minimum_level < 1 || maximumLevel < rules.minimum_level || maximumVeteranPoints < 0
            || maximumSealLevel < 55 || rules.room_count < 1)
            throw new InvalidOperationException("Chambers progression or rule domain is invalid.");
        rules.player_levels = Enumerable.Range(rules.minimum_level, maximumLevel - rules.minimum_level + 1).ToList();
        rules.veteran_points = Enumerable.Range(0, maximumVeteranPoints + 1).ToList();
        rules.room_indices = Enumerable.Range(0, rules.room_count).ToList();
        rules.seal_drop_levels = Enumerable.Range(1, maximumSealLevel).ToList();
        foreach (var level in rules.seal_drop_levels)
            rules.seal_drop_chances.Add(new() { level = level, chance = sealChance(level) });
        // Completion uses current level at the guardian's death, not the entry snapshot.
        foreach (var level in Enumerable.Range(1, maximumLevel))
            rules.completion_experience.Add(new() { level = level, experience = completionExperience(level) });
        foreach (var veteran in rules.veteran_points)
            rules.maximum_enemy_level_bonus.Add(new() { veteran_points = veteran, bonus = maximumBonus(veteran) });
        // Source: server-scripts/MadMageTowerRules.cs:EnemyLevel — ordinary enemies start at max(-3, 1-playerLevel), guardians at zero.
        var minimumEnemyLevel = Math.Max(1, rules.minimum_level - 3);
        var maximumEnemyLevel = maximumLevel + rules.maximum_enemy_level_bonus.Max(row => row.bonus);
        rules.enemy_levels = Enumerable.Range(minimumEnemyLevel, maximumEnemyLevel - minimumEnemyLevel + 1).ToList();
        foreach (var level in rules.enemy_levels)
        foreach (var veteran in rules.veteran_points)
        foreach (var room in rules.room_indices)
        foreach (var guardian in new[] { false, true })
            rules.scaling.Add(new()
            {
                enemy_level = level, veteran_points = veteran, room_index = room, guardian = guardian,
                health = health(level, veteran, room, guardian), power = power(level, veteran, room, guardian)
            });
    }

    public static void AddStochasticMetadata(ChambersRulesData rules)
    {
        // Source: server-scripts/MadMageTowerRules.cs:Reward — Next uses an exclusive upper bound, with entry-level and total-veteran reward bands.
        rules.reward_bands = new()
        {
            new() { minimum_level = 40, maximum_level = 49, minimum_veteran_points = 0, minimum_quantity = 1, maximum_quantity = 2 },
            new() { minimum_level = 50, minimum_veteran_points = 0, maximum_veteran_points = 99, minimum_quantity = 1, maximum_quantity = 3 },
            new() { minimum_level = 50, minimum_veteran_points = 100, maximum_veteran_points = 199, minimum_quantity = 2, maximum_quantity = 4 },
            new() { minimum_level = 50, minimum_veteran_points = 200, minimum_quantity = 3, maximum_quantity = 5 }
        };
        // Source: server-scripts/MadMageTowerRules.cs:EnemyLevel — offset weights are 7-abs(offset), truncated by player level, guardian status and MaximumEnemyLevelBonus.
        for (var offset = -3; offset <= rules.maximum_enemy_level_bonus.Max(row => row.bonus); offset++)
            rules.enemy_level_offsets.Add(new()
            {
                offset = offset, weight = 7 - Math.Abs(offset), ordinary = true, guardian = offset >= 0
            });
        // Source: server-scripts/MadMageTowerRules.cs:Trials — shuffle the seven-entry bag without replacement, take two, then append Guardian.
        rules.trial_bag = new() { "Battle", "Waves", "Battle", "Riddle", "Runes", "Manuscript", "Waves" };
        rules.final_trial = "Guardian";
    }

    public static void VerifyRandomProbe(ChambersRulesData rules, ChambersRandomProbeData probe)
    {
        var band = rules.reward_bands.SingleOrDefault(row => probe.player_level >= row.minimum_level
            && (!row.maximum_level.HasValue || probe.player_level <= row.maximum_level)
            && probe.veteran_points >= row.minimum_veteran_points
            && (!row.maximum_veteran_points.HasValue || probe.veteran_points <= row.maximum_veteran_points));
        var expectedReward = band == null ? 0 : new Random(probe.seed).Next(band.minimum_quantity, band.maximum_quantity + 1);
        var bonus = rules.maximum_enemy_level_bonus.Single(row => row.veteran_points == probe.veteran_points).bonus;
        var minimumOffset = probe.guardian ? 0 : Math.Max(-3, 1 - probe.player_level);
        var offsets = rules.enemy_level_offsets.Where(row => row.offset >= minimumOffset && row.offset <= bonus).ToList();
        var roll = new Random(probe.seed).Next(offsets.Sum(row => row.weight));
        var expectedLevel = probe.player_level + offsets.Last().offset;
        foreach (var row in offsets)
        {
            roll -= row.weight;
            if (roll >= 0) continue;
            expectedLevel = probe.player_level + row.offset;
            break;
        }
        if (probe.reward != expectedReward || probe.enemy_level != expectedLevel)
            throw new InvalidOperationException($"Chambers stochastic rule parity failed for seed {probe.seed}, level {probe.player_level}, veteran {probe.veteran_points}, guardian {probe.guardian}.");
    }

    public static void VerifyTrialProbe(ChambersRulesData rules, ChambersTrialProbeData probe)
    {
        var bag = rules.trial_bag.ToArray();
        var random = new Random(probe.seed);
        for (var index = bag.Length - 1; index > 0; index--)
        {
            var other = random.Next(index + 1);
            (bag[index], bag[other]) = (bag[other], bag[index]);
        }
        if (!probe.trials.SequenceEqual(new[] { bag[0], bag[1], rules.final_trial }))
            throw new InvalidOperationException($"Chambers trial parity failed for seed {probe.seed}.");
    }

    public static void ValidateChallenges(ChambersOfChaosData data)
    {
        if (data.riddles.Count == 0 || data.rune_puzzles.Count == 0)
            throw new InvalidOperationException("Chambers private challenge definitions are missing.");
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var riddle in data.riddles)
            if (string.IsNullOrWhiteSpace(riddle.id) || !ids.Add(riddle.id) || riddle.source_index < 0
                || riddle.choices.Count != 4 || riddle.correct_answer_index < 0 || riddle.correct_answer_index >= riddle.choices.Count)
                throw new InvalidOperationException($"Chambers invalid riddle '{riddle.id}'.");
        foreach (var puzzle in data.rune_puzzles)
            if (string.IsNullOrWhiteSpace(puzzle.id) || !ids.Add(puzzle.id) || puzzle.source_id < 0
                || puzzle.rune_words.Count != 4 || !puzzle.solution_order.OrderBy(value => value).SequenceEqual(Enumerable.Range(0, 4)))
                throw new InvalidOperationException($"Chambers invalid rune puzzle '{puzzle.id}'.");
    }
}
