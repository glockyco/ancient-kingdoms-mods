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
                        SpendSkills(character, spec, steps);

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

        private static void SpendSkills(
            ICharacterUnderConstruction character, CharacterSpec spec, List<BuildStep> steps)
        {
            var requested = (spec.Skills ?? new List<SkillSpec>())
                .Where(skill => skill.Level > 0 && !string.IsNullOrWhiteSpace(skill.Name))
                .ToList();
            if (requested.Count == 0)
            {
                Pass(steps, "skills", "None requested.");
                return;
            }

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
            {
                Fail(steps, "skills",
                    $"Bought {bought} levels, then no further purchase was accepted. Short: "
                    + $"{string.Join(", ", unreached)}. A skill's gate is the points already spent "
                    + "in its pool, so an unreachable level means the fixture asks for a state its "
                    + "own gates forbid.");
                return;
            }

            Pass(steps, "skills", $"Bought {bought} levels across {requested.Count} skills.");
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
