using System.Collections.Generic;

namespace DataExporter.Models;

public class NpcRoles
{
    public bool is_merchant { get; set; }
    public bool is_quest_giver { get; set; }
    public bool can_repair_equipment { get; set; }
    public bool is_bank { get; set; }
    public bool is_skill_master { get; set; }
    public bool is_veteran_master { get; set; }
    public bool is_reset_attributes { get; set; }
    public bool is_soul_binder { get; set; }
    public bool is_inkeeper { get; set; }
    public bool is_taskgiver_adventurer { get; set; }
    public bool is_merchant_adventurer { get; set; }
    public bool is_recruiter_mercenaries { get; set; }
    public bool is_guard { get; set; }
    public bool is_faction_vendor { get; set; }
    public bool is_essence_trader { get; set; }
    public bool is_priestess { get; set; }
    public bool is_augmenter { get; set; }
}

public class ItemSold
{
    public string item_id { get; set; }
    public int price { get; set; }
}

public class NpcData
{
    public string id { get; set; }
    public string name { get; set; }
    public string zone_id { get; set; }
    public Position position { get; set; }
    public bool is_template { get; set; }
    public string faction { get; set; }
    public string race { get; set; }
    public NpcRoles roles { get; set; } = new();
    public int respawn_dungeon_id { get; set; }
    public int gold_required_respawn_dungeon { get; set; }
    public float respawn_probability { get; set; }
    public bool can_hide_after_spawn { get; set; }
    public float respawn_time { get; set; }
    public List<string> quests_offered { get; set; } = new();
    public List<ItemSold> items_sold { get; set; } = new();

    // Interaction and behavior
    public Position origin_follow_position { get; set; }
    public float follow_distance { get; set; }
    public bool flee_on_low_hp { get; set; }
    public List<string> welcome_messages { get; set; } = new();
    public List<string> shout_messages { get; set; } = new();
    public List<string> aggro_messages { get; set; } = new();
    public float aggro_message_probability { get; set; }
}
