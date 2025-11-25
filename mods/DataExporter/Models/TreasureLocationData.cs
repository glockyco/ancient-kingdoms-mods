namespace DataExporter.Models;

public class TreasureLocationData
{
    public string id { get; set; }
    public string zone_id { get; set; }
    public Position position { get; set; }
    public string required_map_id { get; set; }
    public string reward_id { get; set; }
}
