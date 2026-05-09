namespace DataExporter.Models;

public class HouseData
{
    public string id { get; set; }
    public string name { get; set; }
    public string description { get; set; }
    public long base_price { get; set; }
    public string faction_id { get; set; }
    public double faction_required { get; set; }
    public string zone_id { get; set; }
    public string sub_zone_id { get; set; }
    public Position position { get; set; }
}
