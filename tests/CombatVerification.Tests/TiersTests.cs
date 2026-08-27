using CombatVerification.Probes;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// The tier a damage measurement reached, and the reason it reached no higher.
    /// </summary>
    /// <remarks>
    /// The reason is the part that matters. A missing stamp is a fault in the harness that applies to
    /// every run, and an unnamed hit is something about one run, so one message for both would send an
    /// investigation to the wrong place.
    /// </remarks>
    public sealed class TiersTests
    {
        [Fact]
        public void EveryHitNamedWithTheStampInPlaceReachesAttribution()
        {
            var tier = Tiers.Reached(
                stampApplied: true, stampUnavailable: null, everyHitNamed: true, out var limit);

            Assert.Equal("perHitAttributed", tier);
            Assert.Null(limit);
        }

        [Fact]
        public void AMissingStampReportsWhyTheStampIsMissing()
        {
            var tier = Tiers.Reached(
                stampApplied: false,
                stampUnavailable: "MissingMethodException: no such overload",
                everyHitNamed: true,
                out var limit);

            Assert.Equal("perHit", tier);
            Assert.Equal("MissingMethodException: no such overload", limit);
        }

        /// <summary>
        /// A stamp that never applied and gave no reason still owes the reader one.
        /// </summary>
        [Fact]
        public void AMissingStampWithNoReasonStillStatesOne()
        {
            Tiers.Reached(stampApplied: false, stampUnavailable: null, everyHitNamed: true, out var limit);

            Assert.Contains("not in place", limit);
        }

        /// <summary>
        /// The stamp being in place is not enough. One hit that named no skill is the hit a comparison
        /// would place against the wrong skill.
        /// </summary>
        [Fact]
        public void AnUnnamedHitHoldsTheWindowDownForADifferentReason()
        {
            var tier = Tiers.Reached(
                stampApplied: true, stampUnavailable: null, everyHitNamed: false, out var limit);

            Assert.Equal("perHit", tier);
            Assert.Contains("named no skill", limit);
        }

        /// <summary>
        /// When both are wrong, the stamp is the one to report: it explains the unnamed hit.
        /// </summary>
        [Fact]
        public void AMissingStampIsReportedAheadOfTheHitItExplains()
        {
            Tiers.Reached(
                stampApplied: false,
                stampUnavailable: "the patch has not been applied",
                everyHitNamed: false,
                out var limit);

            Assert.Equal("the patch has not been applied", limit);
        }
    }
}
