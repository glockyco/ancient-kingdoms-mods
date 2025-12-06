namespace DataExporter.Models;

public class InteractiveObjectData
{
    public string id { get; set; }
    public string name { get; set; }
    public string zone_id { get; set; }
    public string sub_zone_id { get; set; }
    public Position position { get; set; }

    // Flavor text displayed on interaction
    public string message { get; set; }

    // Teleport properties
    public bool has_destination { get; set; }
    public string destination_zone_id { get; set; }
    public Position destination_position { get; set; }
    public Position destination_orientation { get; set; }

    // Requirements
    public string required_item_id { get; set; }
}
