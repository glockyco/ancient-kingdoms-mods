using System.Collections.Generic;

namespace DataExporter.Models;

public class ItemData
{
    // === Base ScriptableItem fields (always present) ===
    public string id { get; set; }
    public string name { get; set; }
    public string item_type { get; set; }  // equipment/potion/food/book/scroll/mount/backpack/travel/pack/random/chest/relic/monster_scroll/structure
    public string weapon_category { get; set; }
    public string slot { get; set; }
    public byte quality { get; set; }
    public int level_required { get; set; }
    public List<string> class_required { get; set; } = new();
    public int faction_required_to_buy { get; set; }
    public float adventuring_level_needed { get; set; }
    public bool is_key { get; set; }
    public bool is_chest_key { get; set; }
    public bool has_gather_quest { get; set; }

    public int buy_price { get; set; }
    public int sell_price { get; set; }
    public bool tradable { get; set; }
    public bool is_quest_item { get; set; }

    public string icon_path { get; set; }
    public string tooltip { get; set; }

    // === EquipmentItem fields (when item_type = equipment) ===
    public ItemStats stats { get; set; }

    // === PotionItem fields (when item_type = potion) ===
    public int usage_health { get; set; }
    public int usage_mana { get; set; }
    public int usage_energy { get; set; }
    public int usage_experience { get; set; }
    public int usage_pet_health { get; set; }
    public string potion_buff_id { get; set; }
    public int potion_buff_level { get; set; }

    // === FoodItem fields (when item_type = food) ===
    public string food_buff_id { get; set; }
    public string food_type { get; set; }
    public int food_buff_level { get; set; }

    // === BookItem fields (when item_type = book) ===
    public string book_text { get; set; }
    public int book_strength_gain { get; set; }
    public int book_dexterity_gain { get; set; }
    public int book_constitution_gain { get; set; }
    public int book_intelligence_gain { get; set; }
    public int book_wisdom_gain { get; set; }
    public int book_charisma_gain { get; set; }

    // === ScrollItem fields (when item_type = scroll) ===
    public string scroll_skill_id { get; set; }
    public bool is_repair_kit { get; set; }

    // === MountItem fields (when item_type = mount) ===
    public float mount_speed { get; set; }

    // === BackpackItem fields (when item_type = backpack) ===
    public int backpack_slots { get; set; }

    // === TravelItem fields (when item_type = travel) ===
    public int travel_zone_id { get; set; }
    public string travel_destination_name { get; set; }
    public Position travel_destination { get; set; }

    // === PackItem fields (when item_type = pack) ===
    public string pack_final_item_id { get; set; }
    public int pack_final_amount { get; set; }

    // === RandomItem fields (when item_type = random) ===
    public List<string> random_items { get; set; }

    // === ChestItem fields (when item_type = chest) ===
    public List<ItemDropChance> chest_rewards { get; set; }
    public int chest_num_items { get; set; }

    // === RelicItem fields (when item_type = relic) ===
    public string relic_buff_id { get; set; }
    public int relic_buff_level { get; set; }

    // === MonsterScrollItem fields (when item_type = monster_scroll) ===
    public List<SpawnedMonster> spawned_monsters { get; set; }

    // === CustomStructureItem fields (when item_type = structure) ===
    public long structure_price { get; set; }
    public List<Position> structure_available_rotations { get; set; }
}

public class SpawnedMonster
{
    public string monster_id { get; set; }
    public int amount { get; set; }
    public float distance_multiplier { get; set; }
}

public class ItemDropChance
{
    public string item_id { get; set; }
    public float probability { get; set; }
}

public class ItemStats
{
    // Attributes
    public int strength { get; set; }
    public int constitution { get; set; }
    public int dexterity { get; set; }
    public int charisma { get; set; }
    public int intelligence { get; set; }
    public int wisdom { get; set; }

    // Resources
    public int health_bonus { get; set; }
    public int hp_regen_bonus { get; set; }
    public int mana_bonus { get; set; }
    public int mana_regen_bonus { get; set; }
    public int energy_bonus { get; set; }

    // Combat
    public int damage { get; set; }
    public int magic_damage { get; set; }
    public int defense { get; set; }
    public int magic_resist { get; set; }

    // Resistances
    public int poison_resist { get; set; }
    public int fire_resist { get; set; }
    public int cold_resist { get; set; }
    public int disease_resist { get; set; }

    // Combat stats
    public float block_chance { get; set; }
    public float accuracy { get; set; }
    public float critical_chance { get; set; }
    public float haste { get; set; }
    public float spell_haste { get; set; }

    // Equipment-specific
    public int max_durability { get; set; }
    public string augment_bonus_set { get; set; }
    public bool has_serenity { get; set; }
    public bool is_costume { get; set; }
}
