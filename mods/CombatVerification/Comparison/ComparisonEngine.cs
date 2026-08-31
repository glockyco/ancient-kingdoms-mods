#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;

namespace CombatVerification.Comparison
{
    public static class ComparisonEngine
    {
        private static readonly Dictionary<string, int> TierOrder =
            new Dictionary<string, int>(StringComparer.Ordinal)
            {
                { "A", 0 },
                { "B", 1 },
                { "C", 2 },
                { "D", 3 },
            };

        public static FixtureComparison CompareFixture(FixtureObservation fixture)
        {
            ValidateFixture(fixture);
            Dictionary<string, ObservedQuantity> observed = new Dictionary<string, ObservedQuantity>(
                StringComparer.Ordinal);
            foreach (ObservedQuantity quantity in fixture.Observed)
                observed.Add(quantity.Quantity, quantity);
            List<QuantityComparison> quantities = new List<QuantityComparison>();
            foreach (PredictedQuantity prediction in fixture.Predicted.OrderBy(
                quantity => quantity.Quantity, StringComparer.Ordinal))
            {
                ObservedQuantity sample;
                if (!observed.TryGetValue(prediction.Quantity, out sample))
                {
                    throw new ComparisonException(
                        "Fixture '" + fixture.Identity.Fixture + "' has no observation for '" +
                        prediction.Quantity + "'.");
                }

                double mean = sample.Values.Average();
                double minimum = sample.Values.Min();
                double maximum = sample.Values.Max();
                bool meanPassed = Math.Abs(mean - prediction.Mean) <= prediction.MeanTolerance;
                bool rangePassed = sample.Values.All(
                    value => value >= prediction.LowerBound && value <= prediction.UpperBound);
                quantities.Add(new QuantityComparison
                {
                    Quantity = prediction.Quantity,
                    PredictedMean = prediction.Mean,
                    ObservedMean = mean,
                    MeanTolerance = prediction.MeanTolerance,
                    PredictedLowerBound = prediction.LowerBound,
                    PredictedUpperBound = prediction.UpperBound,
                    ObservedMinimum = minimum,
                    ObservedMaximum = maximum,
                    MeanPassed = meanPassed,
                    RangePassed = rangePassed,
                    ModelError = !meanPassed,
                    VarianceError = !rangePassed,
                    Passed = meanPassed && rangePassed,
                });
            }

            string extra = observed.Keys.FirstOrDefault(
                name => !fixture.Predicted.Any(
                    prediction => string.Equals(prediction.Quantity, name, StringComparison.Ordinal)));
            if (extra != null)
            {
                throw new ComparisonException(
                    "Fixture '" + fixture.Identity.Fixture + "' has no prediction for '" + extra + "'.");
            }

            List<RefusedAction> refused = fixture.RefusedActions ?? new List<RefusedAction>();
            return new FixtureComparison
            {
                Identity = fixture.Identity,
                Quantities = quantities,
                RefusedActions = refused,
                AcceptedActionCount = fixture.AttemptedActionCount - refused.Count,
                Passed = quantities.All(quantity => quantity.Passed),
                Reliable = true,
            };
        }

        public static VerificationReport Compare(IEnumerable<FixtureObservation> observations)
        {
            if (observations == null) throw new ArgumentNullException("observations");
            List<FixtureComparison> fixtures = observations
                .Select(CompareFixture)
                .OrderBy(fixture => TierIndex(fixture.Identity.Tier))
                .ThenBy(fixture => fixture.Identity.Fixture, StringComparer.Ordinal)
                .ToList();
            int firstFailedTier = fixtures
                .Where(fixture => !fixture.Passed)
                .Select(fixture => TierIndex(fixture.Identity.Tier))
                .DefaultIfEmpty(int.MaxValue)
                .Min();
            foreach (FixtureComparison fixture in fixtures)
            {
                if (TierIndex(fixture.Identity.Tier) <= firstFailedTier) continue;
                fixture.Reliable = false;
                fixture.UnreliableReason =
                    "A lower-tier fixture failed; investigate that failure before this result.";
            }

            return new VerificationReport
            {
                Fixtures = fixtures,
                Passed = fixtures.All(fixture => fixture.Passed && fixture.Reliable),
            };
        }

        private static void ValidateFixture(FixtureObservation fixture)
        {
            if (fixture == null) throw new ArgumentNullException("fixture");
            if (fixture.Identity == null) throw new ComparisonException("Fixture identity is required.");
            RequireText(fixture.Identity.Fixture, "fixture identity");
            RequireText(fixture.Identity.Target, "target");
            RequireText(fixture.Identity.GameVersion, "game version");
            RequireText(fixture.Identity.ModelVersion, "model version");
            TierIndex(fixture.Identity.Tier);
            if (fixture.Identity.EventCount < 0)
                throw new ComparisonException("Event count must not be negative.");
            if (fixture.AttemptedActionCount < 0)
                throw new ComparisonException("Attempted action count must not be negative.");
            if (fixture.Predicted == null || fixture.Predicted.Count == 0)
                throw new ComparisonException("At least one predicted quantity is required.");
            if (fixture.Observed == null || fixture.Observed.Count == 0)
                throw new ComparisonException("At least one observed quantity is required.");
            RequireUnique(fixture.Predicted.Select(quantity => quantity.Quantity), "predicted quantity");
            RequireUnique(fixture.Observed.Select(quantity => quantity.Quantity), "observed quantity");
            foreach (PredictedQuantity quantity in fixture.Predicted)
            {
                RequireText(quantity.Quantity, "predicted quantity");
                RequireFinite(quantity.Mean, quantity.Quantity + " mean");
                RequireFinite(quantity.MeanTolerance, quantity.Quantity + " mean tolerance");
                RequireFinite(quantity.LowerBound, quantity.Quantity + " lower bound");
                RequireFinite(quantity.UpperBound, quantity.Quantity + " upper bound");
                if (quantity.MeanTolerance < 0)
                    throw new ComparisonException(quantity.Quantity + " mean tolerance must not be negative.");
                if (quantity.LowerBound > quantity.UpperBound)
                    throw new ComparisonException(quantity.Quantity + " bounds are reversed.");
            }
            foreach (ObservedQuantity quantity in fixture.Observed)
            {
                RequireText(quantity.Quantity, "observed quantity");
                if (quantity.Values == null || quantity.Values.Count == 0)
                    throw new ComparisonException(quantity.Quantity + " has no observed values.");
                foreach (double value in quantity.Values) RequireFinite(value, quantity.Quantity + " value");
            }
            List<RefusedAction> refused = fixture.RefusedActions ?? new List<RefusedAction>();
            if (refused.Count > fixture.AttemptedActionCount)
                throw new ComparisonException("Refused action count exceeds attempted action count.");
            foreach (RefusedAction action in refused)
            {
                if (action == null) throw new ComparisonException("A refused action is null.");
                RequireText(action.Action, "refused action");
                RequireText(action.Reason, "refusal reason");
            }
        }

        private static int TierIndex(string tier)
        {
            int index;
            if (tier == null || !TierOrder.TryGetValue(tier, out index))
                throw new ComparisonException("Fixture tier must be A, B, C, or D.");
            return index;
        }

        private static void RequireUnique(IEnumerable<string> values, string name)
        {
            HashSet<string> seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (string value in values)
            {
                if (!seen.Add(value)) throw new ComparisonException("Duplicate " + name + " '" + value + "'.");
            }
        }

        private static void RequireText(string value, string name)
        {
            if (string.IsNullOrWhiteSpace(value)) throw new ComparisonException(name + " is required.");
        }

        private static void RequireFinite(double value, string name)
        {
            if (double.IsNaN(value) || double.IsInfinity(value))
                throw new ComparisonException(name + " must be finite.");
        }
    }
}
