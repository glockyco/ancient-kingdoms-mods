#nullable disable
using System.Collections.Generic;
using DataExporter;
using System.Linq;

namespace CombatVerification.Fixtures
{
    /// <summary>
    /// Checks that a fixture describes a character the game could produce. Refuses rather
    /// than clamping, and names the field and the permitted range, because a clamped
    /// fixture would be measured as something other than what was asked for.
    /// </summary>
    public static class FixtureValidator
    {
        public static FixtureValidation Validate(FixtureDescriptor fixture, IFixtureRules rules)
        {
            var shape = FixtureShapeValidator.Validate(fixture);
            var problems = shape.Problems.ToList();
            if (fixture?.Character == null)
                return Result(problems);

            ValidateCharacter(problems, fixture.Character, rules);
            ValidateCompanions(
                problems, fixture.Companions, fixture.Character.Level, rules);
            if (fixture.Consumables != null
                && fixture.Consumables.All(value => !string.IsNullOrWhiteSpace(value)))
                ValidateConsumables(problems, fixture.Consumables, rules);

            return Result(problems);
        }

        private static void ValidateCharacter(
            List<FixtureProblem> problems, CharacterSpec character, IFixtureRules rules)
        {
            if (!string.IsNullOrWhiteSpace(character.Class)
                && !rules.ClassExists(character.Class))
                Add(problems, "character.class", $"'{character.Class}' is not a class the game defines.");

            // Whether a class accepts a race is checked when the character is created, because the
            // character creator is the only place that holds the pairing and it is gone by now.

            if (character.Level > rules.MaxLevel)
                Add(problems, "character.level",
                    $"{character.Level} is outside the reachable range 1 to {rules.MaxLevel}.");

            ValidateVeteranPoints(problems, character, rules);

            if (character.AllocatedAttributes != null
                && character.AllocatedAttributes.Values.All(value => value >= 0))
                ValidateAttributes(problems, character, rules);

            if (character.Skills != null
                && character.Skills.All(skill => skill != null
                    && !string.IsNullOrWhiteSpace(skill.Name)
                    && skill.Level >= 0))
                ValidateSkills(problems, character, rules);

            if (EquipmentHasValidShape(character.Equipment))
                ValidateEquipment(
                    problems,
                    "character.equipment",
                    character.Class,
                    character.Level,
                    character.Equipment,
                    rules);
        }

        private static void ValidateVeteranPoints(
            List<FixtureProblem> problems, CharacterSpec character, IFixtureRules rules)
        {
            if (character.VeteranPoints <= 0)
                return;

            if (character.Level < rules.MaxLevel)
                Add(problems, "character.veteranPoints",
                    $"Veteran points exist only at level {rules.MaxLevel}; this fixture is level "
                    + $"{character.Level}. Permitted here: 0.");
            else if (character.VeteranPoints > rules.MaxVeteranPoints)
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

            var normalSpend = 0;
            var veteranSpend = 0;

            foreach (var skill in character.Skills)
            {
                var field = $"character.skills.{skill.Name}";

                if (!rules.TryGetSkill(skill.Name, out var rule))
                {
                    Add(problems, field, "Not a skill the game defines.");
                    continue;
                }

                if (skill.Level > rule.MaxLevel)
                {
                    Add(problems, field,
                        $"Level {skill.Level} is outside the range 0 to {rule.MaxLevel}.");
                    continue;
                }

                if (rule.Classes.Count > 0 && !Includes(rule.Classes, character.Class))
                    Add(problems, field,
                        $"A {character.Class} cannot learn it. Classes: "
                        + $"{string.Join(", ", rule.Classes)}.");

                if (rule.IsVeteran && character.Level < rules.MaxLevel)
                    Add(problems, field,
                        $"A veteran skill needs level {rules.MaxLevel}; this fixture is level "
                        + $"{character.Level}.");

                if (skill.Level > 0 && !string.IsNullOrWhiteSpace(rule.PrerequisiteSkill))
                {
                    // Both sides resolve through the same lookup. A fixture may name a skill as
                    // the game displays it while a rule names it by identifier, and comparing the
                    // two strings directly reports a prerequisite the fixture actually declares.
                    var wanted = rules.TryGetSkill(rule.PrerequisiteSkill, out var prerequisiteRule)
                        ? prerequisiteRule.Name
                        : rule.PrerequisiteSkill;

                    var declared = character.Skills.FirstOrDefault(s =>
                        !string.IsNullOrWhiteSpace(s.Name)
                        && rules.TryGetSkill(s.Name, out var declaredRule)
                        && declaredRule.Name == wanted);

                    if (declared == null || declared.Level < rule.PrerequisiteLevel)
                        Add(problems, field,
                            $"Requires '{wanted}' at level {rule.PrerequisiteLevel} or above.");
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

        private static void ValidateCompanions(
            List<FixtureProblem> problems,
            IReadOnlyList<CompanionSpec> companions,
            int level,
            IFixtureRules rules)
        {
            if (companions == null)
                return;

            for (var i = 0; i < companions.Count; i++)
            {
                var companion = companions[i];
                if (companion == null
                    || string.IsNullOrWhiteSpace(companion.Archetype)
                    || !EquipmentHasValidShape(companion.Equipment))
                    continue;

                ValidateEquipment(
                    problems,
                    $"companions[{i}].equipment",
                    companion.Archetype,
                    level,
                    companion.Equipment,
                    rules);
            }
        }

        private static bool EquipmentHasValidShape(IReadOnlyList<EquipmentSpec> equipment)
            => equipment != null
               && equipment.All(entry => entry != null
                   && entry.Slot >= 0
                   && !string.IsNullOrWhiteSpace(entry.ItemId)
                   && entry.Durability > 0)
               && equipment.Select(entry => entry.Slot).Distinct().Count() == equipment.Count;

        private static void ValidateEquipment(
            List<FixtureProblem> problems,
            string field,
            string archetype,
            int level,
            IReadOnlyList<EquipmentSpec> equipment,
            IFixtureRules rules)
        {
            if (equipment.Count == 0)
                return;

            var slotCount = rules.EquipmentSlotCount(archetype);
            if (slotCount <= 0)
            {
                Add(problems, field,
                    $"The game publishes no slot table for '{archetype}', so the equipment "
                    + "cannot be checked.");
                return;
            }

            var occupied = new Dictionary<int, EquipmentSpec>();
            foreach (var entry in equipment)
            {
                var entryField = $"{field}[{entry.Slot}]";

                if (entry.Slot >= slotCount)
                {
                    Add(problems, entryField, $"Slot is outside the range 0 to {slotCount - 1}.");
                    continue;
                }

                occupied[entry.Slot] = entry;

                if (!rules.TryGetItem(entry.ItemId, out var rule))
                {
                    Add(problems, $"{entryField}.itemId",
                        $"'{entry.ItemId}' is not an item the game defines.");
                    continue;
                }

                var fits = rules.SlotsAccepting(archetype, rule.Category);
                if (!fits.Contains(entry.Slot))
                    Add(problems, entryField,
                        $"'{entry.ItemId}' does not fit slot {entry.Slot} of a {archetype}. "
                        + $"It fits: {(fits.Count == 0 ? "no slot" : string.Join(", ", fits))}.");

                if (rule.LevelRequired > level)
                    Add(problems, $"{entryField}.itemId",
                        $"Requires level {rule.LevelRequired}; this fixture is level {level}.");

                if (rule.Classes.Count > 0 && !Includes(rule.Classes, archetype))
                    Add(problems, $"{entryField}.itemId",
                        $"A {archetype} cannot equip it. Classes: "
                        + $"{string.Join(", ", rule.Classes)}.");

                if (!string.IsNullOrWhiteSpace(entry.AugmentId)
                    && !rules.AugmentExists(entry.AugmentId))
                    Add(problems, $"{entryField}.augmentId",
                        $"'{entry.AugmentId}' is not an augment the game defines.");
            }

            CheckTwoHandedOffhand(problems, field, occupied, rules);
        }

        /// <summary>
        /// Whether a class list names this class.
        /// </summary>
        /// <remarks>
        /// The game holds identifiers and a fixture is authored with the name a player reads, so
        /// both sides are reduced to the identifier before they are compared. Comparing the two
        /// forms directly made every Ranger fixture fail on an item only a Ranger can equip.
        /// </remarks>
        private static bool Includes(IReadOnlyCollection<string> classes, string className)
        {
            var wanted = GameIds.ClassId(className ?? "");
            foreach (var candidate in classes)
            {
                if (GameIds.ClassId(candidate ?? "") == wanted)
                    return true;
            }

            return false;
        }

        private static void CheckTwoHandedOffhand(
            List<FixtureProblem> problems,
            string field,
            Dictionary<int, EquipmentSpec> occupied,
            IFixtureRules rules)
        {
            var twoHanded = occupied.Values.FirstOrDefault(e =>
                !string.IsNullOrWhiteSpace(e.ItemId)
                && rules.TryGetItem(e.ItemId, out var rule) && rule.IsTwoHanded);

            if (twoHanded == null) return;
            if (!occupied.TryGetValue(rules.OffhandSlot, out var offhand)) return;
            if (ReferenceEquals(offhand, twoHanded)) return;

            Add(problems, $"{field}[{rules.OffhandSlot}]",
                $"'{twoHanded.ItemId}' is two-handed, so the offhand must be empty. It holds "
                + $"'{offhand.ItemId}'.");
        }

        private static void ValidateConsumables(
            List<FixtureProblem> problems, List<string> consumables, IFixtureRules rules)
        {
            if (consumables == null) return;

            foreach (var consumable in consumables)
            {
                if (!rules.ConsumableExists(consumable))
                    Add(problems, "consumables",
                        $"'{consumable}' is not a consumable the game defines.");
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

        private static void Add(List<FixtureProblem> problems, string field, string message)
            => problems.Add(new FixtureProblem { Field = field, Message = message });

        private static FixtureValidation Result(List<FixtureProblem> problems)
            => new FixtureValidation { Problems = problems };
    }
}
