namespace DataExporter.Models;

public class BuffData
{
    public string id { get; set; }
    public string name { get; set; }
    public float duration_base { get; set; }
    public float duration_per_level { get; set; }
    public bool remain_after_death { get; set; }
    public string category { get; set; }
    public bool is_invisibility { get; set; }
    public bool is_poison_debuff { get; set; }
    public bool is_fire_debuff { get; set; }
    public bool is_cold_debuff { get; set; }
    public bool is_disease_debuff { get; set; }
    public bool is_melee_debuff { get; set; }
    public bool is_cleanse { get; set; }
    public bool is_dispel { get; set; }
    public bool is_ward { get; set; }
    public bool is_blindness { get; set; }
}
