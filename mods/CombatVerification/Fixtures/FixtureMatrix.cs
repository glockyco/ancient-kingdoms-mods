#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Fixtures
{
    public sealed class FixtureMatrix
    {
        [JsonProperty("schemaVersion")] public int SchemaVersion { get; set; }
        [JsonProperty("fixtures")] public List<FixtureMatrixEntry> Fixtures { get; set; }
    }

    public sealed class FixtureMatrixEntry
    {
        [JsonProperty("tier")] public string Tier { get; set; }

        /// <summary>The matrix branch this fixture proves.</summary>
        [JsonProperty("coverage")] public string Coverage { get; set; }

        /// <summary>Measurement window. Null means that the fixture reads state without a timed window.</summary>
        [JsonProperty("durationSeconds")] public double? DurationSeconds { get; set; }

        /// <summary>Independent windows required for a stochastic quantity.</summary>
        [JsonProperty("repetitions")] public int Repetitions { get; set; } = 1;

        [JsonProperty("fixture")] public FixtureDescriptor Fixture { get; set; }
    }

    public sealed class FixtureMatrixEntryResult
    {
        [JsonProperty("coverage")] public string Coverage { get; set; }
        [JsonProperty("fixture")] public string Fixture { get; set; }
        [JsonProperty("ok")] public bool Ok { get; set; }
        [JsonProperty("problems")]
        public List<CombatVerification.Dtos.FixtureProblemDto> Problems { get; set; }
    }

    public sealed class FixtureMatrixResult
    {
        [JsonProperty("ok")] public bool Ok { get; set; }
        [JsonProperty("matrixProblems")]
        public List<CombatVerification.Dtos.FixtureProblemDto> MatrixProblems { get; set; }
        [JsonProperty("fixtures")] public List<FixtureMatrixEntryResult> Fixtures { get; set; }
    }
}
