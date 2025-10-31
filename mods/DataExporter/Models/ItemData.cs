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
    public int lightning_resist { get; set; }
    public int poison_resist { get; set; }
}
