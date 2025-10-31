using System.Collections.Generic;

namespace DataExporter.Models;

public class QuestObjective
{
    public string type { get; set; }
    public string target_monster_id { get; set; }
    public string target_item_id { get; set; }
    public int amount { get; set; }
    public string zone_id { get; set; }
    public Position position { get; set; }
}

public class QuestRewardItem
{
    public string item_id { get; set; }
    public string class_specific { get; set; }
}

public class QuestRewards
{
    public int gold { get; set; }
    public int exp { get; set; }
    public List<QuestRewardItem> items { get; set; } = new();
}

public class FactionRequirement
{
    public string faction { get; set; }
    public double faction_value { get; set; }
}

public class GatherItemAmount
{
    public string item_id { get; set; }
    public int amount { get; set; }
}

public class QuestData
{
    // === Base ScriptableQuest fields (always present) ===
    public string id { get; set; }
    public string name { get; set; }
    public string quest_type { get; set; }  // kill/gather/gather_inventory/location/equip_item/alchemy
    public int level_required { get; set; }
    public int level_recommended { get; set; }
    public string start_npc_id { get; set; }
    public string end_npc_id { get; set; }
    public string predecessor_id { get; set; }
    public bool is_main_quest { get; set; }
    public bool is_epic_quest { get; set; }
    public bool is_adventurer_quest { get; set; }
    public List<string> race_requirements { get; set; } = new();
    public List<string> class_requirements { get; set; } = new();
    public List<FactionRequirement> faction_requirements { get; set; } = new();
    public List<QuestObjective> objectives { get; set; } = new();
    public QuestRewards rewards { get; set; } = new();
    public string tooltip { get; set; }
    public string tooltip_complete { get; set; }

    // === KillQuest fields (when quest_type = kill) ===
    public string kill_target_1_id { get; set; }
    public int kill_amount_1 { get; set; }
    public string kill_target_2_id { get; set; }
    public int kill_amount_2 { get; set; }

    // === GatherQuest fields (when quest_type = gather) ===
    public string gather_item_1_id { get; set; }
    public int gather_amount_1 { get; set; }
    public string gather_item_2_id { get; set; }
    public int gather_amount_2 { get; set; }
    public string gather_item_3_id { get; set; }
    public int gather_amount_3 { get; set; }

    // === GatherInventoryQuest fields (when quest_type = gather_inventory) ===
    public List<GatherItemAmount> gather_items { get; set; }
    public List<GatherItemAmount> required_items { get; set; }
    public bool remove_items_on_complete { get; set; }

    // === LocationQuest fields (when quest_type = location) ===
    public string tracking_quest_location { get; set; }
    public string discovered_location { get; set; }
    public bool is_find_npc_quest { get; set; }

    // === EquipItemQuest fields (when quest_type = equip_item) ===
    public List<string> equip_items { get; set; }

    // === AlchemyQuest fields (when quest_type = alchemy) ===
    public string potion_item_id { get; set; }
    public int potions_amount { get; set; }
    public float increase_alchemy_skill { get; set; }
}
