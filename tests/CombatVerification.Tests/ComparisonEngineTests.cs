using System.Collections.Generic;
using CombatVerification.Comparison;
using Xunit;

namespace CombatVerification.Tests;

public sealed class ComparisonEngineTests
{
    [Fact]
    public void ReportsMeanAndRangeIndependentlyPerQuantity()
    {
        FixtureComparison result = ComparisonEngine.CompareFixture(Observation(
            "B-hit",
            "B",
            new List<PredictedQuantity>
            {
                Prediction("perHit.intent", 100, 2, 95, 105),
                Prediction("perHit.reduction", 10, 1, 8, 12),
            },
            new List<ObservedQuantity>
            {
                Observed("perHit.intent", 100, 100, 106),
                Observed("perHit.reduction", 9, 9, 9),
            }));

        Assert.False(result.Passed);
        QuantityComparison intent = Assert.Single(result.Quantities, value => value.Quantity == "perHit.intent");
        Assert.True(intent.MeanPassed);
        Assert.False(intent.RangePassed);
        Assert.False(intent.ModelError);
        Assert.True(intent.VarianceError);
        QuantityComparison reduction = Assert.Single(
            result.Quantities, value => value.Quantity == "perHit.reduction");
        Assert.True(reduction.MeanPassed);
        Assert.True(reduction.RangePassed);
    }

    [Fact]
    public void RecordsRefusalsWithoutCountingThemAsActions()
    {
        FixtureObservation observation = Observation(
            "D-rotation",
            "D",
            new List<PredictedQuantity> { Prediction("sustainedOutput", 50, 0, 50, 50) },
            new List<ObservedQuantity> { Observed("sustainedOutput", 50) });
        observation.AttemptedActionCount = 3;
        observation.RefusedActions = new List<RefusedAction>
        {
            new RefusedAction { Action = "Power Shot", Reason = "no ammunition" },
        };

        FixtureComparison result = ComparisonEngine.CompareFixture(observation);

        Assert.Equal(2, result.AcceptedActionCount);
        RefusedAction refusal = Assert.Single(result.RefusedActions);
        Assert.Equal("Power Shot", refusal.Action);
        Assert.Equal("no ammunition", refusal.Reason);
    }

    [Fact]
    public void OrdersTiersAndMarksOnlyHigherTiersUnreliable()
    {
        FixtureObservation tierD = Passing("D-run", "D");
        FixtureObservation tierB = Passing("B-hit", "B");
        tierB.Observed[0].Values[0] = 20;
        FixtureObservation tierA = Passing("A-stats", "A");
        FixtureObservation tierC = Passing("C-interval", "C");

        VerificationReport report = ComparisonEngine.Compare(
            new[] { tierD, tierB, tierA, tierC });

        Assert.Equal(new[] { "A", "B", "C", "D" }, report.Fixtures.ConvertAll(x => x.Identity.Tier));
        Assert.True(report.Fixtures[0].Reliable);
        Assert.True(report.Fixtures[1].Reliable);
        Assert.False(report.Fixtures[2].Reliable);
        Assert.False(report.Fixtures[3].Reliable);
        Assert.Contains("lower-tier", report.Fixtures[2].UnreliableReason);
        Assert.False(report.Passed);
    }

    [Fact]
    public void RejectsAnUnpairedQuantity()
    {
        FixtureObservation observation = Passing("A-stats", "A");
        observation.Observed.Add(Observed("stat.magicDamage", 1));

        ComparisonException error = Assert.Throws<ComparisonException>(
            () => ComparisonEngine.CompareFixture(observation));

        Assert.Contains("no prediction", error.Message);
    }

    [Fact]
    public void RejectsARefusalWithoutAReason()
    {
        FixtureObservation observation = Passing("D-run", "D");
        observation.AttemptedActionCount = 1;
        observation.RefusedActions = new List<RefusedAction>
        {
            new RefusedAction { Action = "Strike", Reason = "" },
        };

        Assert.Throws<ComparisonException>(() => ComparisonEngine.CompareFixture(observation));
    }

    private static FixtureObservation Passing(string fixture, string tier)
    {
        return Observation(
            fixture,
            tier,
            new List<PredictedQuantity> { Prediction("stat.damage", 10, 0, 10, 10) },
            new List<ObservedQuantity> { Observed("stat.damage", 10) });
    }

    private static FixtureObservation Observation(
        string fixture,
        string tier,
        List<PredictedQuantity> predicted,
        List<ObservedQuantity> observed)
    {
        return new FixtureObservation
        {
            Identity = new FixtureIdentity
            {
                Fixture = fixture,
                Target = "Training Dummy",
                GameVersion = "0.9.31.1",
                ModelVersion = "1",
                Seed = 123,
                EventCount = 3,
                Tier = tier,
            },
            Predicted = predicted,
            Observed = observed,
            RefusedActions = new List<RefusedAction>(),
            AttemptedActionCount = 3,
        };
    }

    private static PredictedQuantity Prediction(
        string name, double mean, double tolerance, double lower, double upper)
    {
        return new PredictedQuantity
        {
            Quantity = name,
            Mean = mean,
            MeanTolerance = tolerance,
            LowerBound = lower,
            UpperBound = upper,
        };
    }

    private static ObservedQuantity Observed(string name, params double[] values)
    {
        return new ObservedQuantity { Quantity = name, Values = new List<double>(values) };
    }
}
