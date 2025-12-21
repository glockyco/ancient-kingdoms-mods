namespace DataExporter.Models;

public class ProfessionData
{
    public string id { get; set; }
    public string name { get; set; }
    public string description { get; set; }
    public string category { get; set; }
    public string icon_path { get; set; }
    public string steam_achievement_id { get; set; }
    public string steam_achievement_name { get; set; }
    public string steam_achievement_description { get; set; }
    public int max_level { get; set; }
    public string tracking_type { get; set; }
    public int? tracking_denominator { get; set; }
}
