using System.Collections.Generic;

namespace DataExporter.Models;

public class PetData
{
    // Identity
    public string id { get; set; }
    public string name { get; set; }

    // Classification
    public bool is_familiar { get; set; }
    public bool is_mercenary { get; set; }
    public string type_monster { get; set; }  // "Warrior", "Rogue", "Creature", etc.

    // Behavior flags
    public bool has_buffs { get; set; }
    public bool has_heals { get; set; }

    // Base stats (for mercenaries - familiars scale with owner)
    public int level { get; set; }
    public int health { get; set; }

    // Combat stats (calculated at current level)
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

    // Stat scaling (LinearInt/LinearFloat: actual = base + per_level * (level - 1))
    public int health_base { get; set; }
    public int health_per_level { get; set; }
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
    public float block_chance_base { get; set; }
    public float block_chance_per_level { get; set; }
    public float critical_chance_base { get; set; }
    public float critical_chance_per_level { get; set; }

    // Skills
    public List<string> skill_ids { get; set; } = new();
    public List<string> innate_skill_ids { get; set; } = new();

    // Visual
    public string icon_path { get; set; }
}
