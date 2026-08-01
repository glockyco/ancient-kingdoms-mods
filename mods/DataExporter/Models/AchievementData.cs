namespace DataExporter.Models;

public class AchievementData
{
    public string id { get; set; }
    public string name { get; set; }
    public string description { get; set; }
    public bool hidden { get; set; }
    public int display_order { get; set; }
    public string unlocked_icon_path { get; set; }
    public string locked_icon_path { get; set; }
}
