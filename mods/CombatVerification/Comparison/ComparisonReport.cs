#nullable disable
using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CombatVerification.Comparison
{
    public sealed class FixtureIdentity
    {
        [JsonProperty("fixture")] public string Fixture { get; set; }
        [JsonProperty("target")] public string Target { get; set; }
        [JsonProperty("gameVersion")] public string GameVersion { get; set; }
        [JsonProperty("modelVersion")] public string ModelVersion { get; set; }
        [JsonProperty("seed")] public int? Seed { get; set; }
        [JsonProperty("eventCount")] public int EventCount { get; set; }
        [JsonProperty("tier")] public string Tier { get; set; }
    }

    public sealed class PredictedQuantity
    {
        [JsonProperty("quantity")] public string Quantity { get; set; }
        [JsonProperty("mean")] public double Mean { get; set; }
        [JsonProperty("meanTolerance")] public double MeanTolerance { get; set; }
        [JsonProperty("lowerBound")] public double LowerBound { get; set; }
        [JsonProperty("upperBound")] public double UpperBound { get; set; }
    }

    public sealed class ObservedQuantity
    {
        [JsonProperty("quantity")] public string Quantity { get; set; }
        [JsonProperty("values")] public List<double> Values { get; set; }
    }

    public sealed class RefusedAction
    {
        [JsonProperty("action")] public string Action { get; set; }
        [JsonProperty("reason")] public string Reason { get; set; }
    }

    public sealed class QuantityComparison
    {
        [JsonProperty("quantity")] public string Quantity { get; set; }
        [JsonProperty("predictedMean")] public double PredictedMean { get; set; }
        [JsonProperty("observedMean")] public double ObservedMean { get; set; }
        [JsonProperty("meanTolerance")] public double MeanTolerance { get; set; }
        [JsonProperty("predictedLowerBound")] public double PredictedLowerBound { get; set; }
        [JsonProperty("predictedUpperBound")] public double PredictedUpperBound { get; set; }
        [JsonProperty("observedMinimum")] public double ObservedMinimum { get; set; }
        [JsonProperty("observedMaximum")] public double ObservedMaximum { get; set; }
        [JsonProperty("meanPassed")] public bool MeanPassed { get; set; }
        [JsonProperty("rangePassed")] public bool RangePassed { get; set; }
        [JsonProperty("modelError")] public bool ModelError { get; set; }
        [JsonProperty("varianceError")] public bool VarianceError { get; set; }
        [JsonProperty("passed")] public bool Passed { get; set; }
    }

    public sealed class FixtureComparison
    {
        [JsonProperty("identity")] public FixtureIdentity Identity { get; set; }
        [JsonProperty("quantities")] public List<QuantityComparison> Quantities { get; set; }
        [JsonProperty("refusedActions")] public List<RefusedAction> RefusedActions { get; set; }
        [JsonProperty("acceptedActionCount")] public int AcceptedActionCount { get; set; }
        [JsonProperty("passed")] public bool Passed { get; set; }
        [JsonProperty("reliable")] public bool Reliable { get; set; }
        [JsonProperty("unreliableReason")] public string UnreliableReason { get; set; }
    }

    public sealed class VerificationReport
    {
        [JsonProperty("fixtures")] public List<FixtureComparison> Fixtures { get; set; }
        [JsonProperty("passed")] public bool Passed { get; set; }
    }

    public sealed class FixtureObservation
    {
        public FixtureIdentity Identity { get; set; }
        public List<PredictedQuantity> Predicted { get; set; }
        public List<ObservedQuantity> Observed { get; set; }
        public List<RefusedAction> RefusedActions { get; set; }
        public int AttemptedActionCount { get; set; }
    }

    public class ComparisonException : Exception
    {
        public ComparisonException(string message) : base(message) { }
    }
}
