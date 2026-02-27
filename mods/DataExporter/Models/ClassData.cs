namespace DataExporter.Models;

public class ClassCombatData
{
    // Identity (sanitized from prefab name, e.g. "Player Cleric" -> "cleric")
    public string id { get; set; }
    public string name { get; set; }

    // Resource type (detected from which pool has level scaling)
    public string resource_type { get; set; }

    // Base combat stats (LinearInt: actual = base + per_level * (level - 1))
    public int base_health_value { get; set; }
    public int base_health_per_level { get; set; }
    public int base_mana_value { get; set; }
    public int base_mana_per_level { get; set; }
    public int base_energy_value { get; set; }
    public int base_energy_per_level { get; set; }
    public int base_damage_value { get; set; }
    public int base_damage_per_level { get; set; }
    public int base_magic_damage_value { get; set; }
    public int base_magic_damage_per_level { get; set; }
    public int base_defense_value { get; set; }
    public int base_defense_per_level { get; set; }
    public int base_magic_resist_value { get; set; }
    public int base_magic_resist_per_level { get; set; }
    public int base_poison_resist_value { get; set; }
    public int base_poison_resist_per_level { get; set; }
    public int base_fire_resist_value { get; set; }
    public int base_fire_resist_per_level { get; set; }
    public int base_cold_resist_value { get; set; }
    public int base_cold_resist_per_level { get; set; }
    public int base_disease_resist_value { get; set; }
    public int base_disease_resist_per_level { get; set; }
    public float base_block_chance_value { get; set; }
    public float base_block_chance_per_level { get; set; }
    public float base_accuracy_value { get; set; }
    public float base_accuracy_per_level { get; set; }
    public float base_critical_chance_value { get; set; }
    public float base_critical_chance_per_level { get; set; }
}
