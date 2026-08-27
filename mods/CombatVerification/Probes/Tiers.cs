#nullable disable
namespace CombatVerification.Probes
{
    /// <summary>
    /// How directly a measurement obtained its amounts.
    /// </summary>
    /// <remarks>
    /// A comparison is only as good as the tier behind it, so a measurement states its tier rather
    /// than leaving a reader to infer one from the shape of the output. A rotation comparison needs
    /// <see cref="PerHitAttributed"/>: without the skill behind each hit, two rotations that produce
    /// the same total are indistinguishable.
    /// </remarks>
    public static class Tiers
    {
        /// <summary>A total over a window, with no separation into hits.</summary>
        public const string Aggregate = "aggregate";

        /// <summary>One amount per hit, with no skill behind it.</summary>
        public const string PerHit = "perHit";

        /// <summary>One amount per hit, each naming the skill the engine chose.</summary>
        public const string PerHitAttributed = "perHitAttributed";
    }
}
