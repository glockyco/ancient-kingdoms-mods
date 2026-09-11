#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Fixtures
{
    /// <summary>
    /// One fixture record. The logical build and the execution scenario are separate
    /// sections so they can be shared without making either section depend on the other.
    /// </summary>
    /// <remarks>
    /// An absent section and an empty section mean different things. A section the stat
    /// sheet depends on — allocated attributes, skills, equipment, consumables — must be
    /// present, and an empty list states that it holds nothing. Absent means it was never
    /// read, which no default may stand in for. Companions and actions may be absent,
    /// because a fixture that names neither measures the stat sheet on its own.
    /// </remarks>
    public sealed class FixtureDescriptor
    {
        /// <summary>Schema version for this fixture's outer record.</summary>
        [JsonProperty("schemaVersion", Required = Required.Default)]
        public int SchemaVersion { get; set; }

        /// <summary>Build identity and compatibility versions, independent from the fixture schema.</summary>
        [JsonProperty("build", Required = Required.Default)]
        public BuildEnvelope Build { get; set; }

        /// <summary>Identity of the fixture. The recorded baseline is keyed on it.</summary>
        [JsonProperty("name", Required = Required.Default)]
        public string Name { get; set; }

        [JsonProperty("tier", Required = Required.Default)]
        public string Tier { get; set; }

        [JsonProperty("coverage", Required = Required.Default)]
        public string Coverage { get; set; }

        [JsonProperty("buildData", Required = Required.Default)]
        public CombatVerification.Builds.LogicalBuildData BuildData { get; set; }

        [JsonProperty("execution", Required = Required.Default)]
        public FixtureExecution Execution { get; set; }
    }

    /// <summary>Target and measurement controls for a fixture run.</summary>
    public sealed class FixtureExecution
    {
        [JsonProperty("durationSeconds", Required = Required.Default)]
        public double? DurationSeconds { get; set; }

        [JsonProperty("repetitions", Required = Required.Default)]
        public int Repetitions { get; set; } = 1;

        /// <summary>Seed applied before measurement, recorded with the results.</summary>
        [JsonProperty("seed", Required = Required.Default)]
        public int? Seed { get; set; }

        [JsonProperty("target", Required = Required.Default)]
        public TargetSpec Target { get; set; }

        /// <summary>Actions to drive. Empty for a fixture that measures the stat sheet only.</summary>
        [JsonProperty("actions", Required = Required.Default)]
        public List<ActionSpec> Actions { get; set; }
    }

    public sealed class TargetSpec
    {
        /// <summary>Spawn to measure against, named as the game names it.</summary>
        [JsonProperty("spawn", Required = Required.Default)] public string Spawn { get; set; }

        [JsonProperty("level", Required = Required.Default)] public int? Level { get; set; }
    }

    public sealed class ActionSpec
    {
        [JsonProperty("skill", Required = Required.Default)] public string Skill { get; set; }

        /// <summary>
        /// Facing used for this action. Facing changes both avoidance and damage, so a
        /// fixture states it rather than letting materialization choose.
        /// </summary>
        [JsonProperty("facing", Required = Required.Default)] public string Facing { get; set; }
    }
}
