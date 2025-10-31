using System.Collections.Generic;

namespace DataExporter.Models;

public class ItemData
{
    public string id { get; set; }
    public string name { get; set; }
    public string type { get; set; }
    public string weapon_category { get; set; }
    public string slot { get; set; }
    public string quality { get; set; }
    public int level_required { get; set; }
    public List<string> class_required { get; set; } = new();

    public ItemStats stats { get; set; } = new();

    public int buy_price { get; set; }
    public int sell_price { get; set; }
    public bool tradable { get; set; }
    public bool is_quest_item { get; set; }

    public string icon_path { get; set; }
    public string tooltip { get; set; }

    // Mount-specific
    public float? mount_speed { get; set; }

    // Food-specific
    public string food_buff_id { get; set; }
    public string food_type { get; set; }
    public int? food_buff_level { get; set; }

    // Book-specific (stat tomes)
    public int? book_strength_gain { get; set; }
    public int? book_dexterity_gain { get; set; }
    public int? book_constitution_gain { get; set; }
    public int? book_intelligence_gain { get; set; }
    public int? book_wisdom_gain { get; set; }
    public int? book_charisma_gain { get; set; }

    // Monster scroll-specific
    public List<SpawnedMonster> spawned_monsters { get; set; } = new();
}

public class SpawnedMonster
{
    public string monster_id { get; set; }
    public int amount { get; set; }
}

public class ItemStats
{
    public int damage { get; set; }
    public int magic_damage { get; set; }
    public int defense { get; set; }
    public int magic_resist { get; set; }
    public int strength { get; set; }
    public int dexterity { get; set; }
    public int constitution { get; set; }
    public int intelligence { get; set; }
    public int wisdom { get; set; }
    public int charisma { get; set; }
    public int health_bonus { get; set; }
    public int mana_bonus { get; set; }
    public float critical_chance { get; set; }
    public float block_chance { get; set; }
    public float haste { get; set; }
    public int fire_resist { get; set; }
    public int ice_resist { get; set; }
    public int poison_resist { get; set; }
    public int disease_resist { get; set; }
}
