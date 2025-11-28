namespace DataExporter.Models;

public class PortalData
{
    public string id { get; set; }
    public bool is_template { get; set; }

    // Location
    public string from_zone_id { get; set; }
    public string from_sub_zone_id { get; set; }
    public Position position { get; set; }

    // Destination
    public string to_zone_id { get; set; }
    public string to_sub_zone_id { get; set; }
    public Position destination { get; set; }
    public Position orientation { get; set; }

    // Requirements
    public string required_item_id { get; set; }
    public int level_required { get; set; }
    public string need_monster_dead_id { get; set; }
    public bool is_closed { get; set; }
}
