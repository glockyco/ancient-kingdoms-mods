using System;
using System.Collections.Generic;
using System.IO;
using CombatVerification.Comparison;
using Xunit;

namespace CombatVerification.Tests;

public sealed class VerificationBaselineTests
{
    [Fact]
    public void CapturesPerQuantityMetadataAndDiagnosticSequence()
    {
        VerificationBaseline baseline = VerificationBaselineGate.Capture(new[] { Observation() });

        BaselineQuantity quantity = Assert.Single(Assert.Single(baseline.Fixtures).Quantities);
        Assert.Equal(37, quantity.Seed);
        Assert.Equal(3, quantity.EventCount);
        Assert.Equal(10, quantity.ObservedMean);
        Assert.Equal(8, quantity.PredictedLowerBound);
        Assert.Equal(12, quantity.PredictedUpperBound);
        Assert.Equal(new[] { 9d, 10d, 11d }, quantity.ObservedSequence);
    }

    [Fact]
    public void IgnoresSequenceOrderButFailsAQuantityMeanDrift()
    {
        FixtureObservation original = Observation();
        VerificationBaseline baseline = VerificationBaselineGate.Capture(new[] { original });
        FixtureObservation reordered = Observation();
        reordered.Observed[0].Values.Reverse();
        Assert.True(VerificationBaselineGate.Compare(baseline, new[] { reordered }).Passed);

        FixtureObservation changed = Observation();
        changed.Observed[0].Values[0] = 10;
        BaselineComparison result = VerificationBaselineGate.Compare(baseline, new[] { changed });

        Assert.False(result.Passed);
        BaselineDrift drift = Assert.Single(result.Drift);
        Assert.Equal("stat.damage", drift.Quantity);
        Assert.Equal("observedMean", drift.Field);
    }

    [Fact]
    public void ReportsGameVersionBeforeQuantityComparison()
    {
        VerificationBaseline baseline = VerificationBaselineGate.Capture(new[] { Observation() });
        FixtureObservation current = Observation();
        current.Identity.GameVersion = "0.9.32.0";
        current.Observed[0].Values[0] = 999;

        GameVersionDifferenceException error = Assert.Throws<GameVersionDifferenceException>(
            () => VerificationBaselineGate.Compare(baseline, new[] { current }));

        Assert.Equal("0.9.31.1", error.BaselineGameVersion);
        Assert.Equal("0.9.32.0", error.CurrentGameVersion);
        Assert.DoesNotContain("stat.damage", error.Message);
    }

    [Fact]
    public void RequiresAnExplicitReviewReasonToWriteAnUpdate()
    {
        VerificationBaseline baseline = VerificationBaselineGate.Capture(new[] { Observation() });
        string directory = Path.Combine(Path.GetTempPath(), "combat-baseline-" + Guid.NewGuid());
        string path = Path.Combine(directory, "baseline.json");
        try
        {
            Assert.Throws<ComparisonException>(
                () => VerificationBaselineGate.WriteReviewedUpdate(path, baseline, ""));
            Assert.False(File.Exists(path));

            VerificationBaselineGate.WriteReviewedUpdate(path, baseline, "reviewed game update");
            VerificationBaseline loaded = VerificationBaselineGate.Read(path);
            Assert.Equal("0.9.31.1", loaded.GameVersion);
            Assert.Single(loaded.Fixtures);
        }
        finally
        {
            if (Directory.Exists(directory)) Directory.Delete(directory, true);
        }
    }

    private static FixtureObservation Observation()
    {
        return new FixtureObservation
        {
            Identity = new FixtureIdentity
            {
                Fixture = "A-warrior",
                Target = "Training Dummy",
                GameVersion = "0.9.31.1",
                ModelVersion = "1",
                Seed = 37,
                EventCount = 3,
                Tier = "A",
            },
            Predicted = new List<PredictedQuantity>
            {
                new PredictedQuantity
                {
                    Quantity = "stat.damage",
                    Mean = 10,
                    MeanTolerance = 1,
                    LowerBound = 8,
                    UpperBound = 12,
                },
            },
            Observed = new List<ObservedQuantity>
            {
                new ObservedQuantity
                {
                    Quantity = "stat.damage",
                    Values = new List<double> { 9, 10, 11 },
                },
            },
            RefusedActions = new List<RefusedAction>(),
            AttemptedActionCount = 3,
        };
    }
}
