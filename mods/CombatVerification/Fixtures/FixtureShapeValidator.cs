#nullable disable
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Builds;

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
        public const int SupportedFixtureSchemaVersion = 3;

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
            foreach (var problem in LogicalBuildAdapter.Validate(buildData))
            {
                var separator = problem.IndexOf(' ');
                var field = separator < 0 ? "buildData" : problem.Substring(0, separator);
                var message = separator < 0 ? problem : problem.Substring(separator + 1);
                Add(problems, field, message);
            }
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
