#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Dtos
{
    /// <summary>
    /// One measured quantity. The unit, sampling unit, and window travel with the samples so the
    /// comparison never has to guess what a number denotes.
    /// </summary>
    public sealed class Measurement
    {
        [JsonProperty("quantity")] public string Quantity { get; set; }
        [JsonProperty("unit")] public string Unit { get; set; }
        [JsonProperty("samplingUnit")] public string SamplingUnit { get; set; }
        [JsonProperty("windowSeconds")] public double? WindowSeconds { get; set; }
        [JsonProperty("samples")] public List<object> Samples { get; set; }
        [JsonProperty("counts")] public ActionCounts Counts { get; set; }
    }

    /// <summary>Attempted, accepted, completed, and landed action counts for a window.</summary>
    public sealed class ActionCounts
    {
        [JsonProperty("attempted")] public int Attempted { get; set; }
        [JsonProperty("accepted")] public int Accepted { get; set; }
        [JsonProperty("completed")] public int Completed { get; set; }
        [JsonProperty("landed")] public int Landed { get; set; }
    }

    /// <summary>A stat-sheet reading with the effects that shaped it.</summary>
    public sealed class StatSheetSample
    {
        [JsonProperty("sheet")] public StatSheetResult Sheet { get; set; }
        /// <summary>
        /// Effects on the player at the reading. Out of combat the game refreshes a rest buff every
        /// frame, so a sheet read at rest differs from one read in combat.
        /// Source: server-scripts/Player.cs:2194-2197.
        /// </summary>
        [JsonProperty("activeEffects")] public List<ActiveEffect> ActiveEffects { get; set; }
    }

    /// <summary>The measurements a fixture's tier declares, taken from the running game.</summary>
    public sealed class ObserveFixtureResult
    {
        [JsonProperty("tier")] public string Tier { get; set; }
        [JsonProperty("seed")] public int Seed { get; set; }
        [JsonProperty("gameVersion")] public string GameVersion { get; set; }
        /// <summary>Attribution fidelity the measurement reached: state, perHit, or perHitAttributed.</summary>
        [JsonProperty("fidelity")] public string Fidelity { get; set; }
        [JsonProperty("measurements")] public List<Measurement> Measurements { get; set; }
    }
}
