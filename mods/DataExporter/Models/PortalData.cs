namespace DataExporter.Models;

public class PortalData
{
    public string id { get; set; }
    public string from_zone_id { get; set; }
    public string to_zone_id { get; set; }
    public Position position { get; set; }
    public Position destination { get; set; }
    public string required_item_id { get; set; }
    public int level_required { get; set; }
    public bool is_closed { get; set; }
}
