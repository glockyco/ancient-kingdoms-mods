namespace DataExporter.Models;

public class CraftingStationData
{
    public string id { get; set; }
    public string name { get; set; }
    public string zone_id { get; set; }
    public string sub_zone_id { get; set; }
    public Position position { get; set; }
    public bool is_cooking_oven { get; set; }
}
