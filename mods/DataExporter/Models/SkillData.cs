namespace DataExporter.Models;

public class SkillData
{
    public string id { get; set; }
    public string name { get; set; }
    public string className { get; set; }
    public int tier { get; set; }
    public int max_level { get; set; }
    public int level_required { get; set; }
    public string prerequisite_skill_id { get; set; }
    public int prerequisite_level { get; set; }
    public int mana_cost { get; set; }
    public int energy_cost { get; set; }
    public float cooldown { get; set; }
    public float cast_time { get; set; }
    public float cast_range { get; set; }
    public string tooltip { get; set; }
    public string icon_path { get; set; }
}
