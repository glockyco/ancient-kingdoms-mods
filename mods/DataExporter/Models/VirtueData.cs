using System.Collections.Generic;

namespace DataExporter.Models;

/// <summary>The virtue rules the game holds as data, written to virtues.json.</summary>
public class VirtueExportData
{
    /// <summary>Points at which ranks 0 to 5 start, from VirtueRules.Thresholds.</summary>
    public List<int> rank_thresholds { get; set; } = new();
    /// <summary>The label the game shows below rank 1, where no title is unlocked.</summary>
    public string rank_zero_label { get; set; } = "";
    /// <summary>Humility's Armor Class and resistance multiplier for ranks 0 to 5.</summary>
    public List<float> humility_multipliers { get; set; } = new();
    /// <summary>Compassion points for a completed escort, VirtueEncounters.EscortPoints.</summary>
    public int escort_points { get; set; }
    /// <summary>Honesty points for a returned belonging, VirtueEncounters.ReturnPoints.</summary>
    public int return_points { get; set; }
    public List<VirtueData> virtues { get; set; } = new();
}

public class VirtueData
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    /// <summary>The game's one-line description of the blessing.</summary>
    public string summary { get; set; } = "";
    public string blessing_skill_id { get; set; } = "";
    public List<VirtueRankData> ranks { get; set; } = new();
}

public class VirtueRankData
{
    public int rank { get; set; }
    public int points { get; set; }
    /// <summary>The title rank 1 to 5 unlocks, and "" for rank 0.</summary>
    public string title { get; set; } = "";
    /// <summary>The game's English text for this rank's blessing effect.</summary>
    public string effect { get; set; } = "";
}

/// <summary>A virtue shrine placed in the World scene, written to virtue_shrines.json.</summary>
public class VirtueShrineData
{
    public string id { get; set; } = "";
    public string virtue_id { get; set; } = "";
    /// <summary>The English shrine name, such as "Shrine of Valor".</summary>
    public string name { get; set; } = "";
    public string zone_id { get; set; } = "";
    public string sub_zone_id { get; set; } = "";
    public Position position { get; set; } = new(0, 0, 0);
}
