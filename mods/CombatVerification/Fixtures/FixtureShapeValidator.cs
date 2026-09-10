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
        public const int SupportedFixtureSchemaVersion = 2;

        public static FixtureValidation Validate(FixtureDescriptor fixture)
        {
            var problems = new List<FixtureProblem>();

            if (fixture == null)
            {
                Add(problems, "fixture", "No descriptor was supplied.");
                return Result(problems);
            }

            if (fixture.SchemaVersion != SupportedFixtureSchemaVersion)
                Add(problems, "schemaVersion",
                    $"Unsupported fixture schema version {fixture.SchemaVersion}. Supported: "
                    + $"{SupportedFixtureSchemaVersion}.");

            ValidateBuild(problems, fixture.Build);
            Require(problems, "name", fixture.Name);

            if (fixture.BuildData == null)
                Add(problems, "buildData", "A logical build-data section is required.");
            else
                ValidateBuildData(problems, fixture.BuildData);

            if (fixture.Execution == null)
                Add(problems, "execution", "An execution section is required.");
            else
            {
                if (fixture.Execution.Seed == null)
                    Add(problems, "execution.seed",
                        "A seed is required as measurement context. It does not guarantee the random sequence.");

                if (fixture.Execution.Target != null)
                {
                    Require(problems, "execution.target.spawn", fixture.Execution.Target.Spawn);
                    if (fixture.Execution.Target.Level is < 1)
                        Add(problems, "execution.target.level", "Must be at least 1 when stated.");
                }

                ValidateActions(problems, "execution.actions", fixture.Execution.Actions);
            }

            return Result(problems);
        }

        private static void ValidateBuildData(
            List<FixtureProblem> problems, LogicalBuildData buildData)
        {
            if (buildData.Character == null)
                Add(problems, "buildData.character", "A descriptor must state its character.");
            else
                ValidateCharacter(problems, "buildData.character", buildData.Character);

            if (buildData.Companions != null)
                ValidateCompanions(problems, "buildData.companions", buildData.Companions);

            if (buildData.Consumables == null)
                Add(problems, "buildData.consumables",
                    "Required. State an empty list to declare that none are used.");
            else
            {
                foreach (var consumable in buildData.Consumables)
                    Require(problems, "buildData.consumables", consumable);
            }

            if (buildData.LearnedBookIds == null)
                Add(problems, "buildData.learnedBookIds",
                    "Required. State an empty list to declare that no books are learned.");
            else
            {
                var duplicates = buildData.LearnedBookIds
                    .Where(id => !string.IsNullOrWhiteSpace(id))
                    .GroupBy(id => id)
                    .Where(group => group.Count() > 1);
                foreach (var duplicate in duplicates)
                    Add(problems, $"buildData.learnedBookIds.{duplicate.Key}",
                        "Named more than once; a permanent book is learned once.");

                for (var i = 0; i < buildData.LearnedBookIds.Count; i++)
                    Require(problems, $"buildData.learnedBookIds[{i}]", buildData.LearnedBookIds[i]);
            }

            if (buildData.Provenance == null)
            {
                Add(problems, "buildData.provenance", "Build provenance is required.");
                return;
            }

            if (Require(problems, "buildData.provenance.kind", buildData.Provenance.Kind)
                && buildData.Provenance.Kind != "authored"
                && buildData.Provenance.Kind != "capture")
            {
                Add(problems, "buildData.provenance.kind",
                    "Must be authored or capture.");
            }

            Require(problems, "buildData.provenance.source", buildData.Provenance.Source);
        }

        private static void ValidateBuild(
            List<FixtureProblem> problems, BuildEnvelope build)
        {
            if (build == null)
            {
                Add(problems, "build", "A build envelope is required.");
                return;
            }

            if (!BuildContract.SupportedSerializedSchemas.Contains(build.SerializedSchemaVersion))
                Add(problems, "build.serializedSchemaVersion",
                    $"Version {build.SerializedSchemaVersion} is not supported. Supported: "
                    + $"{string.Join(", ", BuildContract.SupportedSerializedSchemas.OrderBy(v => v))}.");

            if (!BuildContract.SupportedCaptureSchemas.Contains(build.CaptureSchemaVersion))
                Add(problems, "build.captureSchemaVersion",
                    $"Version {build.CaptureSchemaVersion} is not supported. Supported: "
                    + $"{string.Join(", ", BuildContract.SupportedCaptureSchemas.OrderBy(v => v))}.");

            Require(problems, "build.modelVersion", build.ModelVersion);
            if (build.GameData == null)
            {
                Add(problems, "build.gameData", "Game-data identity is required.");
                return;
            }

            Require(problems, "build.gameData.gameVersion", build.GameData.GameVersion);
            Require(problems, "build.gameData.steamBuildId", build.GameData.SteamBuildId);
            Require(problems, "build.gameData.assemblySha256", build.GameData.AssemblySha256);
        }

        private static void ValidateCharacter(
            List<FixtureProblem> problems, string field, CharacterSpec character)
        {
            Require(problems, $"{field}.class", character.Class);
            Require(problems, $"{field}.race", character.Race);

            if (character.Level < 1)
                Add(problems, $"{field}.level", "Must be at least 1.");

            if (character.VeteranPoints < 0)
                Add(problems, $"{field}.veteranPoints", "Must be zero or greater.");

            if (character.AllocatedAttributes == null)
                Add(problems, $"{field}.allocatedAttributes",
                    "Required. State an empty object to allocate nothing.");
            else
            {
                foreach (var pair in character.AllocatedAttributes)
                {
                    if (pair.Value < 0)
                        Add(problems, $"{field}.allocatedAttributes.{pair.Key}",
                            $"{pair.Value} is negative; a fixture spends points, it does not remove them.");
                }
            }

            if (character.Skills == null)
                Add(problems, $"{field}.skills",
                    "Required. State an empty list to learn nothing.");
            else
                ValidateSkills(problems, field, character.Skills);

            if (character.Equipment == null)
                Add(problems, $"{field}.equipment",
                    "Required. State an empty list to equip nothing.");
            else
                ValidateEquipment(problems, $"{field}.equipment", character.Equipment);
        }

        private static void ValidateSkills(
            List<FixtureProblem> problems, string field, IReadOnlyList<SkillSpec> skills)
        {
            var duplicates = skills
                .Where(skill => skill != null && !string.IsNullOrWhiteSpace(skill.Name))
                .GroupBy(skill => skill.Name)
                .Where(group => group.Count() > 1);
            foreach (var duplicate in duplicates)
                Add(problems, $"{field}.skills.{duplicate.Key}",
                    "Named more than once; a skill has one level.");

            for (var i = 0; i < skills.Count; i++)
            {
                var skill = skills[i];
                if (skill == null)
                {
                    Add(problems, $"{field}.skills[{i}]", "An entry is required.");
                    continue;
                }

                var skillField = $"{field}.skills.{skill.Name ?? "<unnamed>"}";
                Require(problems, skillField, skill.Name);
                if (skill.Level < 0)
                    Add(problems, skillField, "Level must be zero or greater.");
            }
        }

        private static void ValidateCompanions(
            List<FixtureProblem> problems,
            string field,
            IReadOnlyList<CompanionSpec> companions)
        {
            for (var i = 0; i < companions.Count; i++)
            {
                var companion = companions[i];
                var companionField = $"{field}[{i}]";
                if (companion == null)
                {
                    Add(problems, companionField, "An entry is required.");
                    continue;
                }

                Require(problems, $"{companionField}.archetype", companion.Archetype);
                if (companion.Equipment == null)
                    Add(problems, $"{companionField}.equipment",
                        "Required. State an empty list to equip nothing.");
                else
                    ValidateEquipment(problems, $"{companionField}.equipment", companion.Equipment);
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
            List<FixtureProblem> problems,
            string field,
            IReadOnlyList<ActionSpec> actions)
        {
            if (actions == null)
                return;

            for (var i = 0; i < actions.Count; i++)
            {
                var action = actions[i];
                var actionField = $"{field}[{i}]";
                if (action == null)
                {
                    Add(problems, actionField, "An entry is required.");
                    continue;
                }

                Require(problems, $"{actionField}.skill", action.Skill);
                Require(problems, $"{actionField}.facing", action.Facing);
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
