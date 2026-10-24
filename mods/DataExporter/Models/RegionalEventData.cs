using System.Collections.Generic;

namespace DataExporter.Models;

/// <summary>The Dynamic Events configuration: the server's settings and every city invasion.</summary>
public class RegionalEventData
{
    public bool enabled { get; set; }
    public float activity_duration_minutes { get; set; }
    public float prosperity_duration_minutes { get; set; }
    public List<RegionalInvasionData> invasions { get; set; } = new();
}

public class RegionalInvasionData
{
    public string id { get; set; }
    /// <summary>The <c>RegionalInvasionCity</c> member, such as <c>Elven</c>.</summary>
    public string city { get; set; }
    public string city_name { get; set; }
    public string zone_id { get; set; }
    public Point2 center { get; set; }
    public float radius { get; set; }
    public float health_multiplier { get; set; }
    public int minimum_level { get; set; }
    public int maximum_level { get; set; }
    /// <summary>Attacker monster IDs in the order the waves cycle through them.</summary>
    public List<string> attacker_monster_ids { get; set; } = new();
}
