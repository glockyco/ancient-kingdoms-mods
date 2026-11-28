using System.Collections.Generic;
using Newtonsoft.Json;

namespace DataExporter.Models;

public class GatherItemData
{
    // Identity
    public string id { get; set; }
    public string name { get; set; }
    [JsonProperty("resource_id", NullValueHandling = NullValueHandling.Include)]
    public string resource_id { get; set; }
    public string zone_id { get; set; }
    public string sub_zone_id { get; set; }
    public Position position { get; set; }
    public bool is_template { get; set; }

    // Type flags
    public bool is_plant { get; set; }
    public bool is_fishing_spot { get; set; }
    public bool is_mineral { get; set; }
    public bool is_chest { get; set; }
    public bool is_radiant_spark { get; set; }

    // Requirements and level
    public int level { get; set; }
    public string tool_required_id { get; set; }

    // Spawning and respawn
    public double respawn_time { get; set; }
    public float respawn_min { get; set; }
    public float respawn_max { get; set; }
    public bool spawn_ready { get; set; }
    public float prob_despawn { get; set; }

    // Rewards
    public string item_reward_id { get; set; }
    public int item_reward_amount { get; set; }
    public int gold_min { get; set; }
    public int gold_max { get; set; }
    public List<ItemDrop> random_drops { get; set; } = new();

    // Chest-specific
    public float chest_reward_probability { get; set; }
    public List<string> chest_interaction_messages { get; set; } = new();
    /// <summary>GatherItem.bonusChestSupplies, or null when the chest has none.</summary>
    [JsonProperty(NullValueHandling = NullValueHandling.Include)]
    public ChestSuppliesData chest_supplies { get; set; }

    // Faction impact
    public string decrease_faction { get; set; }

    // Description and UI
    public string description { get; set; }
}

/// <summary>
/// A WorldChestSupplies asset: the potion and scroll a looted chest can add.
/// Pools keep their authored order.
/// </summary>
public class ChestSuppliesData
{
    public string id { get; set; }
    public float potion_chance { get; set; }
    public float scroll_chance { get; set; }
    public List<string> potion_ids { get; set; } = new();
    public List<string> utility_potion_ids { get; set; } = new();
    public List<string> scroll_ids { get; set; } = new();
}
