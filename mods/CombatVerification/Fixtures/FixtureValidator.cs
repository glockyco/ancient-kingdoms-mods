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
    /// Checks that a fixture describes a character the game could produce. Refuses rather
    /// than clamping, and names the field and the permitted range, because a clamped
    /// fixture would be measured as something other than what was asked for.
    /// </summary>
    public static class FixtureValidator
    {
        public static FixtureValidation Validate(FixtureDescriptor fixture, IFixtureRules rules)
        {
            var problems = new List<FixtureProblem>();

            if (fixture == null)
            {
                Add(problems, "fixture", "No descriptor was supplied.");
                return Result(problems);
            }

            if (!rules.SupportedSchemaVersions.Contains(fixture.SchemaVersion))
                Add(problems, "schemaVersion",
                    $"Version {fixture.SchemaVersion} is not supported. Supported: "
                    + $"{string.Join(", ", rules.SupportedSchemaVersions.OrderBy(v => v))}.");

            Require(problems, "name", fixture.Name);
            Require(problems, "gameVersion", fixture.GameVersion);

            if (fixture.Seed == null)
                Add(problems, "seed", "A seed is required so a measurement can be repeated.");

            if (fixture.Character == null)
                Add(problems, "character", "A descriptor must state its character.");
            else
                ValidateCharacter(problems, fixture.Character, rules);

            // Absent is not empty. The stat sheet depends on the declared consumables, so an
            // absent list means nobody looked, and no default may stand in for that.
            if (fixture.Consumables == null)
                Add(problems, "consumables",
                    "Required. State an empty list to declare that none are used.");
            else
                ValidateConsumables(problems, fixture.Consumables, rules);
            ValidateActions(problems, fixture.Actions);

            return Result(problems);
        }

        private static void ValidateCharacter(
            List<FixtureProblem> problems, CharacterSpec character, IFixtureRules rules)
        {
            var hasClass = Require(problems, "character.class", character.Class);
            var hasRace = Require(problems, "character.race", character.Race);

            if (hasClass && !rules.ClassExists(character.Class))
                Add(problems, "character.class", $"'{character.Class}' is not a class the game defines.");
            else if (hasClass && hasRace && !rules.IsRaceCompatible(character.Class, character.Race))
                Add(problems, "character.race",
                    $"'{character.Race}' cannot be a {character.Class}.");

            if (character.Level < 1 || character.Level > rules.MaxLevel)
                Add(problems, "character.level",
                    $"{character.Level} is outside the reachable range 1 to {rules.MaxLevel}.");

            ValidateVeteranPoints(problems, character, rules);

            // Each of these changes the stat sheet, so an absent section is a refusal
            // rather than an assumption of nothing.
            if (character.AllocatedAttributes == null)
                Add(problems, "character.allocatedAttributes",
                    "Required. State an empty object to allocate nothing.");
            else
                ValidateAttributes(problems, character, rules);

            if (character.Skills == null)
                Add(problems, "character.skills",
                    "Required. State an empty list to learn nothing.");
            else
                ValidateSkills(problems, character, rules);

            if (character.Equipment == null)
                Add(problems, "character.equipment",
                    "Required. State an empty list to equip nothing.");
            else
                ValidateEquipment(problems, character, rules);
        }

        private static void ValidateVeteranPoints(
            List<FixtureProblem> problems, CharacterSpec character, IFixtureRules rules)
        {
            if (character.VeteranPoints == 0)
                return;

            if (character.Level < rules.MaxLevel)
                Add(problems, "character.veteranPoints",
                    $"Veteran points exist only at level {rules.MaxLevel}; this fixture is level "
                    + $"{character.Level}. Permitted here: 0.");
            else if (character.VeteranPoints < 0 || character.VeteranPoints > rules.MaxVeteranPoints)
                Add(problems, "character.veteranPoints",
                    $"{character.VeteranPoints} is outside the obtainable range 0 to "
                    + $"{rules.MaxVeteranPoints}.");
        }

        private static void ValidateAttributes(
            List<FixtureProblem> problems, CharacterSpec character, IFixtureRules rules)
        {
            if (character.AllocatedAttributes.Count == 0)
                return;

            foreach (var pair in character.AllocatedAttributes)
            {
                if (!rules.AttributeNames.Contains(pair.Key))
                    Add(problems, $"character.allocatedAttributes.{pair.Key}",
                        $"Not an attribute the game defines. Defined: "
                        + $"{string.Join(", ", rules.AttributeNames)}.");
                else if (pair.Value < 0)
                    Add(problems, $"character.allocatedAttributes.{pair.Key}",
                        $"{pair.Value} is negative; a fixture spends points, it does not remove them.");
            }

            var budget = rules.AllocatableAttributePoints(character.Level, character.VeteranPoints);
            var spent = character.AllocatedAttributes.Values.Where(v => v > 0).Sum();
            if (spent > budget)
                Add(problems, "character.allocatedAttributes",
                    $"Spends {spent} points against {budget} allocatable at level {character.Level} "
                    + $"with {character.VeteranPoints} veteran points. Shortfall: {spent - budget}.");
        }

        private static void ValidateSkills(
            List<FixtureProblem> problems, CharacterSpec character, IFixtureRules rules)
        {
            if (character.Skills.Count == 0)
                return;

            var duplicates = character.Skills
                .Where(s => !string.IsNullOrWhiteSpace(s.Name))
                .GroupBy(s => s.Name)
                .Where(g => g.Count() > 1);
            foreach (var duplicate in duplicates)
                Add(problems, $"character.skills.{duplicate.Key}",
                    "Named more than once; a skill has one level.");

            var normalSpend = 0;
            var veteranSpend = 0;

            foreach (var skill in character.Skills)
            {
                var field = $"character.skills.{skill.Name ?? "<unnamed>"}";
                if (!Require(problems, field, skill.Name))
                    continue;

                if (!rules.TryGetSkill(skill.Name, out var rule))
                {
                    Add(problems, field, "Not a skill the game defines.");
                    continue;
                }

                if (skill.Level < 0 || skill.Level > rule.MaxLevel)
                {
                    Add(problems, field,
                        $"Level {skill.Level} is outside the range 0 to {rule.MaxLevel}.");
                    continue;
                }

                if (rule.Classes.Count > 0 && !rule.Classes.Contains(character.Class))
                    Add(problems, field,
                        $"A {character.Class} cannot learn it. Classes: "
                        + $"{string.Join(", ", rule.Classes)}.");

                if (rule.IsVeteran && character.Level < rules.MaxLevel)
                    Add(problems, field,
                        $"A veteran skill needs level {rules.MaxLevel}; this fixture is level "
                        + $"{character.Level}.");

                if (skill.Level > 0 && !string.IsNullOrWhiteSpace(rule.PrerequisiteSkill))
                {
                    var prerequisite = character.Skills
                        .FirstOrDefault(s => s.Name == rule.PrerequisiteSkill);
                    if (prerequisite == null || prerequisite.Level < rule.PrerequisiteLevel)
                        Add(problems, field,
                            $"Requires '{rule.PrerequisiteSkill}' at level "
                            + $"{rule.PrerequisiteLevel} or above.");
                }

                var cost = CostOf(rule, skill.Level);
                if (rule.IsVeteran) veteranSpend += cost; else normalSpend += cost;
            }

            CheckPool(problems, "character.skills", "normal", normalSpend,
                rules.SkillPointsAtLevel(character.Level));
            CheckPool(problems, "character.skills", "veteran", veteranSpend,
                character.Level < rules.MaxLevel ? 0 : character.VeteranPoints);

            CheckTierAndSpendGates(problems, character, rules);
        }

        private static void CheckTierAndSpendGates(
            List<FixtureProblem> problems, CharacterSpec character, IFixtureRules rules)
        {
            foreach (var skill in character.Skills)
            {
                if (skill.Level <= 0 || string.IsNullOrWhiteSpace(skill.Name)) continue;
                if (!rules.TryGetSkill(skill.Name, out var rule)) continue;
                if (rule.RequiredSpentPoints <= 0) continue;

                // Points spent in the same pool on other skills unlock this one.
                var spentElsewhere = character.Skills
                    .Where(s => s.Name != skill.Name && s.Level > 0
                                && !string.IsNullOrWhiteSpace(s.Name))
                    .Select(s => rules.TryGetSkill(s.Name, out var other)
                        && other.IsVeteran == rule.IsVeteran
                        ? CostOf(other, s.Level) : 0)
                    .Sum();

                if (spentElsewhere < rule.RequiredSpentPoints)
                    Add(problems, $"character.skills.{skill.Name}",
                        $"Needs {rule.RequiredSpentPoints} points already spent in its pool; the "
                        + $"fixture spends {spentElsewhere} elsewhere.");
            }
        }

        private static void ValidateEquipment(
            List<FixtureProblem> problems, CharacterSpec character, IFixtureRules rules)
        {
            if (character.Equipment.Count == 0)
                return;

            var occupied = new Dictionary<int, EquipmentSpec>();
            foreach (var entry in character.Equipment)
            {
                var field = $"character.equipment[{entry.Slot}]";

                if (entry.Slot < 0 || entry.Slot >= rules.EquipmentSlotCount)
                {
                    Add(problems, field,
                        $"Slot is outside the range 0 to {rules.EquipmentSlotCount - 1}.");
                    continue;
                }

                if (occupied.ContainsKey(entry.Slot))
                {
                    Add(problems, field, "Slot is filled more than once.");
                    continue;
                }

                occupied[entry.Slot] = entry;

                if (!Require(problems, $"{field}.itemId", entry.ItemId))
                    continue;

                if (!rules.TryGetItem(entry.ItemId, out var rule))
                {
                    Add(problems, $"{field}.itemId", $"'{entry.ItemId}' is not an item the game defines.");
                    continue;
                }

                if (rule.Slot != entry.Slot)
                    Add(problems, field,
                        $"'{entry.ItemId}' belongs in slot {rule.Slot}, not {entry.Slot}.");

                if (rule.LevelRequired > character.Level)
                    Add(problems, $"{field}.itemId",
                        $"Requires level {rule.LevelRequired}; this fixture is level "
                        + $"{character.Level}.");

                if (rule.Classes.Count > 0 && !rule.Classes.Contains(character.Class))
                    Add(problems, $"{field}.itemId",
                        $"A {character.Class} cannot equip it. Classes: "
                        + $"{string.Join(", ", rule.Classes)}.");

                if (!string.IsNullOrWhiteSpace(entry.AugmentId) && !rules.AugmentExists(entry.AugmentId))
                    Add(problems, $"{field}.augmentId",
                        $"'{entry.AugmentId}' is not an augment the game defines.");

                if (entry.Durability is <= 0)
                    Add(problems, $"{field}.durability",
                        "Must be above zero; the game ignores an item at zero durability.");
            }

            CheckTwoHandedOffhand(problems, occupied, rules);
        }

        private static void CheckTwoHandedOffhand(
            List<FixtureProblem> problems,
            Dictionary<int, EquipmentSpec> occupied,
            IFixtureRules rules)
        {
            var twoHanded = occupied.Values.FirstOrDefault(e =>
                !string.IsNullOrWhiteSpace(e.ItemId)
                && rules.TryGetItem(e.ItemId, out var rule) && rule.IsTwoHanded);

            if (twoHanded == null) return;
            if (!occupied.TryGetValue(rules.OffhandSlot, out var offhand)) return;
            if (ReferenceEquals(offhand, twoHanded)) return;

            Add(problems, $"character.equipment[{rules.OffhandSlot}]",
                $"'{twoHanded.ItemId}' is two-handed, so the offhand must be empty. It holds "
                + $"'{offhand.ItemId}'.");
        }

        private static void ValidateConsumables(
            List<FixtureProblem> problems, List<string> consumables, IFixtureRules rules)
        {
            if (consumables == null) return;

            foreach (var consumable in consumables)
            {
                if (string.IsNullOrWhiteSpace(consumable))
                    Add(problems, "consumables", "An entry is blank.");
                else if (!rules.ConsumableExists(consumable))
                    Add(problems, "consumables",
                        $"'{consumable}' is not a consumable the game defines.");
            }
        }

        private static void ValidateActions(List<FixtureProblem> problems, List<ActionSpec> actions)
        {
            if (actions == null) return;

            for (var i = 0; i < actions.Count; i++)
            {
                Require(problems, $"actions[{i}].skill", actions[i].Skill);

                if (string.IsNullOrWhiteSpace(actions[i].Facing))
                    Add(problems, $"actions[{i}].facing",
                        "A facing is required, because facing changes both avoidance and damage.");
            }
        }

        private static int CostOf(SkillRule rule, int level)
        {
            if (level <= 0 || rule.CumulativeCost == null || rule.CumulativeCost.Count == 0)
                return 0;

            var index = level - 1;
            return index < rule.CumulativeCost.Count
                ? rule.CumulativeCost[index]
                : rule.CumulativeCost[rule.CumulativeCost.Count - 1];
        }

        private static void CheckPool(
            List<FixtureProblem> problems, string field, string pool, int spend, int budget)
        {
            if (spend > budget)
                Add(problems, field,
                    $"Spends {spend} {pool} skill points against {budget} available. "
                    + $"Shortfall: {spend - budget}.");
        }

        private static bool Require(List<FixtureProblem> problems, string field, string value)
        {
            if (!string.IsNullOrWhiteSpace(value)) return true;
            Add(problems, field, "Required, and no default is substituted.");
            return false;
        }

        private static void Add(List<FixtureProblem> problems, string field, string message)
            => problems.Add(new FixtureProblem { Field = field, Message = message });

        private static FixtureValidation Result(List<FixtureProblem> problems)
            => new FixtureValidation { Problems = problems };
    }
}
