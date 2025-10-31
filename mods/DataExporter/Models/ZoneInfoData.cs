namespace DataExporter.Models;

public class ZoneInfoData
{
    public int zone_id { get; set; }
    public string id { get; set; }
    public string name { get; set; }
    public bool is_dungeon { get; set; }
    public string weather_type { get; set; }
    public float weather_probability { get; set; }
    public int required_level { get; set; }
    public string description { get; set; }
    public float min_zoom_map { get; set; }
    public float max_zoom_map { get; set; }
}
