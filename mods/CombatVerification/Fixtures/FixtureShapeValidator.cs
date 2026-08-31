#nullable disable
using System.Collections.Generic;
using System.Linq;

namespace CombatVerification.Fixtures
{
    /// <summary>One reason a fixture was refused, naming the field at fault.</summary>
    public sealed class FixtureProblem
    {
        public string Field { get; set; }
        public string Message { get; set; }

        public override string ToString() => $"{Field}: {Message}";
    }

    public sealed class FixtureValidation
    {
        public IReadOnlyList<FixtureProblem> Problems { get; set; }
        public bool Ok => Problems.Count == 0;
    }

    /// <summary>
    /// Checks descriptor structure without reading game state. A verification run uses this
    /// check before launch, while the runtime check owns questions that need game definitions.
    /// </summary>
    public static class FixtureShapeValidator
    {
        public static FixtureValidation Validate(FixtureDescriptor fixture)
        {
            var problems = new List<FixtureProblem>();

            if (fixture == null)
            {
                Add(problems, "fixture", "No descriptor was supplied.");
                return Result(problems);
            }

            if (!FixtureSchema.Supported.Contains(fixture.SchemaVersion))
                Add(problems, "schemaVersion",
                    $"Version {fixture.SchemaVersion} is not supported. Supported: "
                    + $"{string.Join(", ", FixtureSchema.Supported.OrderBy(v => v))}.");

            Require(problems, "name", fixture.Name);
            Require(problems, "gameVersion", fixture.GameVersion);

            if (fixture.Seed == null)
                Add(problems, "seed", "A seed is required so a measurement can be repeated.");

            if (fixture.Character == null)
                Add(problems, "character", "A descriptor must state its character.");
            else
                ValidateCharacter(problems, fixture.Character);

            if (fixture.Companions != null)
                ValidateCompanions(problems, fixture.Companions);

            if (fixture.Consumables == null)
                Add(problems, "consumables",
                    "Required. State an empty list to declare that none are used.");
            else
            {
                foreach (var consumable in fixture.Consumables)
                    Require(problems, "consumables", consumable);
            }

            if (fixture.Target != null)
            {
                Require(problems, "target.spawn", fixture.Target.Spawn);
                if (fixture.Target.Level is < 1)
                    Add(problems, "target.level", "Must be at least 1 when stated.");
            }

            ValidateActions(problems, fixture.Actions);
            return Result(problems);
        }

        private static void ValidateCharacter(
            List<FixtureProblem> problems, CharacterSpec character)
        {
            Require(problems, "character.class", character.Class);
            Require(problems, "character.race", character.Race);

            if (character.Level < 1)
                Add(problems, "character.level", "Must be at least 1.");

            if (character.VeteranPoints < 0)
                Add(problems, "character.veteranPoints", "Must be zero or greater.");

            if (character.AllocatedAttributes == null)
                Add(problems, "character.allocatedAttributes",
                    "Required. State an empty object to allocate nothing.");
            else
            {
                foreach (var pair in character.AllocatedAttributes)
                {
                    if (pair.Value < 0)
                        Add(problems, $"character.allocatedAttributes.{pair.Key}",
                            $"{pair.Value} is negative; a fixture spends points, it does not remove them.");
                }
            }

            if (character.Skills == null)
                Add(problems, "character.skills",
                    "Required. State an empty list to learn nothing.");
            else
                ValidateSkills(problems, character.Skills);

            if (character.Equipment == null)
                Add(problems, "character.equipment",
                    "Required. State an empty list to equip nothing.");
            else
                ValidateEquipment(problems, "character.equipment", character.Equipment);
        }

        private static void ValidateSkills(
            List<FixtureProblem> problems, IReadOnlyList<SkillSpec> skills)
        {
            var duplicates = skills
                .Where(skill => skill != null && !string.IsNullOrWhiteSpace(skill.Name))
                .GroupBy(skill => skill.Name)
                .Where(group => group.Count() > 1);
            foreach (var duplicate in duplicates)
                Add(problems, $"character.skills.{duplicate.Key}",
                    "Named more than once; a skill has one level.");

            for (var i = 0; i < skills.Count; i++)
            {
                var skill = skills[i];
                if (skill == null)
                {
                    Add(problems, $"character.skills[{i}]", "An entry is required.");
                    continue;
                }

                var field = $"character.skills.{skill.Name ?? "<unnamed>"}";
                Require(problems, field, skill.Name);
                if (skill.Level < 0)
                    Add(problems, field, "Level must be zero or greater.");
            }
        }

        private static void ValidateCompanions(
            List<FixtureProblem> problems, IReadOnlyList<CompanionSpec> companions)
        {
            for (var i = 0; i < companions.Count; i++)
            {
                var companion = companions[i];
                var field = $"companions[{i}]";
                if (companion == null)
                {
                    Add(problems, field, "An entry is required.");
                    continue;
                }

                Require(problems, $"{field}.archetype", companion.Archetype);
                if (companion.Equipment == null)
                    Add(problems, $"{field}.equipment",
                        "Required. State an empty list to equip nothing.");
                else
                    ValidateEquipment(problems, $"{field}.equipment", companion.Equipment);
            }
        }

        private static void ValidateEquipment(
            List<FixtureProblem> problems,
            string field,
            IReadOnlyList<EquipmentSpec> equipment)
        {
            var occupied = new HashSet<int>();
            for (var i = 0; i < equipment.Count; i++)
            {
                var entry = equipment[i];
                if (entry == null)
                {
                    Add(problems, $"{field}[{i}]", "An entry is required.");
                    continue;
                }

                var entryField = $"{field}[{entry.Slot}]";
                if (entry.Slot < 0)
                    Add(problems, entryField, "Slot must be zero or greater.");
                else if (!occupied.Add(entry.Slot))
                    Add(problems, $"{field}[{entry.Slot}]", "Slot is filled more than once.");

                Require(problems, $"{entryField}.itemId", entry.ItemId);
                if (entry.Durability == null)
                    Add(problems, $"{entryField}.durability", "Required for an item instance.");
                else if (entry.Durability <= 0)
                    Add(problems, $"{entryField}.durability", "Must be above zero.");
            }
        }

        private static void ValidateActions(
            List<FixtureProblem> problems, IReadOnlyList<ActionSpec> actions)
        {
            if (actions == null)
                return;

            for (var i = 0; i < actions.Count; i++)
            {
                var action = actions[i];
                if (action == null)
                {
                    Add(problems, $"actions[{i}]", "An entry is required.");
                    continue;
                }

                Require(problems, $"actions[{i}].skill", action.Skill);
                Require(problems, $"actions[{i}].facing", action.Facing);
            }
        }

        private static bool Require(
            List<FixtureProblem> problems, string field, string value)
        {
            if (!string.IsNullOrWhiteSpace(value))
                return true;

            Add(problems, field, "Required, and no default is substituted.");
            return false;
        }

        private static void Add(
            List<FixtureProblem> problems, string field, string message)
            => problems.Add(new FixtureProblem { Field = field, Message = message });

        private static FixtureValidation Result(List<FixtureProblem> problems)
            => new FixtureValidation { Problems = problems };
    }
}
