#nullable enable

using System.Collections.Generic;
using Newtonsoft.Json;

namespace DataExporter.Models;

public sealed class ChambersOfChaosData
{
    public string id { get; set; } = "chambers_of_chaos";
    public string zone_id { get; set; } = "";
    public string keeper_npc_id { get; set; } = "";
    public string seal_item_id { get; set; } = "";
    public string reward_item_id { get; set; } = "";
    public List<string> monster_pool { get; set; } = new();
    public List<ChambersEncounterGroupData> encounter_groups { get; set; } = new();
    public ChambersRulesData rules { get; set; } = new();
    public List<ChambersRiddleData> riddles { get; set; } = new();
    public List<ChambersRunePuzzleData> rune_puzzles { get; set; } = new();
}

public sealed class ChambersEncounterGroupData
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public string guards_monster_id { get; set; } = "";
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public string? support_monster_id { get; set; }
}

public sealed class ChambersRulesData
{
    public int room_count { get; set; }
    public int run_duration_seconds { get; set; }
    public int minimum_level { get; set; }
    public int wave_count { get; set; }
    public int maximum_hunt_targets { get; set; }
    public int maximum_clear_targets { get; set; }
    public int puzzle_penalty_guards { get; set; }
    public int combat_experience_multiplier { get; set; }
    public List<int> player_levels { get; set; } = new();
    public List<int> veteran_points { get; set; } = new();
    public List<int> enemy_levels { get; set; } = new();
    public List<int> room_indices { get; set; } = new();
    public List<ChambersCompletionExperienceData> completion_experience { get; set; } = new();
    public List<ChambersMaximumBonusData> maximum_enemy_level_bonus { get; set; } = new();
    public List<ChambersScalingData> scaling { get; set; } = new();
    public List<ChambersRewardBandData> reward_bands { get; set; } = new();
    public List<ChambersLevelOffsetData> enemy_level_offsets { get; set; } = new();
    public List<string> trial_bag { get; set; } = new();
    public string final_trial { get; set; } = "";
    public List<ChambersRandomProbeData> random_probes { get; set; } = new();
    public List<ChambersTrialProbeData> trial_probes { get; set; } = new();
}

public sealed class ChambersCompletionExperienceData
{
    public int level { get; set; }
    public long experience { get; set; }
}

public sealed class ChambersMaximumBonusData
{
    public int veteran_points { get; set; }
    public int bonus { get; set; }
}

public sealed class ChambersScalingData
{
    public int enemy_level { get; set; }
    public int veteran_points { get; set; }
    public int room_index { get; set; }
    public bool guardian { get; set; }
    public int health { get; set; }
    public int power { get; set; }
}

public sealed class ChambersRewardBandData
{
    public int minimum_level { get; set; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public int? maximum_level { get; set; }
    public int minimum_veteran_points { get; set; }
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public int? maximum_veteran_points { get; set; }
    public int minimum_quantity { get; set; }
    public int maximum_quantity { get; set; }
    public string distribution { get; set; } = "uniform_integer";
}

public sealed class ChambersLevelOffsetData
{
    public int offset { get; set; }
    public int weight { get; set; }
    public bool ordinary { get; set; }
    public bool guardian { get; set; }
}

public sealed class ChambersRandomProbeData
{
    public int seed { get; set; }
    public int player_level { get; set; }
    public int veteran_points { get; set; }
    public bool guardian { get; set; }
    public int reward { get; set; }
    public int enemy_level { get; set; }
}

public sealed class ChambersTrialProbeData
{
    public int seed { get; set; }
    public List<string> trials { get; set; } = new();
}

public sealed class ChambersRiddleData
{
    public string id { get; set; } = "";
    public int source_index { get; set; }
    public string question { get; set; } = "";
    public List<string> choices { get; set; } = new();
    public int correct_answer_index { get; set; }
}

public sealed class ChambersRunePuzzleData
{
    public string id { get; set; } = "";
    public int source_id { get; set; }
    public string title { get; set; } = "";
    public string clue { get; set; } = "";
    public List<string> rune_words { get; set; } = new();
    public List<int> solution_order { get; set; } = new();
}
