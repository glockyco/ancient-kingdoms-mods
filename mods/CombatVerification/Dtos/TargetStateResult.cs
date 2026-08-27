#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Dtos
{
    /// <summary>One timed effect the target carries.</summary>
    public sealed class ActiveEffect
    {
        /// <summary>The name the effect's skill declares.</summary>
        [JsonProperty("name")]
        public string Name { get; set; }

        /// <summary>
        /// The category the effect belongs to, or empty when it declares none. A category admits one
        /// member at a time, so a second effect of the same category replaces the first.
        /// </summary>
        [JsonProperty("category")]
        public string Category { get; set; }

        /// <summary>The level the effect was applied at, which scales what it contributes.</summary>
        [JsonProperty("level")]
        public int Level { get; set; }

        /// <summary>Seconds the effect has left.</summary>
        [JsonProperty("remaining")]
        public float Remaining { get; set; }

        /// <summary>
        /// Whether the effect has run out and is still in the list, in which case it still
        /// contributes to every stat above.
        /// </summary>
        [JsonProperty("expired")]
        public bool Expired { get; set; }
    }

    /// <summary>Arguments for a target-state reading. It takes none.</summary>
    public sealed class TargetStateArgs
    {
    }

    /// <summary>
    /// What the local player's target is, as the next hit against it will meet it.
    /// </summary>
    /// <remarks>
    /// The reading is taken after the engine's own cleanup pass. An effect whose time has run out
    /// stays in the list until that pass removes it, and every stat aggregation walks the whole list,
    /// so a reading taken before the pass describes a target the next hit will not meet.
    /// </remarks>
    public sealed class TargetStateResult
    {
        /// <summary>The target that was read.</summary>
        [JsonProperty("target")]
        public string Target { get; set; }

        /// <summary>That target's network identity.</summary>
        [JsonProperty("targetNetId")]
        public uint TargetNetId { get; set; }

        /// <summary>The target's level, which drives every curve its stats come from.</summary>
        [JsonProperty("level")]
        public int Level { get; set; }

        /// <summary>Health it holds now.</summary>
        [JsonProperty("healthCurrent")]
        public int HealthCurrent { get; set; }

        /// <summary>Health it holds at full.</summary>
        [JsonProperty("healthMax")]
        public int HealthMax { get; set; }

        /// <summary>
        /// Every stat the combat component computes for it, by the name the component declares.
        /// Discovered rather than listed, so a stat a patch adds is reported.
        /// </summary>
        [JsonProperty("stats")]
        public Dictionary<string, double> Stats { get; set; }

        /// <summary>Effects it carries after the cleanup pass, in the engine's own order.</summary>
        [JsonProperty("effects")]
        public List<ActiveEffect> Effects { get; set; }

        /// <summary>
        /// Effects the cleanup pass removed between the two readings. Each was still contributing
        /// when the first reading was taken.
        /// </summary>
        [JsonProperty("cleared")]
        public List<string> Cleared { get; set; }

        /// <summary>
        /// Effects that had run out and survived the pass anyway, so they still contribute. A name
        /// here with <c>cleanedUp</c> false means the engine is not removing them at all.
        /// </summary>
        [JsonProperty("lingering")]
        public List<string> Lingering { get; set; }

        /// <summary>
        /// Whether the engine runs its own update on this target, which is what removes an expired
        /// effect. When false, the pass never ran and an unchanged pair of readings proves nothing.
        /// </summary>
        [JsonProperty("cleanedUp")]
        public bool CleanedUp { get; set; }

        /// <summary>Frames waited between the two readings.</summary>
        [JsonProperty("frames")]
        public int Frames { get; set; }

        /// <summary>When the reading was taken, in the game's server time.</summary>
        [JsonProperty("at")]
        public double At { get; set; }
    }
}
