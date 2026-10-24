using System.Collections.Generic;

namespace DataExporter.Models;

/// <summary>
/// The Dynamic Events configuration: the server's settings, every city invasion, and what each
/// event region can host.
/// </summary>
public class RegionalEventData
{
    public bool enabled { get; set; }
    public float activity_duration_minutes { get; set; }
    public float prosperity_duration_minutes { get; set; }
    public List<RegionalInvasionData> invasions { get; set; } = new();
    public List<RegionalEventRegionData> regions { get; set; } = new();
}

/// <summary>The fishing, cooking and hunting requests a region can host, as the game discovers them.</summary>
public class RegionalEventRegionData
{
    public string zone_id { get; set; }
    public bool fishing { get; set; }
    /// <summary>The <c>RegionalInvasionCity</c> whose ovens host the cooking request, or null.</summary>
    public string cooking_city { get; set; }
    /// <summary>The animal whose meat a dish must contain, directly or through another dish.</summary>
    public string cooking_animal { get; set; }
    /// <summary>The ingredients the game counts as that animal's meat.</summary>
    public List<string> cooking_meat_ids { get; set; } = new();
    public List<string> cooking_dish_ids { get; set; } = new();
    public List<RegionalHuntTargetData> hunt_targets { get; set; } = new();
    /// <summary>Dungeons whose kills count as this region's for Prosperity.</summary>
    public List<string> dungeon_zone_ids { get; set; } = new();
}

public class RegionalHuntTargetData
{
    public string monster_id { get; set; }
    /// <summary>The most players in the region at whose goal the animal can still be chosen.</summary>
    public int max_players { get; set; }
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
