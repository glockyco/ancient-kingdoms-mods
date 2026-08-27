#nullable disable
namespace CombatVerification.Probes
{
    /// <summary>
    /// How directly a measurement obtained its amounts, and what held it there.
    /// </summary>
    /// <remarks>
    /// A comparison is only as good as the tier behind it, so a measurement states its tier rather
    /// than leaving a reader to infer one from the shape of the output. A rotation comparison needs
    /// <see cref="PerHitAttributed"/>: without the skill behind each hit, two rotations that produce
    /// the same total are indistinguishable.
    /// <para>
    /// The specification also names an aggregate tier, for a total with no separation into hits. No
    /// probe produces one, so it is not named here; a constant nothing can return would read as a
    /// reachable outcome.
    /// </para>
    /// </remarks>
    public static class Tiers
    {
        /// <summary>One amount per hit, with no skill behind it.</summary>
        public const string PerHit = "perHit";

        /// <summary>One amount per hit, each naming the skill the engine chose.</summary>
        public const string PerHitAttributed = "perHitAttributed";

        /// <summary>
        /// The tier a damage measurement reached, and why it reached no higher.
        /// </summary>
        /// <remarks>
        /// Two different things stop attribution and a reader has to be able to tell them apart. The
        /// stamp on the damage entry point can be missing, which is a fault in the harness and applies
        /// to every hit; or the stamp can be in place while a hit still named no skill, which is
        /// something about that run. Reporting one reason for both would send an investigation to the
        /// wrong place.
        /// <para>
        /// One unnamed hit holds the whole window down. That hit is the one a rotation comparison would
        /// place against the wrong skill, and a tier that ignored it would describe the hits that
        /// happened to work.
        /// </para>
        /// </remarks>
        public static string Reached(
            bool stampApplied, string stampUnavailable, bool everyHitNamed, out string limit)
        {
            if (!stampApplied)
            {
                limit = stampUnavailable ?? "the stamp on the damage entry point is not in place";
                return PerHit;
            }

            if (!everyHitNamed)
            {
                limit = "a hit in the window named no skill, so a rotation cannot be told apart";
                return PerHit;
            }

            limit = null;
            return PerHitAttributed;
        }
    }
}
