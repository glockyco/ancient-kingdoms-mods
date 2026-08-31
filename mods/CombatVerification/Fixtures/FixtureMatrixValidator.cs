#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Dtos;

namespace CombatVerification.Fixtures
{
    public static class FixtureMatrixValidator
    {
        public const int SchemaVersion = 1;

        private static readonly string[] RequiredCoverage =
        {
            "A.class.Warrior",
            "A.class.Ranger",
            "A.class.Cleric",
            "A.class.Rogue",
            "A.class.Wizard",
            "A.class.Druid",
            "A.armorSet.threePieces",
            "A.armorSet.fivePieces",
            "A.haste.floor",
            "A.avoidance.floor",
            "A.augment",
            "A.consumables",
            "B.skill.targetDamage",
            "B.skill.frontalDamage",
            "B.skill.areaDamage",
            "B.skill.targetProjectile",
            "B.skill.frontalProjectiles",
            "B.special.ignoresDamageMultiplier",
            "B.special.ignoresCasterCombatStat",
            "C.weaponDelay.23",
            "C.weaponDelay.28",
            "C.weaponDelay.30",
            "C.haste.floor",
            "D.class.Warrior",
            "D.class.Ranger",
            "D.class.Cleric",
            "D.class.Rogue",
            "D.class.Wizard",
            "D.class.Druid",
            "A.lowerLevel.10",
            "B.lowerLevel.30",
            "D.companion.Ranger.bare",
            "D.companion.Ranger.equipped",
        };

        public static FixtureMatrixResult Validate(FixtureMatrix matrix, IFixtureRules rules)
        {
            List<FixtureProblemDto> matrixProblems = new List<FixtureProblemDto>();
            List<FixtureMatrixEntryResult> entries = new List<FixtureMatrixEntryResult>();
            if (matrix == null)
            {
                Add(matrixProblems, "matrix", "No fixture matrix was supplied.");
                return Result(matrixProblems, entries);
            }
            if (matrix.SchemaVersion != SchemaVersion)
                Add(matrixProblems, "schemaVersion", "Unsupported fixture matrix schema version " +
                    matrix.SchemaVersion + ".");
            if (matrix.Fixtures == null)
            {
                Add(matrixProblems, "fixtures", "A fixture matrix must contain a fixture list.");
                return Result(matrixProblems, entries);
            }

            HashSet<string> names = new HashSet<string>(StringComparer.Ordinal);
            HashSet<string> coverage = new HashSet<string>(StringComparer.Ordinal);
            string versionTuple = null;
            for (int index = 0; index < matrix.Fixtures.Count; index++)
            {
                FixtureMatrixEntry entry = matrix.Fixtures[index];
                List<FixtureProblemDto> problems = new List<FixtureProblemDto>();
                string prefix = "fixtures[" + index + "]";
                if (entry == null)
                {
                    Add(problems, prefix, "A matrix entry is required.");
                    entries.Add(EntryResult(null, null, problems));
                    continue;
                }
                if (string.IsNullOrWhiteSpace(entry.Coverage))
                    Add(problems, prefix + ".coverage", "Coverage is required.");
                else if (!coverage.Add(entry.Coverage))
                    Add(problems, prefix + ".coverage", "Coverage is named more than once.");
                if (entry.Tier != "A" && entry.Tier != "B" && entry.Tier != "C" && entry.Tier != "D")
                    Add(problems, prefix + ".tier", "Tier must be A, B, C, or D.");
                else if (!string.IsNullOrEmpty(entry.Coverage) &&
                         !entry.Coverage.StartsWith(entry.Tier + ".", StringComparison.Ordinal))
                    Add(problems, prefix + ".tier", "Tier does not match the coverage name.");
                if (entry.Repetitions < 1)
                    Add(problems, prefix + ".repetitions", "Repetitions must be at least 1.");
                ValidateDuration(entry, prefix, problems);
                if (entry.Fixture == null)
                {
                    Add(problems, prefix + ".fixture", "A fixture descriptor is required.");
                }
                else
                {
                    if (!names.Add(entry.Fixture.Name ?? string.Empty))
                        Add(problems, prefix + ".fixture.name", "Fixture identity is named more than once.");
                    FixtureValidation validation = rules == null
                        ? FixtureShapeValidator.Validate(entry.Fixture)
                        : FixtureValidator.Validate(entry.Fixture, rules);
                    foreach (FixtureProblem problem in validation.Problems)
                        Add(problems, prefix + ".fixture." + problem.Field, problem.Message);
                    ValidateEntryContract(entry, prefix, problems);
                    string tuple = BuildTuple(entry.Fixture.Build);
                    if (versionTuple == null) versionTuple = tuple;
                    else if (!string.Equals(versionTuple, tuple, StringComparison.Ordinal))
                        Add(problems, prefix + ".fixture.build", "All matrix fixtures must use one build tuple.");
                }
                entries.Add(EntryResult(entry.Coverage, entry.Fixture?.Name, problems));
            }

            foreach (string required in RequiredCoverage)
            {
                if (!coverage.Contains(required))
                    Add(matrixProblems, "fixtures", "Missing required coverage '" + required + "'.");
            }
            foreach (string extra in coverage.Where(value => !RequiredCoverage.Contains(value)))
                Add(matrixProblems, "fixtures", "Unknown coverage '" + extra + "'.");
            return Result(matrixProblems, entries);
        }

        private static void ValidateDuration(
            FixtureMatrixEntry entry, string prefix, ICollection<FixtureProblemDto> problems)
        {
            bool timed = entry.Tier == "C" || entry.Tier == "D";
            if (timed && (!(entry.DurationSeconds > 0) || entry.DurationSeconds > 300))
                Add(problems, prefix + ".durationSeconds", "Tier C and D windows must be above 0 and up to 300 seconds.");
            if (!timed && entry.DurationSeconds != null)
                Add(problems, prefix + ".durationSeconds", "Tier A and B fixtures do not use a timed window.");
        }

        private static void ValidateEntryContract(
            FixtureMatrixEntry entry, string prefix, ICollection<FixtureProblemDto> problems)
        {
            if (!string.Equals(entry.Fixture.Coverage, entry.Coverage, StringComparison.Ordinal))
                Add(problems, prefix + ".fixture.coverage", "Descriptor coverage does not match its matrix entry.");
            if (!string.Equals(entry.Fixture.Tier, entry.Tier, StringComparison.Ordinal))
                Add(problems, prefix + ".fixture.tier", "Descriptor tier does not match its matrix entry.");
            if (entry.Fixture.DurationSeconds != entry.DurationSeconds)
                Add(problems, prefix + ".fixture.durationSeconds", "Descriptor duration does not match its matrix entry.");
            if (entry.Fixture.Repetitions != entry.Repetitions)
                Add(problems, prefix + ".fixture.repetitions", "Descriptor repetitions do not match its matrix entry.");

            List<ActionSpec> actions = entry.Fixture.Actions;
            int actionCount = actions?.Count ?? 0;
            if (entry.Tier == "B" && actionCount != 1)
                Add(problems, prefix + ".fixture.actions", "A tier B fixture must declare exactly one action.");
            if ((entry.Tier == "C" || entry.Tier == "D") && actionCount == 0)
                Add(problems, prefix + ".fixture.actions", "A timed fixture must declare its action sequence.");

            const string classPrefix = ".class.";
            int classAt = entry.Coverage?.IndexOf(classPrefix, StringComparison.Ordinal) ?? -1;
            if (classAt >= 0)
            {
                string expected = entry.Coverage.Substring(classAt + classPrefix.Length);
                if (!string.Equals(entry.Fixture.Character?.Class, expected, StringComparison.Ordinal))
                    Add(problems, prefix + ".fixture.character.class",
                        "Class does not match the coverage branch '" + expected + "'.");
            }
            if (entry.Coverage == "D.companion.Ranger.bare" ||
                entry.Coverage == "D.companion.Ranger.equipped")
            {
                CompanionSpec companion = entry.Fixture.Companions != null &&
                    entry.Fixture.Companions.Count == 1
                    ? entry.Fixture.Companions[0]
                    : null;
                if (companion == null || companion.Archetype != "Ranger")
                    Add(problems, prefix + ".fixture.companions", "The companion branch needs one Ranger.");
                else
                {
                    bool equipped = companion.Equipment != null && companion.Equipment.Count > 0;
                    bool expected = entry.Coverage.EndsWith(".equipped", StringComparison.Ordinal);
                    if (equipped != expected)
                        Add(problems, prefix + ".fixture.companions[0].equipment",
                            expected ? "The equipped branch needs equipment." : "The bare branch must have no equipment.");
                }
            }
        }

        private static string BuildTuple(BuildEnvelope build)
        {
            if (build?.GameData == null) return string.Empty;
            return build.SerializedSchemaVersion + "|" + build.CaptureSchemaVersion + "|" +
                build.ModelVersion + "|" + build.GameData.GameVersion + "|" +
                build.GameData.SteamBuildId + "|" + build.GameData.AssemblySha256;
        }

        private static FixtureMatrixEntryResult EntryResult(
            string coverage, string fixture, List<FixtureProblemDto> problems)
        {
            return new FixtureMatrixEntryResult
            {
                Coverage = coverage,
                Fixture = fixture,
                Ok = problems.Count == 0,
                Problems = problems,
            };
        }

        private static FixtureMatrixResult Result(
            List<FixtureProblemDto> problems, List<FixtureMatrixEntryResult> entries)
        {
            return new FixtureMatrixResult
            {
                Ok = problems.Count == 0 && entries.All(entry => entry.Ok),
                MatrixProblems = problems,
                Fixtures = entries,
            };
        }

        private static void Add(ICollection<FixtureProblemDto> problems, string field, string message)
        {
            problems.Add(new FixtureProblemDto { Field = field, Message = message });
        }
    }
}
