#nullable disable
using System.Collections.Generic;

namespace CombatVerification.Probes
{
    /// <summary>One timed effect an entity carries.</summary>
    public readonly struct TimedEffect
    {
        public TimedEffect(string name, string category, int level, float remaining)
        {
            Name = name;
            Category = category;
            Level = level;
            Remaining = remaining;
        }

        /// <summary>The name the effect's skill declares, which identifies it in the list.</summary>
        public string Name { get; }

        /// <summary>
        /// The category the effect belongs to, or an empty string when it declares none. A category
        /// admits one member at a time, so a second effect of the same category replaces the first.
        /// </summary>
        public string Category { get; }

        /// <summary>The level the effect was applied at, which scales what it contributes.</summary>
        public int Level { get; }

        /// <summary>
        /// Seconds the effect has left. Zero means it has run out and is waiting to be removed.
        /// </summary>
        public float Remaining { get; }

        /// <summary>Whether the effect has run out while still being in the list.</summary>
        public bool Expired => Remaining == 0f;
    }

    /// <summary>
    /// What the engine's own cleanup pass did to an effect list between two readings.
    /// </summary>
    /// <remarks>
    /// A single reading of the list is not the state that decides a hit. An effect whose time has run
    /// out stays in the list until the cleanup pass removes it, and every stat aggregation walks the
    /// whole list, so an expired effect contributes to defense and to every resist for as long as it
    /// is there. A reading taken before the pass therefore describes a target that the next hit will
    /// not meet.
    /// <para>
    /// The pass is not guaranteed to run either. It is called from an update that is skipped when the
    /// entity is not worth updating (<c>Skills.cs:708-714</c>), so an expired effect can persist. So
    /// the comparison reports both what the pass removed and what it left behind, and neither is
    /// inferred from the other.
    /// </para>
    /// </remarks>
    public static class EffectCleanup
    {
        /// <summary>
        /// Names present before the pass and gone after it, in the order they were held.
        /// </summary>
        /// <remarks>
        /// Matched by name, because the engine refreshes an effect by name and so holds at most one
        /// entry per name.
        /// </remarks>
        public static List<string> Cleared(
            IReadOnlyList<TimedEffect> before, IReadOnlyList<TimedEffect> after)
        {
            var cleared = new List<string>();
            var remaining = new HashSet<string>();

            foreach (var effect in after)
                remaining.Add(effect.Name);

            foreach (var effect in before)
            {
                if (!remaining.Contains(effect.Name))
                    cleared.Add(effect.Name);
            }

            return cleared;
        }

        /// <summary>
        /// Names that had run out and were still in the list after the pass, so they still count.
        /// </summary>
        public static List<string> Lingering(IReadOnlyList<TimedEffect> after)
        {
            var lingering = new List<string>();

            foreach (var effect in after)
            {
                if (effect.Expired)
                    lingering.Add(effect.Name);
            }

            return lingering;
        }
    }
}
