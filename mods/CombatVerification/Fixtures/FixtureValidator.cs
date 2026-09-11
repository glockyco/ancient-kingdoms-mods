#nullable disable
using System.Collections.Generic;
using CombatVerification.Builds;
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
            if (fixture?.BuildData?.Player == null)
                return Result(problems);

            var buildData = fixture.BuildData;
            var character = buildData.Player;
            ValidateCharacter(problems, "buildData.player", character, rules);
            ValidateCompanions(
                problems, "buildData.companions", buildData.Companions, rules);
            if (buildData.Consumables != null
                && buildData.Consumables.All(value => value != null && !string.IsNullOrWhiteSpace(value.ItemId)))
                ValidateConsumables(problems, "buildData.consumables", buildData.Consumables, rules);

            if (buildData.LearnedBookIds != null)
                ValidateLearnedBooks(
                    problems, "buildData.learnedBookIds", buildData.LearnedBookIds, rules);

            return Result(problems);
        }

        private static void ValidateCharacter(
            List<FixtureProblem> problems,
            string field,
            PlayerBuild character,
            IFixtureRules rules)
        {
            if (!string.IsNullOrWhiteSpace(character.ClassId)
                && !rules.ClassExists(character.ClassId))
                Add(problems, $"{field}.classId", $"'{character.ClassId}' is not a class the game defines.");

            // Whether a class accepts a race is checked when the character is created, because the
            // character creator is the only place that holds the pairing and it is gone by now.

            if (character.Level > rules.MaxLevel)
                Add(problems, $"{field}.level",
                    $"{character.Level} is outside the reachable range 1 to {rules.MaxLevel}.");

            ValidateVeteranPoints(problems, field, character, rules);

            if (character.Attributes?.Allocated != null
                && AttributeValues(character.Attributes.Allocated).All(value => value >= 0))
                ValidateAttributes(problems, field, character, rules);

            if (character.Skills != null
                && character.Skills.All(skill => skill != null
                    && !string.IsNullOrWhiteSpace(skill.SkillId)
                    && skill.Level >= 0))
                ValidateSkills(problems, field, character, rules);

            if (EquipmentHasValidShape(character.Equipment))
                ValidateEquipment(
                    problems,
                    $"{field}.equipment",
                    character.ClassId,
                    character.Level,
                    character.Equipment,
                    rules);
        }

        private static void ValidateVeteranPoints(
            List<FixtureProblem> problems,
            string field,
            PlayerBuild character,
            IFixtureRules rules)
        {
            if (character.VeteranPoints <= 0)
                return;

            if (character.Level < rules.MaxLevel)
                Add(problems, $"{field}.veteranPoints",
                    $"Veteran points exist only at level {rules.MaxLevel}; this fixture is level "
                    + $"{character.Level}. Permitted here: 0.");
            else if (character.VeteranPoints > rules.MaxVeteranPoints)
                Add(problems, $"{field}.veteranPoints",
                    $"{character.VeteranPoints} is outside the obtainable range 0 to "
                    + $"{rules.MaxVeteranPoints}.");
        }

        private static void ValidateAttributes(
            List<FixtureProblem> problems,
            string field,
            PlayerBuild character,
            IFixtureRules rules)
        {
            var allocated = character.Attributes?.Allocated;
            if (allocated == null)
                return;

            var budget = rules.AllocatableAttributePoints(character.Level, character.VeteranPoints);
            var spent = AttributeValues(allocated).Where(value => value > 0).Sum();
            if (spent > budget)
                Add(problems, $"{field}.attributes.allocated",
                    $"Spends {spent} points against {budget} allocatable at level {character.Level} "
                    + $"with {character.VeteranPoints} veteran points. Shortfall: {spent - budget}.");
        }

        private static void ValidateSkills(
            List<FixtureProblem> problems,
            string field,
            PlayerBuild character,
            IFixtureRules rules)
        {
            if (character.Skills.Count == 0)
                return;

            var normalSpend = 0;
            var veteranSpend = 0;

            foreach (var skill in character.Skills)
            {
                var skillField = $"{field}.skills.{skill.SkillId}";

                if (!rules.TryGetSkill(skill.SkillId, out var rule))
                {
                    Add(problems, skillField, "Not a skill the game defines.");
                    continue;
                }

                var expectedPool = rule.IsVeteran ? "veteran" : "normal";
                if (skill.Pool != expectedPool)
                    Add(problems, $"{skillField}.pool",
                        $"Declares '{skill.Pool}', but the game defines this skill in the {expectedPool} pool.");

                if (skill.Level > rule.MaxLevel)
                {
                    Add(problems, skillField,
                        $"Level {skill.Level} is outside the range 0 to {rule.MaxLevel}.");
                    continue;
                }

                if (rule.Classes.Count > 0 && !Includes(rule.Classes, character.ClassId))
                    Add(problems, skillField,
                        $"A {character.ClassId} cannot learn it. Classes: "
                        + $"{string.Join(", ", rule.Classes)}.");

                if (rule.IsVeteran && character.Level < rules.MaxLevel)
                    Add(problems, skillField,
                        $"A veteran skill needs level {rules.MaxLevel}; this fixture is level "
                        + $"{character.Level}.");

                if (skill.Level > 0 && !string.IsNullOrWhiteSpace(rule.PrerequisiteSkill))
                {
                    var prerequisiteId = GameIds.Sanitize(rule.PrerequisiteSkill);
                    var declared = character.Skills.FirstOrDefault(s =>
                        s.SkillId == prerequisiteId);

                    if (declared == null || declared.Level < rule.PrerequisiteLevel)
                        Add(problems, skillField,
                            $"Requires '{prerequisiteId}' at level {rule.PrerequisiteLevel} or above.");
                }

                var cost = CostOf(rule, skill.Level);
                if (rule.IsVeteran) veteranSpend += cost; else normalSpend += cost;
            }

            CheckPool(problems, $"{field}.skills", "normal", normalSpend,
                rules.SkillPointsAtLevel(character.Level));
            CheckPool(problems, $"{field}.skills", "veteran", veteranSpend,
                character.Level < rules.MaxLevel ? 0 : character.VeteranPoints);

            CheckTierAndSpendGates(problems, field, character, rules);
        }

        private static void CheckTierAndSpendGates(
            List<FixtureProblem> problems,
            string field,
            PlayerBuild character,
            IFixtureRules rules)
        {
            foreach (var skill in character.Skills)
            {
                if (skill.Level <= 0 || string.IsNullOrWhiteSpace(skill.SkillId)) continue;
                if (!rules.TryGetSkill(skill.SkillId, out var rule)) continue;
                if (rule.RequiredSpentPoints <= 0) continue;

                // Points spent in the same pool on other skills unlock this one.
                var spentElsewhere = character.Skills
                    .Where(s => s.SkillId != skill.SkillId && s.Level > 0
                                && !string.IsNullOrWhiteSpace(s.SkillId))
                    .Select(s => rules.TryGetSkill(s.SkillId, out var other)
                        && other.IsVeteran == rule.IsVeteran
                        ? CostOf(other, s.Level) : 0)
                    .Sum();

                if (spentElsewhere < rule.RequiredSpentPoints)
                    Add(problems, $"{field}.skills.{skill.SkillId}",
                        $"Needs {rule.RequiredSpentPoints} points already spent in its pool; the "
                        + $"fixture spends {spentElsewhere} elsewhere.");
            }
        }

        private static void ValidateCompanions(
            List<FixtureProblem> problems,
            string field,
            IReadOnlyList<CompanionBuild> companions,
            IFixtureRules rules)
        {
            if (companions == null)
                return;

            for (var i = 0; i < companions.Count; i++)
            {
                var companion = companions[i];
                if (companion == null
                    || string.IsNullOrWhiteSpace(companion.ArchetypeId)
                    || !EquipmentHasValidShape(companion.Equipment))
                    continue;

                ValidateEquipment(
                    problems,
                    $"{field}[{i}].equipment",
                    companion.ArchetypeId,
                    companion.Level,
                    companion.Equipment,
                    rules);
            }
        }

        private static bool EquipmentHasValidShape(IReadOnlyList<EquippedItem> equipment)
            => equipment != null
               && equipment.All(entry => entry != null
                   && entry.Slot >= 0
                   && !string.IsNullOrWhiteSpace(entry.ItemId)
                   && entry.Durability > 0
                   && entry.Amount > 0)
               && equipment.Select(entry => entry.Slot).Distinct().Count() == equipment.Count;

        private static void ValidateEquipment(
            List<FixtureProblem> problems,
            string field,
            string archetype,
            int level,
            IReadOnlyList<EquippedItem> equipment,
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

            var occupied = new Dictionary<int, EquippedItem>();
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
        /// Catalog class restrictions can carry game display names. Normalize those names before
        /// comparing them with the fixture's stable class identifier.
        /// </remarks>
        private static bool Includes(IReadOnlyCollection<string> classes, string classId)
        {
            var wanted = GameIds.ClassId(classId ?? "");
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
            Dictionary<int, EquippedItem> occupied,
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
            List<FixtureProblem> problems,
            string field,
            IReadOnlyList<ItemQuantity> consumables,
            IFixtureRules rules)
        {
            if (consumables == null) return;

            foreach (var consumable in consumables)
            {
                if (!rules.ConsumableExists(consumable.ItemId))
                    Add(problems, $"{field}.{consumable.ItemId}",
                        $"'{consumable.ItemId}' is not a consumable the game defines.");
            }
        }

        private static void ValidateLearnedBooks(
            List<FixtureProblem> problems,
            string field,
            IReadOnlyList<string> learnedBookIds,
            IFixtureRules rules)
        {
            for (var i = 0; i < learnedBookIds.Count; i++)
            {
                var id = learnedBookIds[i];
                if (string.IsNullOrWhiteSpace(id))
                    continue;

                if (!rules.TryGetItem(id, out var item))
                    Add(problems, $"{field}[{i}]", $"'{id}' is not an item the game defines.");
                else if (!item.IsBook)
                    Add(problems, $"{field}[{i}]", $"'{id}' is not a permanent learned book.");
            }
        }

        private static IEnumerable<int> AttributeValues(AttributeValues values)
        {
            yield return values.Strength;
            yield return values.Constitution;
            yield return values.Dexterity;
            yield return values.Intelligence;
            yield return values.Wisdom;
            yield return values.Charisma;
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
