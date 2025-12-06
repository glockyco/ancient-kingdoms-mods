namespace DataExporter.Models;

public class TrapData
{
    public string id { get; set; }
    public string name { get; set; }
    public string zone_id { get; set; }
    public string sub_zone_id { get; set; }
    public Position position { get; set; }

    // Type discriminator: "disarmable", "dangerous_ground", "wall_trap"
    public string type { get; set; }

    // Effect applied (debuff or damage skill)
    public string effect_skill_id { get; set; }

    // Disarmable trap message
    public string message { get; set; }

    // Teleport properties (for disarmable and dangerous_ground)
    public bool has_teleport { get; set; }
    public string teleport_zone_id { get; set; }
    public Position teleport_position { get; set; }
    public Position teleport_orientation { get; set; }

    // Wall trap specific
    public float? fire_interval { get; set; }
    public float? trap_width { get; set; }
    public float? trap_height { get; set; }
}
