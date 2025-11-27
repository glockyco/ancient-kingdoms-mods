namespace DataExporter.Models;

public class ZoneTriggerData
{
    public string id { get; set; }
    public string name { get; set; }
    public byte zone_id { get; set; }
    public bool is_outdoor { get; set; }
    public Position position { get; set; }

    // Collider bounds for position-based zone detection
    public float? bounds_min_x { get; set; }
    public float? bounds_min_y { get; set; }
    public float? bounds_max_x { get; set; }
    public float? bounds_max_y { get; set; }

    public string bloom_color { get; set; }
    public float light_intensity { get; set; }
    public string audio_zone { get; set; }
    public string loop_sounds_zone { get; set; }
}
