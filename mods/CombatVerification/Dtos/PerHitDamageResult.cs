#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Dtos
{
    /// <summary>One hit a caster dealt.</summary>
    public sealed class LandedHit
    {
        /// <summary>The entity the engine named as the subject of this hit.</summary>
        [JsonProperty("victim")]
        public string Victim { get; set; }

        /// <summary>That entity's network identity, which names it when two share a name.</summary>
        [JsonProperty("victimNetId")]
        public uint VictimNetId { get; set; }

        /// <summary>
        /// The health the victim lost. Zero means the hit reached the end of the pipeline and took
        /// nothing anyway, which a mana shield absorbing it produces.
        /// </summary>
        [JsonProperty("amount")]
        public int Amount { get; set; }

        /// <summary>The moment the hit was recorded, in the game's server time.</summary>
        [JsonProperty("at")]
        public double At { get; set; }
    }

    /// <summary>Arguments for a per-hit damage reading.</summary>
    public sealed class PerHitDamageArgs
    {
        /// <summary>
        /// Seconds to watch the caster for hits. The probe only listens, so something else has to
        /// drive the actions and a window with nothing acting in it reports no hit.
        /// </summary>
        [JsonProperty("windowSeconds", Required = Required.Always)]
        public double WindowSeconds { get; set; }

        /// <summary>
        /// The value to seed the engine's generator with. Absent takes one from the clock, which is
        /// still recorded, so every run states the seed it used whether or not one was asked for.
        /// </summary>
        [JsonProperty("seed", Required = Required.Default)]
        public int? Seed { get; set; }
    }

    /// <summary>Every hit one caster landed inside a window.</summary>
    /// <remarks>
    /// The hits are landings only. A missed or fully resisted action leaves the damage pipeline
    /// before the hit event is raised, so a miss is not among them.
    /// <para>
    /// The count of actions is therefore reported beside them, derived from the same window, and the
    /// difference is how often an action produced no landing. The interval probe cannot supply that
    /// count here, because it stills the attack loop and this measurement needs the loop running.
    /// </para>
    /// </remarks>
    public sealed class PerHitDamageResult
    {
        /// <summary>The caster that was listened to.</summary>
        [JsonProperty("caster")]
        public string Caster { get; set; }

        /// <summary>When the window opened, in the game's server time.</summary>
        [JsonProperty("openedAt")]
        public double OpenedAt { get; set; }

        /// <summary>When the window closed, in the game's server time.</summary>
        [JsonProperty("closedAt")]
        public double ClosedAt { get; set; }

        /// <summary>Hits recorded, in arrival order.</summary>
        [JsonProperty("hits")]
        public List<LandedHit> Hits { get; set; }

        /// <summary>Hits that took no health, which means something absorbed them.</summary>
        [JsonProperty("absorbed")]
        public int Absorbed { get; set; }

        /// <summary>
        /// Actions the caster completed inside the window, derived from the refractory period the
        /// engine writes at the end of each one. One action can raise several hits, so the
        /// difference from the hit count is a miss count only for a single-target action.
        /// </summary>
        [JsonProperty("actions")]
        public int Actions { get; set; }

        /// <summary>Gaps between consecutive completed actions, in seconds.</summary>
        [JsonProperty("actionIntervals")]
        public List<double> ActionIntervals { get; set; }

        /// <summary>
        /// Readings where the caster's running total moved backwards, so no hit could be derived.
        /// A reading here means the window spans a moment the engine cleared the total.
        /// </summary>
        [JsonProperty("resets")]
        public int Resets { get; set; }

        /// <summary>Health taken across every hit in the window.</summary>
        [JsonProperty("total")]
        public long Total { get; set; }

        /// <summary>
        /// The value the engine's generator was seeded with before the window opened.
        /// </summary>
        /// <remarks>
        /// Recording it does not make the run repeat. The engine draws from one generator for every
        /// system, so an identical seed reproduces an identical sequence only when the same consumers
        /// draw in the same order, which a live world does not promise. The seed is here so a run that
        /// does reproduce can be identified, and so a run that does not can be told apart from one
        /// that was never seeded.
        /// </remarks>
        [JsonProperty("seed")]
        public int Seed { get; set; }

        /// <summary>
        /// How directly the amounts were obtained: <c>aggregate</c>, <c>perHit</c>, or
        /// <c>perHitAttributed</c> when each hit also names the skill the engine chose.
        /// </summary>
        /// <remarks>
        /// This probe reaches <c>perHit</c>. The skill is not on the event it listens to, so
        /// attribution needs the patch on the damage entry point, and a rotation comparison needs
        /// that tier rather than this one.
        /// </remarks>
        [JsonProperty("tier")]
        public string Tier { get; set; }
    }
}
