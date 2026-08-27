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
            ICharacterUnderConstruction character,
            CharacterSpec spec,
            IReadOnlyList<CompanionSpec> companions = null)
        {
            var steps = new List<BuildStep>();

            if (!CheckUntouched(character, steps))
                return new BuildOutcome { Steps = steps };

            if (AdvanceLevel(character, spec, steps))
                if (AdvanceVeteran(character, spec, steps))
                    if (SpendAttributes(character, spec, steps))
                        if (SpendSkills(character, spec, steps))
                            if (EquipItems(character, spec, steps))
                                HireCompanions(character, companions, steps);

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
        private static bool EquipItems(
            ICharacterUnderConstruction character, CharacterSpec spec, List<BuildStep> steps)
        {
            if (spec.Equipment == null)
                // An absent section was never read, so it states nothing about the slots. An empty
                // one states that nothing is worn, which is a different measurement.
                return Pass(steps, "equipment", "Not stated, so the slots are left as they are.");

            var requested = spec.Equipment
                .Where(entry => !string.IsNullOrWhiteSpace(entry.ItemId))
                .ToList();

            if (!character.ItemOperationsAllowed)
                return Fail(steps, "equipment",
                    "The engine refuses an item operation while the character is "
                    + $"{character.ActivityState}.");

            var slotCount = character.Equipment.Count;
            foreach (var entry in requested)
            {
                if (entry.Slot < 0 || entry.Slot >= slotCount)
                    return Fail(steps, "equipment",
                        $"Slot {entry.Slot} is outside the {slotCount} the game gives a character.");
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
                    return Fail(steps, "equipment",
                        $"Slot {slot} still holds '{before}' after unequipping it. The engine "
                        + "refuses when the inventory has no room, and reports nothing.");

                cleared++;
            }

            foreach (var entry in requested)
            {
                if (!character.ItemExists(entry.ItemId))
                    return Fail(steps, "equipment", $"The game defines no item '{entry.ItemId}'.");

                var durability = entry.Durability ?? character.MaxDurability(entry.ItemId);
                if (durability <= 0)
                    return Fail(steps, "equipment",
                        $"'{entry.ItemId}' would be worn at durability {durability}, and the engine "
                        + "counts a slot's bonuses only above zero, so the piece could not "
                        + "contribute and no measurement would say so.");

                character.GrantItem(entry.ItemId, durability, entry.AugmentId);

                var inventoryIndex = character.FindInInventory(entry.ItemId, entry.AugmentId);
                if (inventoryIndex < 0)
                    return Fail(steps, "equipment",
                        $"'{entry.ItemId}' did not reach the inventory. The engine refuses a grant "
                        + "it has no room for and reports nothing.");

                if (!character.CanEquip(inventoryIndex, entry.Slot))
                    return Fail(steps, "equipment",
                        $"The game refuses '{entry.ItemId}' in slot {entry.Slot}.");

                character.Equip(inventoryIndex, entry.Slot);

                var after = character.Equipment[entry.Slot];
                if (after.ItemId != entry.ItemId)
                    return Fail(steps, "equipment",
                        $"Slot {entry.Slot} holds "
                        + $"{(after.ItemId == null ? "nothing" : $"'{after.ItemId}'")} after "
                        + $"equipping '{entry.ItemId}'. The engine did not accept it and reported "
                        + "nothing.");

                if (after.Durability != durability)
                    return Fail(steps, "equipment",
                        $"Slot {entry.Slot} holds '{entry.ItemId}' at durability "
                        + $"{after.Durability}, not the {durability} it was granted with.");

                // The augment rides in the slot, so equipping moves it with the item. Asserting it
                // here is what proves the augment needs no separate path.
                if (!string.Equals(after.AugmentId ?? "", entry.AugmentId ?? "",
                        System.StringComparison.OrdinalIgnoreCase))
                    return Fail(steps, "equipment",
                        $"Slot {entry.Slot} holds augment "
                        + $"{(after.AugmentId == null ? "none" : $"'{after.AugmentId}'")} rather "
                        + $"than {(entry.AugmentId == null ? "none" : $"'{entry.AugmentId}'")}.");

            }

            var augmented = requested.Count(entry => !string.IsNullOrWhiteSpace(entry.AugmentId));
            var detail = $"Equipped {requested.Count} items";
            if (augmented > 0)
                detail += $", {augmented} augmented";
            if (cleared > 0)
                detail += $", cleared {cleared} slots the fixture does not declare";

            return Pass(steps, "equipment", detail + ".");
        }

        // --- companions ---

        /// <summary>
        /// Hires each declared companion, sets the three values a hire rolls, and equips it.
        /// </summary>
        /// <remarks>
        /// This runs last because a companion gains a point of base damage and base magic damage
        /// for every level its owner gains while it is present. Hiring after the owner's
        /// progression is complete is therefore the only way to get the value a newly hired
        /// companion carries, which is also the only value that survives a reload.
        /// </remarks>
        private static void HireCompanions(
            ICharacterUnderConstruction character,
            IReadOnlyList<CompanionSpec> companions,
            List<BuildStep> steps)
        {
            if (companions == null)
            {
                Pass(steps, "companions", "Not stated.");
                return;
            }

            var requested = companions
                .Where(companion => !string.IsNullOrWhiteSpace(companion.Archetype))
                .ToList();
            if (requested.Count == 0)
            {
                Pass(steps, "companions", "None declared.");
                return;
            }

            foreach (var wanted in requested)
            {
                if (!character.ArchetypeExists(wanted.Archetype))
                {
                    Fail(steps, "companions",
                        $"The game offers no companion archetype '{wanted.Archetype}'.");
                    return;
                }

                var price = character.HirePrice(wanted.Archetype);

                var companion = HireOne(character, wanted, price, steps);
                if (companion == null)
                    return;

                if (!AssignCompanionValues(companion, wanted, steps))
                    return;

                if (!EquipCompanion(character, companion, wanted, steps))
                    return;
            }

            var equipped = requested.Count(
                companion => companion.Equipment != null && companion.Equipment.Count > 0);
            var detail = $"Hired {requested.Count}";
            if (equipped > 0)
                detail += $", {equipped} equipped";

            Pass(steps, "companions", detail + ".");
        }

        /// <summary>
        /// Hires one companion and checks the race the engine rolled against the fixture.
        /// </summary>
        /// <remarks>
        /// The race is drawn from a list the archetype allows, so it can be neither requested nor
        /// resampled. Resampling would mean dismissing the misses, and the engine defers a
        /// destruction to the end of the frame while leaving the owner's slot pointing at the
        /// destroyed companion, so a hire issued in the same frame spawns a companion that occupies
        /// no slot at all. A fixture that names a race is therefore reproducible through the seed
        /// that governs the draw, not through repetition.
        /// </remarks>
        private static ICompanionUnderConstruction HireOne(
            ICharacterUnderConstruction character,
            CompanionSpec wanted,
            long price,
            List<BuildStep> steps)
        {
            if (character.Gold < price)
                character.AddGold(price - character.Gold);

            var before = character.Companions.Count;
            character.Hire(wanted.Archetype, price);

            if (character.Companions.Count == before)
            {
                Fail(steps, "companions",
                    $"Hiring a {wanted.Archetype} left {before} companions. The engine caps how many "
                    + "an owner may hold, and it charges the price and records the hire without "
                    + "producing one.");
                return null;
            }

            var companion = character.Companions[character.Companions.Count - 1];

            if (!string.Equals(companion.Archetype, wanted.Archetype,
                    System.StringComparison.OrdinalIgnoreCase))
            {
                Fail(steps, "companions",
                    $"Hiring a {wanted.Archetype} produced a {companion.Archetype}.");
                return null;
            }

            if (!string.IsNullOrWhiteSpace(wanted.Race)
                && !string.Equals(companion.Race, wanted.Race,
                    System.StringComparison.OrdinalIgnoreCase))
            {
                Fail(steps, "companions",
                    $"The fixture states a {wanted.Race} {wanted.Archetype} and the engine rolled a "
                    + $"{companion.Race} one. A companion's race is drawn from a list its archetype "
                    + "allows, so a fixture that names one depends on the seed that governs the "
                    + "draw.");
                return null;
            }

            return companion;
        }

        /// <summary>
        /// Sets the values a hire rolls, each one read back. The engine holds the range these come
        /// from as literals inside the hire, so nothing can be asked whether a value is reachable.
        /// </summary>
        private static bool AssignCompanionValues(
            ICompanionUnderConstruction companion, CompanionSpec wanted, List<BuildStep> steps)
        {
            if (wanted.HealthMultiplier.HasValue)
            {
                companion.SetHealthMultiplier(wanted.HealthMultiplier.Value);
                if (companion.HealthMultiplier != wanted.HealthMultiplier.Value)
                    return Fail(steps, "companions",
                        $"The health multiplier is {companion.HealthMultiplier} after setting it to "
                        + $"{wanted.HealthMultiplier.Value}.");
            }

            if (wanted.ResourceMultiplier.HasValue)
            {
                companion.SetResourceMultiplier(wanted.ResourceMultiplier.Value);
                if (companion.ResourceMultiplier != wanted.ResourceMultiplier.Value)
                    return Fail(steps, "companions",
                        $"The resource multiplier is {companion.ResourceMultiplier} after setting it "
                        + $"to {wanted.ResourceMultiplier.Value}. A Warrior and a Rogue use energy, "
                        + "and every other archetype uses mana.");
            }

            if (wanted.BaseCombat.HasValue)
            {
                companion.SetBaseCombat(wanted.BaseCombat.Value);
                if (companion.BaseCombat != wanted.BaseCombat.Value)
                    return Fail(steps, "companions",
                        $"The base combat value is {companion.BaseCombat} after setting it to "
                        + $"{wanted.BaseCombat.Value}.");
            }

            return true;
        }

        /// <summary>
        /// Equips a companion from the owner's inventory, which is where its own command reads.
        /// </summary>
        private static bool EquipCompanion(
            ICharacterUnderConstruction character,
            ICompanionUnderConstruction companion,
            CompanionSpec wanted,
            List<BuildStep> steps)
        {
            if (wanted.Equipment == null || wanted.Equipment.Count == 0)
                return true;

            var slotCount = companion.Equipment.Count;
            foreach (var entry in wanted.Equipment)
            {
                if (string.IsNullOrWhiteSpace(entry.ItemId))
                    continue;

                if (entry.Slot < 0 || entry.Slot >= slotCount)
                    return Fail(steps, "companions",
                        $"Slot {entry.Slot} is outside the {slotCount} a companion has.");

                if (!character.ItemExists(entry.ItemId))
                    return Fail(steps, "companions", $"The game defines no item '{entry.ItemId}'.");

                var durability = entry.Durability ?? character.MaxDurability(entry.ItemId);
                if (durability <= 0)
                    return Fail(steps, "companions",
                        $"'{entry.ItemId}' would be worn at durability {durability}, which the "
                        + "engine counts as contributing nothing.");

                character.GrantItem(entry.ItemId, durability, entry.AugmentId);

                var inventoryIndex = character.FindInInventory(entry.ItemId, entry.AugmentId);
                if (inventoryIndex < 0)
                    return Fail(steps, "companions",
                        $"'{entry.ItemId}' did not reach the owner's inventory, which is where a "
                        + "companion's own command reads from.");

                if (!companion.CanEquip(inventoryIndex, entry.Slot))
                    return Fail(steps, "companions",
                        $"The game refuses '{entry.ItemId}' in a companion's slot {entry.Slot}.");

                companion.Equip(inventoryIndex, entry.Slot);

                var after = companion.Equipment[entry.Slot];
                if (after.ItemId != entry.ItemId)
                    return Fail(steps, "companions",
                        $"A companion's slot {entry.Slot} holds "
                        + $"{(after.ItemId == null ? "nothing" : $"'{after.ItemId}'")} after "
                        + $"equipping '{entry.ItemId}'.");
            }

            return true;
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
