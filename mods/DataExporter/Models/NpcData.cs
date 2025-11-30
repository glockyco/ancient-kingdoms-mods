using System.Collections.Generic;

namespace DataExporter.Models;

public class NpcSpawnData
{
    public string id { get; set; }
    public string npc_id { get; set; }
    public string zone_id { get; set; }
    public string sub_zone_id { get; set; }
    public Position position { get; set; }

    // Movement and patrol
    public Position origin_follow_position { get; set; }
    public float follow_distance { get; set; }
    public float move_distance { get; set; }
    public float move_probability { get; set; }
    public List<Position> patrol_waypoints { get; set; } = new();
}

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
    public string currency_item_id { get; set; }
}

public class NpcData
{
    // Identity
    public string id { get; set; }
    public string name { get; set; }
    public string faction { get; set; }
    public string race { get; set; }

    // Roles and services
    public NpcRoles roles { get; set; } = new();
    public List<string> quests_offered { get; set; } = new();
    public List<ItemSold> items_sold { get; set; } = new();

    // Base stats
    public int level { get; set; }
    public int health { get; set; }
    public int mana { get; set; }

    // Combat stats (calculated at base level)
    public int damage { get; set; }
    public int magic_damage { get; set; }
    public int defense { get; set; }
    public int magic_resist { get; set; }
    public int poison_resist { get; set; }
    public int fire_resist { get; set; }
    public int cold_resist { get; set; }
    public int disease_resist { get; set; }
    public float block_chance { get; set; }
    public float critical_chance { get; set; }
    public float accuracy { get; set; }

    // Stat scaling (LinearInt: actual = base + bonus_per_level * (level - 1))
    public int health_base { get; set; }
    public int health_per_level { get; set; }
    public int mana_base { get; set; }
    public int mana_per_level { get; set; }
    public int damage_base { get; set; }
    public int damage_per_level { get; set; }
    public int magic_damage_base { get; set; }
    public int magic_damage_per_level { get; set; }
    public int defense_base { get; set; }
    public int defense_per_level { get; set; }
    public int magic_resist_base { get; set; }
    public int magic_resist_per_level { get; set; }
    public int poison_resist_base { get; set; }
    public int poison_resist_per_level { get; set; }
    public int fire_resist_base { get; set; }
    public int fire_resist_per_level { get; set; }
    public int cold_resist_base { get; set; }
    public int cold_resist_per_level { get; set; }
    public int disease_resist_base { get; set; }
    public int disease_resist_per_level { get; set; }

    // Combat flags
    public bool invincible { get; set; }
    public bool see_invisibility { get; set; }
    public bool is_summonable { get; set; }
    public bool flee_on_low_hp { get; set; }

    // Spawning and respawn
    public int respawn_dungeon_id { get; set; }
    public int gold_required_respawn_dungeon { get; set; }
    public float respawn_probability { get; set; }
    public bool can_hide_after_spawn { get; set; }
    public float respawn_time { get; set; }

    // Loot and rewards (when killed)
    public int gold_min { get; set; }
    public int gold_max { get; set; }
    public float probability_drop_gold { get; set; }
    public List<ItemDrop> drops { get; set; } = new();

    // Messages and interactions
    public List<string> welcome_messages { get; set; } = new();
    public List<string> shout_messages { get; set; } = new();
    public List<string> aggro_messages { get; set; } = new();
    public float aggro_message_probability { get; set; }
    public string summon_message { get; set; }

    // Skills (for guards and hostile NPCs)
    public List<string> skill_ids { get; set; } = new();

    // Teleport (for NPCs that teleport players)
    public string teleport_zone_id { get; set; }
    public Position teleport_destination { get; set; }
    public int teleport_price { get; set; }
    public string teleport_message { get; set; }
}
