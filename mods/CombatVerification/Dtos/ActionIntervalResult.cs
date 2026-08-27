#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Dtos
{
    /// <summary>One value the probe cleared, and what it held before.</summary>
    /// <remarks>
    /// A probe that stills its subject has changed the game, so it owes the reader an account of
    /// exactly what it changed. The held value also carries information: a pending skill means the
    /// subject was about to act, which is the state that makes a reading unattributable.
    /// </remarks>
    public sealed class StoppedValue
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("held")]
        public string Held { get; set; }
    }

    /// <summary>A weapon the subject wears, and the delay the engine reads from it.</summary>
    /// <remarks>
    /// Reported per slot rather than as one selected delay. The engine scans the slots in order and
    /// takes the first weapon that suits the action, and which one that is depends on the action, so
    /// the probe reports what is worn and leaves the selection to whoever knows the action.
    /// </remarks>
    public sealed class WornWeapon
    {
        [JsonProperty("slot")]
        public int Slot { get; set; }

        [JsonProperty("itemId")]
        public string ItemId { get; set; }

        [JsonProperty("category")]
        public string Category { get; set; }

        [JsonProperty("delay")]
        public int Delay { get; set; }
    }

    /// <summary>Arguments for an action interval reading.</summary>
    public sealed class ActionIntervalArgs
    {
        /// <summary>
        /// Seconds to watch for completed actions. Absent or zero reads the period the engine
        /// enforces and the state that decides it, and observes no action, because an interval needs
        /// two completions and something else has to drive them.
        /// </summary>
        [JsonProperty("windowSeconds", Required = Required.Default)]
        public double WindowSeconds { get; set; }
    }

    /// <summary>How often one character can act, and the state that decides it.</summary>
    public sealed class ActionIntervalResult
    {
        /// <summary>Every value the probe cleared to make the reading attributable.</summary>
        [JsonProperty("stopped")]
        public List<StoppedValue> Stopped { get; set; }

        /// <summary>Whether two consecutive readings agreed after the subject was stilled.</summary>
        [JsonProperty("settled")]
        public bool Settled { get; set; }

        /// <summary>Why the reading belongs to no action, or null when it belongs to one.</summary>
        [JsonProperty("unattributable")]
        public string Unattributable { get; set; }

        /// <summary>The state the subject reported while it was read.</summary>
        [JsonProperty("state")]
        public string State { get; set; }

        /// <summary>The period the engine last computed, which is the gap it enforces.</summary>
        [JsonProperty("refractoryPeriod")]
        public double RefractoryPeriod { get; set; }

        /// <summary>The moment that period ends, in the game's server time.</summary>
        [JsonProperty("refractoryEnd")]
        public double RefractoryEnd { get; set; }

        /// <summary>The haste the combat component aggregates, which shortens the period.</summary>
        [JsonProperty("haste")]
        public float Haste { get; set; }

        /// <summary>Weapons worn, in slot order, each with the delay the engine reads.</summary>
        [JsonProperty("weapons")]
        public List<WornWeapon> Weapons { get; set; }

        /// <summary>When the window opened, in the game's server time.</summary>
        [JsonProperty("openedAt")]
        public double OpenedAt { get; set; }

        /// <summary>When the window closed, in the game's server time.</summary>
        [JsonProperty("closedAt")]
        public double ClosedAt { get; set; }

        /// <summary>Readings taken across the window, including the baseline.</summary>
        [JsonProperty("readings")]
        public int Readings { get; set; }

        /// <summary>Moments actions completed inside the window, in the game's server time.</summary>
        [JsonProperty("completions")]
        public List<double> Completions { get; set; }

        /// <summary>Observed gaps between consecutive completions inside the window.</summary>
        [JsonProperty("intervals")]
        public List<double> Intervals { get; set; }

        /// <summary>Readings where the period was cleared or moved backwards.</summary>
        [JsonProperty("resets")]
        public int Resets { get; set; }
    }
}
