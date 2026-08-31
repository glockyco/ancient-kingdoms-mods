using System;
using System.Collections.Generic;
using System.Linq;
using DataExporter.Models;

namespace DataExporter.Exporters;

public static class ProgressionRows
{
    private static readonly string[] ClassIds =
    {
        "warrior", "ranger", "cleric", "rogue", "wizard", "druid",
    };

    public static ProgressionData Create(
        int maxLevel,
        int maxVeteranPoints,
        IEnumerable<string> runtimeClassIds)
    {
        if (maxLevel < 1)
            throw new ArgumentOutOfRangeException(nameof(maxLevel));
        if (maxVeteranPoints < 0)
            throw new ArgumentOutOfRangeException(nameof(maxVeteranPoints));
        if (runtimeClassIds == null)
            throw new ArgumentNullException(nameof(runtimeClassIds));

        var actualClasses = runtimeClassIds.ToHashSet(StringComparer.Ordinal);
        var expectedClasses = ClassIds.ToHashSet(StringComparer.Ordinal);
        var missing = expectedClasses.Except(actualClasses).OrderBy(id => id).ToArray();
        var unexpected = actualClasses.Except(expectedClasses).OrderBy(id => id).ToArray();
        if (missing.Length > 0 || unexpected.Length > 0)
            throw new InvalidOperationException(
                $"Progression rules do not match runtime classes. Missing: {string.Join(", ", missing)}; "
                + $"unexpected: {string.Join(", ", unexpected)}.");

        var classLevels = new List<ClassLevelProgressionData>(ClassIds.Length * maxLevel);
        foreach (var classId in ClassIds)
        {
            for (var level = 1; level <= maxLevel; level++)
            {
                classLevels.Add(new ClassLevelProgressionData
                {
                    class_id = classId,
                    level = level,
                    automatic_attributes = AutomaticAttributes(classId, level),
                });
            }
        }

        var levelBudgets = Enumerable.Range(1, maxLevel)
            .Select(level => new LevelBudgetData
            {
                level = level,
                normal_skill_points = level - 1,
                attribute_points = level - 1,
            })
            .ToArray();

        return new ProgressionData
        {
            max_level = maxLevel,
            max_veteran_points = maxVeteranPoints,
            attribute_points_per_veteran = 1,
            veteran_skill_points_per_veteran = 1,
            races = RaceStartingAttributes(),
            class_levels = classLevels,
            level_budgets = levelBudgets,
        };
    }

    private static AttributeValuesData AutomaticAttributes(string classId, int level) => classId switch
    {
        "warrior" => Attributes(level / 3, level / 2, level / 4, level / 5, level / 6, level / 6),
        "ranger" => Attributes(level / 4, level / 3, level / 2, level / 6, level / 5, level / 6),
        "cleric" => Attributes(level / 5, level / 4, level / 6, level / 3, level / 2, level / 6),
        "rogue" => Attributes(level / 3, level / 4, level / 2, level / 5, level / 6, level / 6),
        "wizard" => Attributes(level / 6, level / 5, level / 3, level / 2, level / 4, level / 6),
        "druid" => Attributes(level / 6, level / 5, level / 4, level / 3, level / 2, level / 6),
        _ => throw new ArgumentOutOfRangeException(nameof(classId)),
    };

    private static IReadOnlyList<RaceProgressionData> RaceStartingAttributes() =>
        new RaceProgressionData[]
        {
            Race("human", "Human", Attributes(2, 1, 2, 1, 1, 1)),
            Race("elf", "Elf", Attributes(1, 1, 2, 1, 2, 1)),
            Race("dark_elf", "Dark Elf", Attributes(1, 1, 2, 2, 1, 1)),
            Race("dwarf", "Dwarf", Attributes(1, 3, 1, 1, 1, 1)),
            Race("fire_goblin", "Fire Goblin", Attributes(2, 2, 1, 1, 1, 1)),
            Race("felarii", "Felarii", Attributes(1, 1, 3, 1, 1, 1)),
            Race("drassar", "Drassar", Attributes(3, 1, 1, 1, 1, 1)),
        };

    private static RaceProgressionData Race(
        string id,
        string name,
        AttributeValuesData attributes) => new()
    {
        id = id,
        name = name,
        starting_attributes = attributes,
    };

    private static AttributeValuesData Attributes(
        int strength,
        int constitution,
        int dexterity,
        int intelligence,
        int wisdom,
        int charisma) => new()
    {
        strength = strength,
        constitution = constitution,
        dexterity = dexterity,
        intelligence = intelligence,
        wisdom = wisdom,
        charisma = charisma,
    };
}
