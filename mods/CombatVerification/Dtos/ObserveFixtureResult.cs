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

    /// <summary>One skill use the driver issued, with the resources the caster held at that moment.</summary>
    public sealed class ActionAttempt
    {
        [JsonProperty("at")] public double At { get; set; }
        [JsonProperty("skill")] public string Skill { get; set; }
        [JsonProperty("mana")] public int Mana { get; set; }
        [JsonProperty("energy")] public int Energy { get; set; }
    }

    /// <summary>A player resource state retained only when mana or energy changes.</summary>
    public sealed class ResourceTransition
    {
        [JsonProperty("at")] public double At { get; set; }
        [JsonProperty("mana")] public int Mana { get; set; }
        [JsonProperty("energy")] public int Energy { get; set; }
    }

    /// <summary>The first and last time one active player effect was observed in a window.</summary>
    public sealed class EffectObservation
    {
        [JsonProperty("skillId")] public string SkillId { get; set; }
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("firstObservedAt")] public double FirstObservedAt { get; set; }
        [JsonProperty("lastObservedAt")] public double LastObservedAt { get; set; }
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
        /// <summary>Skill uses the driver issued; the follow-up loop's own attacks are not attempts.</summary>
        [JsonProperty("attempts")] public List<ActionAttempt> Attempts { get; set; }
        /// <summary>Resource states retained only at the window start and on a value change.</summary>
        [JsonProperty("resourceTransitions", NullValueHandling = NullValueHandling.Ignore)]
        public List<ResourceTransition> ResourceTransitions { get; set; }
        /// <summary>First and last sightings of each active player effect.</summary>
        [JsonProperty("observedEffects", NullValueHandling = NullValueHandling.Ignore)]
        public List<EffectObservation> ObservedEffects { get; set; }
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
        /// <summary>
        /// The target after a listed target effect lands. Null for windows that measure damage or
        /// cadence. The reading includes the active effect and the stats that the next hit meets.
        /// </summary>
        [JsonProperty("settledTarget")] public TargetStateResult SettledTarget { get; set; }
        /// <summary>
        /// Damage each hired companion dealt inside the window, read from its own damage meter in
        /// hire order, which is the order the fixture declares its companions.
        /// </summary>
        [JsonProperty("companionDamage")] public List<CompanionDamage> CompanionDamage { get; set; }
    }

    public sealed class CompanionDamage
    {
        [JsonProperty("entityId")] public string EntityId { get; set; }
        [JsonProperty("name")] public string Name { get; set; }
        [JsonProperty("archetype")] public string Archetype { get; set; }
        [JsonProperty("damage")] public long Damage { get; set; }
    }

    /// <summary>The measurements a fixture's tier declares, taken from the running game.</summary>
    public sealed class MeasuredCharacter
    {
        [JsonProperty("class")] public string Class { get; set; }
        [JsonProperty("level")] public int Level { get; set; }
    }

    public sealed class ObserveFixtureResult
    {
        [JsonProperty("tier")] public string Tier { get; set; }
        [JsonProperty("seed")] public int Seed { get; set; }
        /// <summary>The measured character as the game names it, so coverage credits what ran.</summary>
        [JsonProperty("character")] public MeasuredCharacter Character { get; set; }
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
