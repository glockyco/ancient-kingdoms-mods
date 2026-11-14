#nullable enable

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DataExporter.Models;
using Il2Cpp;
using MelonLoader;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace DataExporter.Exporters;

public sealed class ChambersOfChaosExporter : BaseExporter
{
    public ChambersOfChaosExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath) { }

    public override void Export()
    {
        // Load the asset separately so IsValid can report the affected reference instead of Load returning only null.
        var config = UnityEngine.Resources.Load<MadMageTowerConfig>(MadMageTowerConfig.ResourcePath);
        if (config == null) throw new InvalidOperationException("Chambers config is missing.");
        if (!config.IsValid(out var error))
            throw new InvalidOperationException($"Chambers config: {error}");
        var data = new ChambersOfChaosData
        {
            zone_id = RequiredId(Il2Cpp.ZoneInfo.zones[MadMageTower.ZoneId].name, "zone"),
            keeper_npc_id = RequiredId(config.keeper.name, "keeper"),
            seal_item_id = RequiredId(config.seal.name, "seal"),
            reward_item_id = RequiredId(config.reward.name, "reward")
        };
        foreach (var monster in config.monsters)
            data.monster_pool.Add(RequiredId(monster.name, "pool monster"));
        foreach (var group in config.encounterGroups)
            data.encounter_groups.Add(new()
            {
                id = RequiredId(group.name, "encounter group"), name = group.name ?? "",
                guards_monster_id = RequiredId(group.guards.name, $"encounter '{group.name}' guards"),
                support_monster_id = group.support == null ? null : RequiredId(group.support.name, $"encounter '{group.name}' support")
            });
        ChambersRows.ValidateReferences(data, ReadIds("npcs.json"), ReadIds("items.json"),
            ReadIds("monsters.json"), ReadIds("zone_info.json"));
        data.rules = ExportRules();
        ExportChallenges(data);
        ChambersRows.ValidateChallenges(data);
        WriteJson(data, "chambers_of_chaos.json");
    }

    private static string RequiredId(string? name, string context)
    {
        var id = GameIds.Sanitize(name ?? "");
        if (string.IsNullOrWhiteSpace(id))
            throw new InvalidOperationException($"Chambers {context} has no identity.");
        return id;
    }

    private HashSet<string> ReadIds(string file)
    {
        var rows = JArray.Parse(File.ReadAllText(Path.Combine(ExportPath, file)));
        return rows.Select(row => row.Value<string>("id")
            ?? throw new InvalidOperationException($"{file}: missing entity id."))
            .ToHashSet(StringComparer.Ordinal);
    }

    private ChambersRulesData ExportRules()
    {
        var progression = JsonConvert.DeserializeObject<ProgressionData>(File.ReadAllText(Path.Combine(ExportPath, "progression.json")))
            ?? throw new InvalidOperationException("Chambers requires exported progression.");
        if (progression.max_veteran_points != Experience.maxVeteranLevel)
            throw new InvalidOperationException("Chambers progression veteran domain differs from the game cap.");
        var rules = new ChambersRulesData
        {
            room_count = MadMageTowerRules.RoomCount,
            run_duration_seconds = MadMageTowerRules.RunDurationSeconds,
            minimum_level = MadMageTowerRules.MinimumLevel,
            wave_count = MadMageTowerRules.WaveCount,
            maximum_hunt_targets = MadMageTowerRules.MaximumHuntTargets,
            maximum_clear_targets = MadMageTowerRules.MaximumClearTargets,
            puzzle_penalty_guards = MadMageTowerRules.PuzzlePenaltyGuards,
            combat_experience_multiplier = MadMageTowerRules.CombatExperienceMultiplier
        };
        ChambersRows.Tabulate(rules, progression.max_level, Experience.maxVeteranLevel,
            MadMageTowerRules.CompletionExperience,
            MadMageTowerRules.MaximumEnemyLevelBonus, MadMageTowerRules.Health, MadMageTowerRules.Power);
        ChambersRows.AddStochasticMetadata(rules);
        foreach (var seed in new[] { 0, 1, 42, int.MaxValue })
        {
            var trials = new ChambersTrialProbeData { seed = seed, trials = MadMageTowerRules.Trials(seed).Select(kind => kind.ToString()).ToList() };
            ChambersRows.VerifyTrialProbe(rules, trials);
            rules.trial_probes.Add(trials);
            foreach (var level in new[] { rules.minimum_level - 1, rules.minimum_level, 49, 50, progression.max_level }.Distinct())
            foreach (var veteran in new[] { 0, 99, 100, 199, 200, Experience.maxVeteranLevel }.Distinct().Where(value => value <= Experience.maxVeteranLevel))
            foreach (var guardian in new[] { false, true })
            {
                // Each result starts a fresh seeded random stream. Probes test parity, never infer probabilities.
                var probe = new ChambersRandomProbeData
                {
                    seed = seed, player_level = level, veteran_points = veteran, guardian = guardian,
                    reward = MadMageTowerRules.Reward(new Il2CppSystem.Random(seed), level, veteran),
                    enemy_level = MadMageTowerRules.EnemyLevel(new Il2CppSystem.Random(seed), level, veteran, guardian)
                };
                ChambersRows.VerifyRandomProbe(rules, probe);
                rules.random_probes.Add(probe);
            }
        }
        return rules;
    }

    private static void ExportChallenges(ChambersOfChaosData data)
    {
        if (MadMageTowerRiddles.All == null || MadMageTowerPuzzles.All == null)
            throw new InvalidOperationException("Chambers private challenge registry is missing.");
        // Source: server-scripts/MadMageTowerRiddles.cs:Riddle,All,Text — riddles have array-slot identity and canonical choices with a zero-based correct answer.
        for (var index = 0; index < MadMageTowerRiddles.All.Length; index++)
        {
            var riddle = MadMageTowerRiddles.All[index]
                ?? throw new InvalidOperationException($"Chambers riddle {index} is missing.");
            if (riddle.questions == null || riddle.questions.Length == 0 || riddle.answers == null || riddle.answers.Length == 0 || riddle.answers[0] == null)
                throw new InvalidOperationException($"Chambers riddle {index} is missing English content arrays.");
            data.riddles.Add(new()
            {
                id = $"chambers_riddle_{index}", source_index = index,
                question = riddle.questions[0] ?? "", choices = riddle.answers[0].Select(value => value ?? "").ToList(),
                correct_answer_index = riddle.correctAnswer
            });
        }
        // Source: server-scripts/MadMageTowerPuzzles.cs:Definition,LocaleIndex; server-scripts/MadMageTower.cs:Interact — English is locale slot zero and canonical word order is the solution.
        foreach (var puzzle in MadMageTowerPuzzles.All)
        {
            if (puzzle == null || puzzle.Titles == null || puzzle.Titles.Length == 0 || puzzle.Clues == null || puzzle.Clues.Length == 0
                || puzzle.Words == null || puzzle.Words.Length == 0 || puzzle.Words[0] == null)
                throw new InvalidOperationException("Chambers rune puzzle is missing English content arrays.");
            data.rune_puzzles.Add(new()
            {
                id = $"chambers_rune_puzzle_{puzzle.Id}", source_id = puzzle.Id, title = puzzle.Titles[0] ?? "",
                clue = puzzle.Clues[0] ?? "", rune_words = puzzle.Words[0].Select(value => value ?? "").ToList(),
                solution_order = Enumerable.Range(0, puzzle.Words[0].Length).ToList()
            });
        }
    }
}
