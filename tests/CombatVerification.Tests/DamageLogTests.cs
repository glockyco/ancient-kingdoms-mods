using CombatVerification.Probes;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// The rule that turns a running damage total into the hits it is made of.
    /// </summary>
    /// <remarks>
    /// One reading per hit, so one difference per hit. A wrong answer here does not fail loudly: it
    /// produces a plausible number that is the sum of two hits, or a hit of zero that nothing did.
    /// </remarks>
    public sealed class DamageLogTests
    {
        [Fact]
        public void AHitIsTheAdvanceSinceTheWindowOpened()
        {
            var log = new DamageLog(totalAtOpen: 5000);

            log.Observe("Ancient Cyclops", 42u, totalNow: 5283, at: 1000.5);

            var hit = Assert.Single(log.Hits);
            Assert.Equal("Ancient Cyclops", hit.Victim);
            Assert.Equal(42u, hit.VictimNetId);
            Assert.Equal(283, hit.Amount);
            Assert.Equal(1000.5, hit.At);
        }

        /// <summary>
        /// The total the caster already held is not damage this window measured. Counting it would
        /// put every earlier fight into the first hit.
        /// </summary>
        [Fact]
        public void TheTotalHeldBeforeTheWindowIsNotAHit()
        {
            var log = new DamageLog(totalAtOpen: 100000);

            log.Observe("Ancient Cyclops", 1u, totalNow: 100283, at: 1.0);

            Assert.Equal(283, Assert.Single(log.Hits).Amount);
        }

        [Fact]
        public void EachHitIsMeasuredFromTheOneBeforeIt()
        {
            var log = new DamageLog(0);

            log.Observe("Ancient Cyclops", 1u, 283, 1.0);
            log.Observe("Ancient Cyclops", 1u, 574, 2.0);
            log.Observe("Ancient Cyclops", 1u, 839, 3.0);

            Assert.Equal(new[] { 283, 291, 265 }, GetAmounts(log));
        }

        /// <summary>
        /// A hit that reached the end of the pipeline and took nothing is kept. A mana shield
        /// absorbing a hit produces this, and dropping it would hide the absorb. A missed action is
        /// a different case that never reaches this log at all.
        /// </summary>
        [Fact]
        public void AHitThatTookNoHealthIsRecordedAsZero()
        {
            var log = new DamageLog(0);

            log.Observe("Ancient Cyclops", 1u, 283, 1.0);
            log.Observe("Ancient Cyclops", 1u, 283, 2.0);
            log.Observe("Ancient Cyclops", 1u, 566, 3.0);

            Assert.Equal(new[] { 283, 0, 283 }, GetAmounts(log));
        }

        /// <summary>
        /// Two hits of the same size are two hits. Collapsing them would under-count exactly where
        /// damage is most consistent, which is the case a measurement is usually set up to produce.
        /// </summary>
        [Fact]
        public void RepeatedIdenticalHitsAreKeptApart()
        {
            var log = new DamageLog(0);

            log.Observe("Ancient Cyclops", 1u, 55, 1.0);
            log.Observe("Ancient Cyclops", 1u, 110, 2.0);

            Assert.Equal(new[] { 55, 55 }, GetAmounts(log));
        }

        /// <summary>
        /// The engine clears the total when a fight ends. Treated as a hit it would be a large
        /// negative amount, and every hit after it would be measured from the wrong base.
        /// </summary>
        [Fact]
        public void AClearedTotalIsAResetRatherThanAHit()
        {
            var log = new DamageLog(0);

            log.Observe("Ancient Cyclops", 1u, 283, 1.0);
            log.Observe("Ancient Cyclops", 1u, 0, 2.0);
            log.Observe("Ancient Cyclops", 1u, 291, 3.0);

            Assert.Equal(1, log.Resets);
            Assert.Equal(new[] { 283, 291 }, GetAmounts(log));
        }

        [Fact]
        public void AWindowWithNoActionRecordsNothing()
        {
            var log = new DamageLog(5000);

            Assert.Empty(log.Hits);
            Assert.Equal(0, log.Resets);
        }

        /// <summary>
        /// A second target in the window is named per hit rather than merged, so a contaminated
        /// measurement can be found afterwards instead of silently averaging two subjects.
        /// </summary>
        [Fact]
        public void EachHitNamesItsOwnVictim()
        {
            var log = new DamageLog(0);

            log.Observe("Ancient Cyclops", 1u, 283, 1.0);
            log.Observe("Slagmaw", 2u, 500, 2.0);

            Assert.Equal(new[] { "Ancient Cyclops", "Slagmaw" }, new[] { log.Hits[0].Victim, log.Hits[1].Victim });
            Assert.Equal(new[] { 283, 217 }, GetAmounts(log));
        }

        /// <summary>
        /// A hit keeps what the stamp named, so a rotation can be told apart afterwards.
        /// </summary>
        [Fact]
        public void AnAttributedHitNamesItsSkillAndSchool()
        {
            var log = new DamageLog(0);

            log.Observe("Ancient Cyclops", 1u, 283, 1.0, "Stab", "Normal", intent: 464);

            var hit = Assert.Single(log.Hits);
            Assert.Equal("Stab", hit.Skill);
            Assert.Equal("Normal", hit.DamageType);
            Assert.Equal(464, hit.Intent);
            Assert.True(hit.Attributed);
            Assert.True(log.AllAttributed);
        }

        /// <summary>
        /// One unattributed hit holds the whole window down, because that hit is the one a rotation
        /// comparison would place against the wrong skill.
        /// </summary>
        [Fact]
        public void OneUnnamedHitWithdrawsAttributionFromTheWindow()
        {
            var log = new DamageLog(0);

            log.Observe("Ancient Cyclops", 1u, 283, 1.0, "Stab", "Normal", 464);
            log.Observe("Ancient Cyclops", 1u, 550, 2.0);

            Assert.False(log.AllAttributed);
            Assert.True(log.Hits[0].Attributed);
            Assert.False(log.Hits[1].Attributed);
        }

        /// <summary>
        /// A window with no hit is attributed, so an empty measurement is not reported as a failure
        /// of the mechanism that had nothing to attribute.
        /// </summary>
        [Fact]
        public void AnEmptyWindowIsAttributed()
        {
            Assert.True(new DamageLog(0).AllAttributed);
        }

        private static int[] GetAmounts(DamageLog log)
        {
            var amounts = new int[log.Hits.Count];
            for (var i = 0; i < amounts.Length; i++)
                amounts[i] = log.Hits[i].Amount;
            return amounts;
        }
    }
}
