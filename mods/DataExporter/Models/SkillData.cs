namespace DataExporter.Models;

public class SkillData
{
    public string id { get; set; }
    public string name { get; set; }
    public int tier { get; set; }
    public int max_level { get; set; }
    public int level_required { get; set; }
    public int required_skill_points { get; set; }
    public int required_spent_points { get; set; }
    public string prerequisite_skill_id { get; set; }
    public int prerequisite_level { get; set; }
    public string prerequisite2_skill_id { get; set; }
    public int prerequisite2_level { get; set; }
    public string required_weapon_category { get; set; }
    public int mana_cost { get; set; }
    public int energy_cost { get; set; }
    public float cooldown { get; set; }
    public float cast_time { get; set; }
    public float cast_range { get; set; }
    public bool learn_default { get; set; }
    public bool show_cast_bar { get; set; }
    public bool cancel_cast_if_target_died { get; set; }
    public bool allow_dungeon { get; set; }
    public bool is_spell { get; set; }
    public bool is_veteran { get; set; }
    public bool is_mercenary_skill { get; set; }
    public bool is_pet_skill { get; set; }
    public bool followup_default_attack { get; set; }
    public string skill_aggro_message { get; set; }
    public string tooltip { get; set; }
    public string icon_path { get; set; }
}
