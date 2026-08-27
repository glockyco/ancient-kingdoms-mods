using CombatVerification.Probes;
using Xunit;

namespace CombatVerification.Tests
{
    /// <summary>
    /// The rule that decides which readings of the refractory period are actions.
    /// </summary>
    /// <remarks>
    /// A wrong answer here does not fail loudly. It produces an interval, and an interval that
    /// belongs to no action is indistinguishable from a measurement until something checks it.
    /// </remarks>
    public class ActionTimelineTests
    {
        [Fact]
        public void TheBaselineReadingIsNotAnAction()
        {
            var timeline = new ActionTimeline();

            timeline.Observe(refractoryEnd: 100.72, period: 0.72);

            Assert.Empty(timeline.Completions);
            Assert.Empty(timeline.Intervals);
            Assert.Equal(1, timeline.Readings);
        }

        [Fact]
        public void AnUnchangedReadingIsNotAnAction()
        {
            var timeline = new ActionTimeline();

            timeline.Observe(100.72, 0.72);
            timeline.Observe(100.72, 0.72);
            timeline.Observe(100.72, 0.72);

            Assert.Empty(timeline.Completions);
            Assert.Equal(0, timeline.Resets);
        }

        [Fact]
        public void ACompletionIsTheEndLessThePeriod()
        {
            var timeline = new ActionTimeline();

            timeline.Observe(100.72, 0.72);
            timeline.Observe(101.44, 0.72);

            Assert.Equal(100.72, Assert.Single(timeline.Completions), precision: 6);
        }

        [Fact]
        public void AnIntervalIsTheGapBetweenConsecutiveCompletions()
        {
            var timeline = new ActionTimeline();

            timeline.Observe(100.72, 0.72);
            timeline.Observe(101.44, 0.72);
            timeline.Observe(102.16, 0.72);

            Assert.Equal(2, timeline.Completions.Count);
            Assert.Equal(0.72, Assert.Single(timeline.Intervals), precision: 6);
        }

        [Fact]
        public void OneActionYieldsNoInterval()
        {
            var timeline = new ActionTimeline();

            timeline.Observe(100.72, 0.72);
            timeline.Observe(101.44, 0.72);

            Assert.Single(timeline.Completions);
            Assert.Empty(timeline.Intervals);
        }

        [Fact]
        public void AClearedPeriodIsAResetAndNotAnAction()
        {
            var timeline = new ActionTimeline();

            timeline.Observe(100.72, 0.72);
            timeline.Observe(101.44, 0.72);
            timeline.Observe(0.0, 0.72);

            Assert.Single(timeline.Completions);
            Assert.Equal(1, timeline.Resets);
        }

        [Fact]
        public void APairThatMovesBackwardsIsAResetAndNotAnAction()
        {
            var timeline = new ActionTimeline();

            timeline.Observe(100.72, 0.72);
            timeline.Observe(101.44, 0.72);

            // The end advances while the period grows further, so the moment derived from the pair
            // precedes the previous one and no action can have completed at it.
            timeline.Observe(101.50, 2.00);

            Assert.Single(timeline.Completions);
            Assert.Equal(1, timeline.Resets);
        }

        [Fact]
        public void ActionsAfterAResetAreStillMeasured()
        {
            var timeline = new ActionTimeline();

            timeline.Observe(100.72, 0.72);
            timeline.Observe(101.44, 0.72);
            timeline.Observe(0.0, 0.72);
            timeline.Observe(102.44, 0.72);
            timeline.Observe(103.16, 0.72);

            Assert.Equal(3, timeline.Completions.Count);
            Assert.Equal(1, timeline.Resets);
            Assert.Equal(1.0, timeline.Intervals[0], precision: 6);
            Assert.Equal(0.72, timeline.Intervals[1], precision: 6);
        }
    }
}
