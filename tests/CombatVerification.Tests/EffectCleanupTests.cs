using CombatVerification.Probes;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// What two readings of an effect list say about the engine's cleanup pass.
    /// </summary>
    /// <remarks>
    /// An effect whose time has run out keeps contributing to every stat until the pass removes it,
    /// so the two questions are separate: what the pass took away, and what it left behind. Answering
    /// one from the other would report a stale target as a current one.
    /// </remarks>
    public sealed class EffectCleanupTests
    {
        [Fact]
        public void AnEffectPresentBeforeAndGoneAfterWasCleared()
        {
            var before = new[] { Effect("Stone Skin", 0f), Effect("Enrage", 4.5f) };
            var after = new[] { Effect("Enrage", 4.4f) };

            Assert.Equal(new[] { "Stone Skin" }, EffectCleanup.Cleared(before, after));
            Assert.Empty(EffectCleanup.Lingering(after));
        }

        /// <summary>
        /// The pass is skipped when the engine does not update the entity, so an expired effect can
        /// survive it. Reporting nothing here would present a stale target as a current one.
        /// </summary>
        [Fact]
        public void AnExpiredEffectThatSurvivedIsLingering()
        {
            var before = new[] { Effect("Stone Skin", 0f) };
            var after = new[] { Effect("Stone Skin", 0f) };

            Assert.Empty(EffectCleanup.Cleared(before, after));
            Assert.Equal(new[] { "Stone Skin" }, EffectCleanup.Lingering(after));
        }

        /// <summary>
        /// A refreshed effect is the same entry with more time, not a clearing and an addition.
        /// </summary>
        [Fact]
        public void ARefreshedEffectIsNeitherClearedNorLingering()
        {
            var before = new[] { Effect("Enrage", 0.2f) };
            var after = new[] { Effect("Enrage", 8f) };

            Assert.Empty(EffectCleanup.Cleared(before, after));
            Assert.Empty(EffectCleanup.Lingering(after));
        }

        [Fact]
        public void AnEffectGainedBetweenReadingsIsNotCleared()
        {
            var before = new[] { Effect("Enrage", 4f) };
            var after = new[] { Effect("Enrage", 3.9f), Effect("Stone Skin", 10f) };

            Assert.Empty(EffectCleanup.Cleared(before, after));
        }

        [Fact]
        public void SeveralClearedEffectsKeepTheOrderTheyWereHeldIn()
        {
            var before = new[] { Effect("A", 0f), Effect("B", 5f), Effect("C", 0f) };
            var after = new[] { Effect("B", 4.9f) };

            Assert.Equal(new[] { "A", "C" }, EffectCleanup.Cleared(before, after));
        }

        [Fact]
        public void AnEmptyPairReportsNothing()
        {
            var none = new TimedEffect[0];

            Assert.Empty(EffectCleanup.Cleared(none, none));
            Assert.Empty(EffectCleanup.Lingering(none));
        }

        /// <summary>
        /// A category is carried through so a reader can tell which effects exclude each other. The
        /// engine admits one member of a category at a time.
        /// </summary>
        [Fact]
        public void AnEffectKeepsItsCategoryAndLevel()
        {
            var effect = new TimedEffect("Greater Feast", "Food", level: 3, remaining: 1799.5f);

            Assert.Equal("Food", effect.Category);
            Assert.Equal(3, effect.Level);
            Assert.False(effect.Expired);
        }

        private static TimedEffect Effect(string name, float remaining) =>
            new TimedEffect(name, string.Empty, 1, remaining);
    }
}
