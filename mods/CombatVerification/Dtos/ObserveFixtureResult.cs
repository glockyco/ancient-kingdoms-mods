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

    /// <summary>What the player stood beside when the window opened, read from the target itself.</summary>
    public sealed class TargetReadback
    {
        [JsonProperty("spawn")] public string Spawn { get; set; }
        [JsonProperty("level")] public int Level { get; set; }
        [JsonProperty("netId")] public uint NetId { get; set; }
        [JsonProperty("zone")] public int Zone { get; set; }
        [JsonProperty("healthMax")] public int HealthMax { get; set; }
        [JsonProperty("distance")] public float Distance { get; set; }
        [JsonProperty("requestedFacing")] public string RequestedFacing { get; set; }
        [JsonProperty("targetLookDirection")] public float[] TargetLookDirection { get; set; }
        [JsonProperty("playerLookDirection")] public float[] PlayerLookDirection { get; set; }
        [JsonProperty("stats")] public Dictionary<string, double> Stats { get; set; }
    }

    /// <summary>One blow the player took, read from its health falling between frames.</summary>
    public sealed class IncomingBlow
    {
        [JsonProperty("at")] public double At { get; set; }
        [JsonProperty("amount")] public int Amount { get; set; }
    }

    /// <summary>Everything one driven window observed.</summary>
    public sealed class WindowSample
    {
        [JsonProperty("openedAt")] public double OpenedAt { get; set; }
        [JsonProperty("closedAt")] public double ClosedAt { get; set; }
        [JsonProperty("hits")] public List<LandedHit> Hits { get; set; }
        [JsonProperty("completions")] public List<double> Completions { get; set; }
        [JsonProperty("intervals")] public List<double> Intervals { get; set; }
        [JsonProperty("resets")] public int Resets { get; set; }
        [JsonProperty("incoming")] public List<IncomingBlow> Incoming { get; set; }
        [JsonProperty("counts")] public ActionCounts Counts { get; set; }
        [JsonProperty("fidelity")] public string Fidelity { get; set; }
        [JsonProperty("fidelityLimit")] public string FidelityLimit { get; set; }
        /// <summary>
        /// Server seconds per frame across the window. Actions complete on frame boundaries, so a
        /// timing comparison allows this much slack.
        /// </summary>
        [JsonProperty("averageFrameSeconds")] public double AverageFrameSeconds { get; set; }
        /// <summary>Frames on which the target's health was refilled to keep it alive.</summary>
        [JsonProperty("targetHealthRefills")] public int TargetHealthRefills { get; set; }
        [JsonProperty("playerHealthRefills")] public int PlayerHealthRefills { get; set; }
    }

    /// <summary>The measurements a fixture's tier declares, taken from the running game.</summary>
    public sealed class ObserveFixtureResult
    {
        [JsonProperty("tier")] public string Tier { get; set; }
        [JsonProperty("seed")] public int Seed { get; set; }
        [JsonProperty("gameVersion")] public string GameVersion { get; set; }
        /// <summary>Attribution fidelity the measurement reached: state, perHit, or perHitAttributed.</summary>
        [JsonProperty("fidelity")] public string Fidelity { get; set; }
        /// <summary>Consumables used before the measurement, in the order the build declares them.</summary>
        [JsonProperty("consumablesUsed")] public List<string> ConsumablesUsed { get; set; }
        /// <summary>Effects on the player after consumables and before any window.</summary>
        [JsonProperty("activeEffects")] public List<ActiveEffect> ActiveEffects { get; set; }
        /// <summary>The target as read before the first window; null for a stat-sheet tier.</summary>
        [JsonProperty("target")] public TargetReadback Target { get; set; }
        [JsonProperty("measurements")] public List<Measurement> Measurements { get; set; }
    }
}
