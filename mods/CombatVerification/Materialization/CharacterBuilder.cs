#nullable disable
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Fixtures;

namespace CombatVerification.Materialization
{
    /// <summary>One build step and what it achieved.</summary>
    public sealed class BuildStep
    {
        public BuildStep(string name, bool ok, string detail)
        {
            Name = name;
            Ok = ok;
            Detail = detail;
        }

        public string Name { get; }
        public bool Ok { get; }
        public string Detail { get; }

        public override string ToString() => $"{Name}: {(Ok ? "ok" : "failed")} - {Detail}";
    }

    public sealed class BuildOutcome
    {
        public IReadOnlyList<BuildStep> Steps { get; set; }
        public bool Ok => Steps.All(step => step.Ok);

        /// <summary>The first step that failed, or null when every step succeeded.</summary>
        public BuildStep Failure => Steps.FirstOrDefault(step => !step.Ok);
    }

    /// <summary>
    /// Brings a character to the state a fixture declares, through the engine's own paths.
    /// </summary>
    /// <remarks>
    /// Every step verifies its own effect. The engine returns without an error when it refuses,
    /// so a step that trusted a returned call would leave a character that is quietly not the one
    /// requested, and every later measurement would describe the wrong build.
    /// <para>
    /// The order is fixed. Progression grants the points that allocation spends, so it runs first.
    /// </para>
    /// </remarks>
    public static class CharacterBuilder
    {
        /// <summary>
        /// A bound on award steps, so a step that stops advancing ends the run instead of
        /// spinning. One step yields one level or one veteran point.
        /// </summary>
        private const int StepSlack = 4;

        public static BuildOutcome Run(
            ICharacterUnderConstruction character, CharacterSpec spec)
        {
            var steps = new List<BuildStep>();

            if (!CheckUntouched(character, steps))
                return new BuildOutcome { Steps = steps };

            if (AdvanceLevel(character, spec, steps))
                if (AdvanceVeteran(character, spec, steps))
                    if (SpendAttributes(character, spec, steps))
                        if (SpendSkills(character, spec, steps))
                            EquipItems(character, spec, steps);

            return new BuildOutcome { Steps = steps };
        }

        /// <summary>
        /// Refuses a character that has already been built on.
        /// </summary>
        /// <remarks>
        /// A fixture declares the points it allocates, not the totals it ends with, so spending
        /// them twice produces a character that no fixture describes and no error reports. A
        /// newly created character is at level one with nothing granted, and points come only
        /// from levels, so nothing can have been bought yet either.
        /// </remarks>
        private static bool CheckUntouched(
            ICharacterUnderConstruction character, List<BuildStep> steps)
        {
            if (character.Level == 1
                && character.UnspentAttributePoints == 0
                && character.UnspentSkillPoints == 0
                && character.TotalVeteranPoints == 0)
                return true;

            return Fail(steps, "untouched",
                $"The character is already at level {character.Level} with "
                + $"{character.UnspentAttributePoints} attribute and "
                + $"{character.UnspentSkillPoints} skill points unspent. A build allocates what a "
                + "fixture declares, so it runs once on a newly created character.");
        }

        // --- progression ---

        private static bool AdvanceLevel(
            ICharacterUnderConstruction character, CharacterSpec spec, List<BuildStep> steps)
        {
            var target = spec.Level;
            if (character.Level > target)
                return Fail(steps, "level",
                    $"Already level {character.Level}, above the requested {target}. Experience "
                    + "cannot be taken back, so a fixture cannot lower a level.");

            var budget = (target - character.Level) + StepSlack;
            while (character.Level < target)
            {
                if (budget-- <= 0)
                    return Fail(steps, "level",
                        $"Stopped at level {character.Level} of {target} after the expected number "
                        + "of awards. Each award should raise the level by one.");

                var before = character.Level;
                character.AwardExperience(character.ExperienceForNextStep);

                if (character.Level == before)
                    return Fail(steps, "level",
                        $"An award of the required experience left the level at {before}. The "
                        + "engine did not accept it and reported nothing.");
            }

            return Pass(steps, "level", $"Level {character.Level}.");
        }

        private static bool AdvanceVeteran(
            ICharacterUnderConstruction character, CharacterSpec spec, List<BuildStep> steps)
        {
            var target = spec.VeteranPoints;
            if (target <= 0)
                return Pass(steps, "veteran", "None requested.");

            if (character.Level < character.MaxLevel)
                return Fail(steps, "veteran",
                    $"Veteran points are earned only at level {character.MaxLevel}. The character "
                    + $"is level {character.Level}.");

            if (character.TotalVeteranPoints > target)
                return Fail(steps, "veteran",
                    $"Already holds {character.TotalVeteranPoints} veteran points, above the "
                    + $"requested {target}.");

            var budget = (target - character.TotalVeteranPoints) + StepSlack;
            while (character.TotalVeteranPoints < target)
            {
                if (budget-- <= 0)
                    return Fail(steps, "veteran",
                        $"Stopped at {character.TotalVeteranPoints} of {target} veteran points "
                        + "after the expected number of awards.");

                var before = character.TotalVeteranPoints;
                character.AwardExperience(character.ExperienceForNextStep);

                if (character.TotalVeteranPoints == before)
                    return Fail(steps, "veteran",
                        $"An award of the required experience left the total at {before}. The cap "
                        + $"is {character.MaxVeteranPoints}.");
            }

            return Pass(steps, "veteran", $"{character.TotalVeteranPoints} veteran points.");
        }

        // --- attributes ---

        private static bool SpendAttributes(
            ICharacterUnderConstruction character, CharacterSpec spec, List<BuildStep> steps)
        {
            var requested = spec.AllocatedAttributes;
            if (requested == null || requested.Count == 0)
                return Pass(steps, "attributes", "None requested.");

            foreach (var pair in requested.Where(pair => pair.Value > 0))
            {
                for (var spent = 0; spent < pair.Value; spent++)
                {
                    if (character.UnspentAttributePoints <= 0)
                        return Fail(steps, "attributes",
                            $"No unspent point remained while raising {pair.Key}. Spent "
                            + $"{spent} of {pair.Value}.");

                    var before = character.AttributeValue(pair.Key);
                    character.SpendAttributePoint(pair.Key);

                    if (character.AttributeValue(pair.Key) == before)
                        return Fail(steps, "attributes",
                            $"Spending a point on {pair.Key} left it at {before}. The engine did "
                            + "not accept it and reported nothing.");
                }
            }

            var summary = string.Join(", ",
                requested.Where(pair => pair.Value > 0)
                    .Select(pair => $"{pair.Key} +{pair.Value}"));
            return Pass(steps, "attributes", summary);
        }

        // --- skills ---

        private static bool SpendSkills(
            ICharacterUnderConstruction character, CharacterSpec spec, List<BuildStep> steps)
        {
            var requested = (spec.Skills ?? new List<SkillSpec>())
                .Where(skill => skill.Level > 0 && !string.IsNullOrWhiteSpace(skill.Name))
                .ToList();
            if (requested.Count == 0)
                return Pass(steps, "skills", "None requested.");

            // A skill's own gate is the number of points already spent in its pool, so the order
            // a fixture lists is not a spending order. Each pass buys whatever is reachable now,
            // and a pass that buys nothing means the rest is unreachable.
            var bought = 0;
            while (true)
            {
                var boughtThisPass = 0;

                foreach (var wanted in requested)
                {
                    var state = Find(character, wanted.Name);
                    if (state == null)
                        continue;

                    while (state.Level < wanted.Level)
                    {
                        var pool = state.IsVeteran
                            ? character.UnspentVeteranPoints
                            : character.UnspentSkillPoints;
                        if (pool <= 0)
                            break;

                        var before = state.Level;
                        character.UpgradeSkill(state.Index, state.IsVeteran);

                        state = Find(character, wanted.Name);
                        if (state == null || state.Level == before)
                            break;

                        boughtThisPass++;
                        bought++;
                    }
                }

                if (boughtThisPass == 0)
                    break;
            }

            var unreached = new List<string>();
            foreach (var wanted in requested)
            {
                var state = Find(character, wanted.Name);
                if (state == null)
                    unreached.Add($"{wanted.Name} (the character does not hold it)");
                else if (state.Level < wanted.Level)
                    unreached.Add($"{wanted.Name} at {state.Level} of {wanted.Level}");
            }

            if (unreached.Count > 0)
                return Fail(steps, "skills",
                    $"Bought {bought} levels, then no further purchase was accepted. Short: "
                    + $"{string.Join(", ", unreached)}. A skill's gate is the points already spent "
                    + "in its pool, so an unreachable level means the fixture asks for a state its "
                    + "own gates forbid.");

            return Pass(steps, "skills",
                $"Bought {bought} levels across {requested.Count} skills.");
        }

        // --- equipment ---

        /// <summary>
        /// Grants each declared item and equips it, so the engine's own equipment callback applies
        /// the attribute bonuses and the armour set thresholds.
        /// </summary>
        /// <remarks>
        /// The declared order is followed but does not matter to the outcome. The engine recounts a
        /// set's matching pieces from every slot on each change, so a threshold is crossed by
        /// whichever piece happens to be third or fifth.
        /// </remarks>
        private static void EquipItems(
            ICharacterUnderConstruction character, CharacterSpec spec, List<BuildStep> steps)
        {
            if (spec.Equipment == null)
            {
                // An absent section was never read, so it states nothing about the slots. An empty
                // one states that nothing is worn, which is a different measurement.
                Pass(steps, "equipment", "Not stated, so the slots are left as they are.");
                return;
            }

            var requested = spec.Equipment
                .Where(entry => !string.IsNullOrWhiteSpace(entry.ItemId))
                .ToList();

            if (!character.ItemOperationsAllowed)
            {
                Fail(steps, "equipment",
                    $"The engine refuses an item operation while the character is "
                    + $"{character.ActivityState}.");
                return;
            }

            var slotCount = character.Equipment.Count;
            foreach (var entry in requested)
            {
                if (entry.Slot < 0 || entry.Slot >= slotCount)
                {
                    Fail(steps, "equipment",
                        $"Slot {entry.Slot} is outside the {slotCount} the game gives a character.");
                    return;
                }
            }

            // A character is created wearing starter equipment, so a slot the fixture does not
            // declare has to be emptied. Left alone it would contribute to every measurement while
            // no fixture mentioned it.
            var declared = new HashSet<int>(requested.Select(entry => entry.Slot));
            var cleared = 0;
            for (var slot = 0; slot < slotCount; slot++)
            {
                if (declared.Contains(slot) || character.Equipment[slot].ItemId == null)
                    continue;

                var before = character.Equipment[slot].ItemId;
                character.Unequip(slot);

                if (character.Equipment[slot].ItemId != null)
                {
                    Fail(steps, "equipment",
                        $"Slot {slot} still holds '{before}' after unequipping it. The engine "
                        + "refuses when the inventory has no room, and reports nothing.");
                    return;
                }

                cleared++;
            }

            foreach (var entry in requested)
            {
                if (!character.ItemExists(entry.ItemId))
                {
                    Fail(steps, "equipment", $"The game defines no item '{entry.ItemId}'.");
                    return;
                }

                var durability = entry.Durability ?? character.MaxDurability(entry.ItemId);
                if (durability <= 0)
                {
                    Fail(steps, "equipment",
                        $"'{entry.ItemId}' would be worn at durability {durability}, and the engine "
                        + "counts a slot's bonuses only above zero, so the piece could not "
                        + "contribute and no measurement would say so.");
                    return;
                }

                character.GrantItem(entry.ItemId, durability, entry.AugmentId);

                var inventoryIndex = character.FindInInventory(entry.ItemId, entry.AugmentId);
                if (inventoryIndex < 0)
                {
                    Fail(steps, "equipment",
                        $"'{entry.ItemId}' did not reach the inventory. The engine refuses a grant "
                        + "it has no room for and reports nothing.");
                    return;
                }

                if (!character.CanEquip(inventoryIndex, entry.Slot))
                {
                    Fail(steps, "equipment",
                        $"The game refuses '{entry.ItemId}' in slot {entry.Slot}.");
                    return;
                }

                character.Equip(inventoryIndex, entry.Slot);

                var after = character.Equipment[entry.Slot];
                if (after.ItemId != entry.ItemId)
                {
                    Fail(steps, "equipment",
                        $"Slot {entry.Slot} holds "
                        + $"{(after.ItemId == null ? "nothing" : $"'{after.ItemId}'")} after "
                        + $"equipping '{entry.ItemId}'. The engine did not accept it and reported "
                        + "nothing.");
                    return;
                }

                if (after.Durability != durability)
                {
                    Fail(steps, "equipment",
                        $"Slot {entry.Slot} holds '{entry.ItemId}' at durability "
                        + $"{after.Durability}, not the {durability} it was granted with.");
                    return;
                }

                // The augment rides in the slot, so equipping moves it with the item. Asserting it
                // here is what proves the augment needs no separate path.
                if (!string.Equals(after.AugmentId ?? "", entry.AugmentId ?? "",
                        System.StringComparison.OrdinalIgnoreCase))
                {
                    Fail(steps, "equipment",
                        $"Slot {entry.Slot} holds augment "
                        + $"{(after.AugmentId == null ? "none" : $"'{after.AugmentId}'")} rather "
                        + $"than {(entry.AugmentId == null ? "none" : $"'{entry.AugmentId}'")}.");
                    return;
                }

            }

            var augmented = requested.Count(entry => !string.IsNullOrWhiteSpace(entry.AugmentId));
            var detail = $"Equipped {requested.Count} items";
            if (augmented > 0)
                detail += $", {augmented} augmented";
            if (cleared > 0)
                detail += $", cleared {cleared} slots the fixture does not declare";

            Pass(steps, "equipment", detail + ".");
        }

        private static SkillState Find(ICharacterUnderConstruction character, string name)
            => character.Skills.FirstOrDefault(
                skill => string.Equals(skill.Name, name, System.StringComparison.OrdinalIgnoreCase));

        private static bool Pass(List<BuildStep> steps, string name, string detail)
        {
            steps.Add(new BuildStep(name, true, detail));
            return true;
        }

        private static bool Fail(List<BuildStep> steps, string name, string detail)
        {
            steps.Add(new BuildStep(name, false, detail));
            return false;
        }
    }
}
