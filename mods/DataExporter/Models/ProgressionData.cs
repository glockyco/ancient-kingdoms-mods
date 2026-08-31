using System.Collections.Generic;

namespace DataExporter.Models;

public sealed class AttributeValuesData
{
    public int strength { get; set; }
    public int constitution { get; set; }
    public int dexterity { get; set; }
    public int intelligence { get; set; }
    public int wisdom { get; set; }
    public int charisma { get; set; }
}

public sealed class RaceProgressionData
{
    public string id { get; set; } = "";
    public string name { get; set; } = "";
    public AttributeValuesData starting_attributes { get; set; } = new();
}

public sealed class ClassLevelProgressionData
{
    public string class_id { get; set; } = "";
    public int level { get; set; }
    public AttributeValuesData automatic_attributes { get; set; } = new();
}

public sealed class LevelBudgetData
{
    public int level { get; set; }
    public int normal_skill_points { get; set; }
    public int attribute_points { get; set; }
}

public sealed class ProgressionData
{
    public int max_level { get; set; }
    public int max_veteran_points { get; set; }
    public int attribute_points_per_veteran { get; set; }
    public int veteran_skill_points_per_veteran { get; set; }
    public IReadOnlyList<RaceProgressionData> races { get; set; } = new List<RaceProgressionData>();
    public IReadOnlyList<ClassLevelProgressionData> class_levels { get; set; } =
        new List<ClassLevelProgressionData>();
    public IReadOnlyList<LevelBudgetData> level_budgets { get; set; } = new List<LevelBudgetData>();
}
