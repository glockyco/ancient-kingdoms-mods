using System.Collections.Generic;

namespace DataExporter.Models;

public class AltarWaveMonster
{
    public string monster_id { get; set; }
    public string monster_name { get; set; }
    public int base_level { get; set; }
    public Position spawn_location { get; set; }
}

public class AltarWave
{
    public int wave_number { get; set; }
    public string init_wave_message { get; set; }
    public string finish_wave_message { get; set; }
    public int seconds_before_start { get; set; }
    public int seconds_to_complete_wave { get; set; }
    public bool require_all_monsters_cleared { get; set; }
    public List<AltarWaveMonster> monsters { get; set; } = new();
}

public class AltarData
{
    // Identity
    public string id { get; set; }
    public string name { get; set; }
    public string type { get; set; } // "forgotten" or "avatar"

    // Location
    public string zone_id { get; set; }
    public Position position { get; set; }

    // Requirements
    public int min_level_required { get; set; }
    public string required_activation_item_id { get; set; }
    public string required_activation_item_name { get; set; }

    // Event configuration
    public string init_event_message { get; set; }
    public int radius_event { get; set; }
    public bool uses_veteran_scaling { get; set; }

    // Rewards (for forgotten altars only)
    public string reward_normal_id { get; set; }
    public string reward_normal_name { get; set; }
    public string reward_magic_id { get; set; }
    public string reward_magic_name { get; set; }
    public string reward_epic_id { get; set; }
    public string reward_epic_name { get; set; }
    public string reward_legendary_id { get; set; }
    public string reward_legendary_name { get; set; }

    // Wave configuration
    public int total_waves { get; set; }
    public int estimated_duration_seconds { get; set; }
    public List<AltarWave> waves { get; set; } = new();
}
