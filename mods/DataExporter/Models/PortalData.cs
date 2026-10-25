#nullable enable

namespace DataExporter.Models;

public class PortalData
{
    public PortalData(string id, string from_zone_id, Position position, string to_zone_id, Position destination, Position orientation)
    {
        this.id = id;
        this.from_zone_id = from_zone_id;
        this.position = position;
        this.to_zone_id = to_zone_id;
        this.destination = destination;
        this.orientation = orientation;
    }

    public string id { get; set; }
    public bool is_interactable { get; set; }

    // Location
    public string from_zone_id { get; set; }
    public string? from_sub_zone_id { get; set; }
    public Position position { get; set; }

    // Destination
    public string to_zone_id { get; set; }
    public string? to_sub_zone_id { get; set; }
    public Position destination { get; set; }
    public Position orientation { get; set; }

    // Requirements
    public string? required_item_id { get; set; }
    public bool requires_everyone_key { get; set; }
    public int level_required { get; set; }
    public int item_level_required { get; set; }
    public string? need_monster_dead_id { get; set; }
    [Newtonsoft.Json.JsonProperty(NullValueHandling = Newtonsoft.Json.NullValueHandling.Include)]
    public string? need_monster_dead_spawn_id { get; set; }
    public bool is_closed { get; set; }
}
