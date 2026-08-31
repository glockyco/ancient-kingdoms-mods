#nullable disable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using Newtonsoft.Json;

namespace CombatVerification.Comparison
{
    public sealed class VerificationBaseline
    {
        [JsonProperty("schemaVersion")] public int SchemaVersion { get; set; }
        [JsonProperty("gameVersion")] public string GameVersion { get; set; }
        [JsonProperty("modelVersion")] public string ModelVersion { get; set; }
        [JsonProperty("fixtures")] public List<BaselineFixture> Fixtures { get; set; }
    }

    public sealed class BaselineFixture
    {
        [JsonProperty("fixture")] public string Fixture { get; set; }
        [JsonProperty("target")] public string Target { get; set; }
        [JsonProperty("tier")] public string Tier { get; set; }
        [JsonProperty("quantities")] public List<BaselineQuantity> Quantities { get; set; }
    }

    public sealed class BaselineQuantity
    {
        [JsonProperty("quantity")] public string Quantity { get; set; }
        [JsonProperty("seed")] public int? Seed { get; set; }
        [JsonProperty("eventCount")] public int EventCount { get; set; }
        [JsonProperty("observedMean")] public double ObservedMean { get; set; }
        [JsonProperty("predictedMean")] public double PredictedMean { get; set; }
        [JsonProperty("meanTolerance")] public double MeanTolerance { get; set; }
        [JsonProperty("predictedLowerBound")] public double PredictedLowerBound { get; set; }
        [JsonProperty("predictedUpperBound")] public double PredictedUpperBound { get; set; }

        /// <summary>Diagnostic evidence retained beside the gate; the drift check does not compare it.</summary>
        [JsonProperty("observedSequence")] public List<double> ObservedSequence { get; set; }
    }

    public sealed class BaselineDrift
    {
        [JsonProperty("fixture")] public string Fixture { get; set; }
        [JsonProperty("quantity")] public string Quantity { get; set; }
        [JsonProperty("field")] public string Field { get; set; }
        [JsonProperty("baseline")] public string Baseline { get; set; }
        [JsonProperty("current")] public string Current { get; set; }
    }

    public sealed class BaselineComparison
    {
        [JsonProperty("passed")] public bool Passed { get; set; }
        [JsonProperty("drift")] public List<BaselineDrift> Drift { get; set; }
    }

    public sealed class GameVersionDifferenceException : ComparisonException
    {
        public string BaselineGameVersion { get; private set; }
        public string CurrentGameVersion { get; private set; }

        public GameVersionDifferenceException(string baselineGameVersion, string currentGameVersion)
            : base(
                "Game version changed from " + baselineGameVersion + " to " + currentGameVersion +
                "; record a reviewed baseline for the new version before comparing quantities.")
        {
            BaselineGameVersion = baselineGameVersion;
            CurrentGameVersion = currentGameVersion;
        }
    }

    public static class VerificationBaselineGate
    {
        public const int SchemaVersion = 1;

        public static VerificationBaseline Capture(IEnumerable<FixtureObservation> observations)
        {
            if (observations == null) throw new ArgumentNullException("observations");
            List<FixtureObservation> fixtures = observations.ToList();
            if (fixtures.Count == 0) throw new ComparisonException("A baseline needs at least one fixture.");
            ComparisonEngine.Compare(fixtures);
            string gameVersion = SingleVersion(fixtures, fixture => fixture.Identity.GameVersion, "game");
            string modelVersion = SingleVersion(fixtures, fixture => fixture.Identity.ModelVersion, "model");
            return new VerificationBaseline
            {
                SchemaVersion = SchemaVersion,
                GameVersion = gameVersion,
                ModelVersion = modelVersion,
                Fixtures = fixtures
                    .OrderBy(fixture => fixture.Identity.Tier, StringComparer.Ordinal)
                    .ThenBy(fixture => fixture.Identity.Fixture, StringComparer.Ordinal)
                    .Select(CaptureFixture)
                    .ToList(),
            };
        }

        public static BaselineComparison Compare(
            VerificationBaseline baseline, IEnumerable<FixtureObservation> currentObservations)
        {
            ValidateBaseline(baseline);
            if (currentObservations == null) throw new ArgumentNullException("currentObservations");
            List<FixtureObservation> current = currentObservations.ToList();
            if (current.Count == 0) throw new ComparisonException("Current run has no fixtures.");
            ComparisonEngine.Compare(current);
            string currentGameVersion = SingleVersion(
                current, fixture => fixture.Identity.GameVersion, "game");
            if (!string.Equals(baseline.GameVersion, currentGameVersion, StringComparison.Ordinal))
                throw new GameVersionDifferenceException(baseline.GameVersion, currentGameVersion);

            VerificationBaseline snapshot = Capture(current);
            List<BaselineDrift> drift = new List<BaselineDrift>();
            CompareText("$baseline", "$fixture-set", "modelVersion", baseline.ModelVersion,
                snapshot.ModelVersion, drift);
            CompareFixtureSets(baseline, snapshot, drift);
            return new BaselineComparison { Passed = drift.Count == 0, Drift = drift };
        }

        /// <summary>
        /// Writes a new baseline only through the update path. The review reason is required so a caller
        /// cannot turn an ordinary comparison run into an automatic rewrite.
        /// </summary>
        public static void WriteReviewedUpdate(
            string path, VerificationBaseline baseline, string reviewReason)
        {
            if (string.IsNullOrWhiteSpace(path)) throw new ArgumentException("Path is required.", "path");
            if (string.IsNullOrWhiteSpace(reviewReason))
                throw new ComparisonException("A reviewed baseline update needs a reason.");
            ValidateBaseline(baseline);
            string fullPath = Path.GetFullPath(path);
            string directory = Path.GetDirectoryName(fullPath);
            if (!Directory.Exists(directory)) Directory.CreateDirectory(directory);
            string temporary = fullPath + ".new";
            File.WriteAllText(temporary, JsonConvert.SerializeObject(baseline, Formatting.Indented) + "\n");
            if (File.Exists(fullPath))
            {
                string backup = fullPath + ".old";
                File.Replace(temporary, fullPath, backup);
                File.Delete(backup);
            }
            else
            {
                File.Move(temporary, fullPath);
            }
        }

        public static VerificationBaseline Read(string path)
        {
            VerificationBaseline baseline = JsonConvert.DeserializeObject<VerificationBaseline>(
                File.ReadAllText(path));
            ValidateBaseline(baseline);
            return baseline;
        }

        private static BaselineFixture CaptureFixture(FixtureObservation fixture)
        {
            Dictionary<string, ObservedQuantity> observed = new Dictionary<string, ObservedQuantity>(
                StringComparer.Ordinal);
            foreach (ObservedQuantity quantity in fixture.Observed)
                observed.Add(quantity.Quantity, quantity);
            return new BaselineFixture
            {
                Fixture = fixture.Identity.Fixture,
                Target = fixture.Identity.Target,
                Tier = fixture.Identity.Tier,
                Quantities = fixture.Predicted
                    .OrderBy(quantity => quantity.Quantity, StringComparer.Ordinal)
                    .Select(prediction =>
                    {
                        List<double> sequence = observed[prediction.Quantity].Values;
                        return new BaselineQuantity
                        {
                            Quantity = prediction.Quantity,
                            Seed = fixture.Identity.Seed,
                            EventCount = fixture.Identity.EventCount,
                            ObservedMean = sequence.Average(),
                            PredictedMean = prediction.Mean,
                            MeanTolerance = prediction.MeanTolerance,
                            PredictedLowerBound = prediction.LowerBound,
                            PredictedUpperBound = prediction.UpperBound,
                            ObservedSequence = new List<double>(sequence),
                        };
                    })
                    .ToList(),
            };
        }

        private static void CompareFixtureSets(
            VerificationBaseline baseline, VerificationBaseline current, List<BaselineDrift> drift)
        {
            Dictionary<string, BaselineFixture> expected = IndexFixtures(baseline.Fixtures);
            Dictionary<string, BaselineFixture> actual = IndexFixtures(current.Fixtures);
            foreach (string fixture in expected.Keys.Union(actual.Keys).OrderBy(value => value))
            {
                BaselineFixture left;
                BaselineFixture right;
                if (!expected.TryGetValue(fixture, out left))
                {
                    AddDrift(fixture, "$fixture", "presence", "missing", "present", drift);
                    continue;
                }
                if (!actual.TryGetValue(fixture, out right))
                {
                    AddDrift(fixture, "$fixture", "presence", "present", "missing", drift);
                    continue;
                }
                CompareText(fixture, "$fixture", "target", left.Target, right.Target, drift);
                CompareText(fixture, "$fixture", "tier", left.Tier, right.Tier, drift);
                CompareQuantitySets(fixture, left, right, drift);
            }
        }

        private static void CompareQuantitySets(
            string fixture, BaselineFixture baseline, BaselineFixture current, List<BaselineDrift> drift)
        {
            Dictionary<string, BaselineQuantity> expected = IndexQuantities(baseline.Quantities);
            Dictionary<string, BaselineQuantity> actual = IndexQuantities(current.Quantities);
            foreach (string quantity in expected.Keys.Union(actual.Keys).OrderBy(value => value))
            {
                BaselineQuantity left;
                BaselineQuantity right;
                if (!expected.TryGetValue(quantity, out left))
                {
                    AddDrift(fixture, quantity, "presence", "missing", "present", drift);
                    continue;
                }
                if (!actual.TryGetValue(quantity, out right))
                {
                    AddDrift(fixture, quantity, "presence", "present", "missing", drift);
                    continue;
                }
                CompareValue(fixture, quantity, "seed", left.Seed, right.Seed, drift);
                CompareValue(fixture, quantity, "eventCount", left.EventCount, right.EventCount, drift);
                CompareValue(fixture, quantity, "observedMean", left.ObservedMean, right.ObservedMean, drift);
                CompareValue(fixture, quantity, "predictedMean", left.PredictedMean, right.PredictedMean, drift);
                CompareValue(fixture, quantity, "meanTolerance", left.MeanTolerance, right.MeanTolerance, drift);
                CompareValue(fixture, quantity, "predictedLowerBound", left.PredictedLowerBound,
                    right.PredictedLowerBound, drift);
                CompareValue(fixture, quantity, "predictedUpperBound", left.PredictedUpperBound,
                    right.PredictedUpperBound, drift);
            }
        }

        private static Dictionary<string, BaselineFixture> IndexFixtures(
            IEnumerable<BaselineFixture> fixtures)
        {
            Dictionary<string, BaselineFixture> result = new Dictionary<string, BaselineFixture>(
                StringComparer.Ordinal);
            foreach (BaselineFixture fixture in fixtures) result.Add(fixture.Fixture, fixture);
            return result;
        }

        private static Dictionary<string, BaselineQuantity> IndexQuantities(
            IEnumerable<BaselineQuantity> quantities)
        {
            Dictionary<string, BaselineQuantity> result = new Dictionary<string, BaselineQuantity>(
                StringComparer.Ordinal);
            foreach (BaselineQuantity quantity in quantities) result.Add(quantity.Quantity, quantity);
            return result;
        }

        private static string SingleVersion(
            IEnumerable<FixtureObservation> fixtures,
            Func<FixtureObservation, string> selector,
            string name)
        {
            List<string> versions = fixtures.Select(selector).Distinct(StringComparer.Ordinal).ToList();
            if (versions.Count != 1 || string.IsNullOrWhiteSpace(versions[0]))
                throw new ComparisonException("A run must contain exactly one " + name + " version.");
            return versions[0];
        }

        private static void ValidateBaseline(VerificationBaseline baseline)
        {
            if (baseline == null) throw new ComparisonException("Baseline is required.");
            if (baseline.SchemaVersion != SchemaVersion)
                throw new ComparisonException("Unsupported baseline schema version " + baseline.SchemaVersion + ".");
            if (string.IsNullOrWhiteSpace(baseline.GameVersion))
                throw new ComparisonException("Baseline game version is required.");
            if (string.IsNullOrWhiteSpace(baseline.ModelVersion))
                throw new ComparisonException("Baseline model version is required.");
            if (baseline.Fixtures == null || baseline.Fixtures.Count == 0)
                throw new ComparisonException("Baseline has no fixtures.");
        }

        private static void CompareText(
            string fixture, string quantity, string field, string baseline, string current,
            List<BaselineDrift> drift)
        {
            if (!string.Equals(baseline, current, StringComparison.Ordinal))
                AddDrift(fixture, quantity, field, baseline, current, drift);
        }

        private static void CompareValue(
            string fixture, string quantity, string field, object baseline, object current,
            List<BaselineDrift> drift)
        {
            if (!object.Equals(baseline, current))
                AddDrift(fixture, quantity, field, FormatValue(baseline), FormatValue(current), drift);
        }

        private static string FormatValue(object value)
        {
            IFormattable formattable = value as IFormattable;
            return formattable != null
                ? formattable.ToString(null, CultureInfo.InvariantCulture)
                : Convert.ToString(value, CultureInfo.InvariantCulture);
        }

        private static void AddDrift(
            string fixture, string quantity, string field, string baseline, string current,
            List<BaselineDrift> drift)
        {
            drift.Add(new BaselineDrift
            {
                Fixture = fixture,
                Quantity = quantity,
                Field = field,
                Baseline = baseline,
                Current = current,
            });
        }
    }
}
