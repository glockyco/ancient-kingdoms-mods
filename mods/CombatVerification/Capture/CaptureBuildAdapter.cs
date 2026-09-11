#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Builds;
using Newtonsoft.Json;

namespace CombatVerification.Capture
{
    /// <summary>Checks capture metadata and container integrity before exposing build contents.</summary>
    public static class CaptureBuildAdapter
    {
        public const int SchemaVersion = 1;

        private static readonly string[] RequiredBuildSections =
        {
            "player",
            "player.attributes",
            "player.skills",
            "player.equipment",
            "companions",
            "consumables",
            "ammunition",
            "learnedBookIds",
        };

        public static CaptureBuildRecord Deserialize(string json)
        {
            var settings = Settings();
            var capture = JsonConvert.DeserializeObject<CaptureBuildRecord>(json, settings);
            var problems = Validate(capture);
            if (problems.Count != 0)
                throw new CaptureBuildException(problems);
            return capture;
        }

        public static LogicalBuildData AdaptComplete(CaptureBuildRecord capture)
        {
            var problems = Validate(capture).ToList();
            if (capture?.Completeness != null)
            {
                foreach (var section in RequiredBuildSections)
                {
                    if (!capture.Completeness.TryGetValue(section, out var state))
                        problems.Add($"capture.completeness.{section} is required");
                    else if (state != "complete")
                        problems.Add($"capture.completeness.{section} is {state}; complete is required");
                }
            }

            if (problems.Count != 0)
                throw new CaptureBuildException(problems);

            LogicalBuildData build;
            try
            {
                build = capture.BuildData.ToObject<LogicalBuildData>(JsonSerializer.Create(Settings()));
            }
            catch (JsonException exception)
            {
                throw new CaptureBuildException(new[] { $"capture.buildData: {exception.Message}" });
            }

            var buildProblems = LogicalBuildAdapter.Validate(build);
            if (buildProblems.Count != 0)
                throw new CaptureBuildException(buildProblems.Select(problem => $"capture.{problem}").ToArray());
            return build;
        }

        public static IReadOnlyList<string> Validate(CaptureBuildRecord capture)
        {
            var problems = new List<string>();
            if (capture == null)
                return new[] { "capture is required" };
            if (capture.CaptureSchemaVersion != SchemaVersion)
                problems.Add($"capture.captureSchemaVersion {capture.CaptureSchemaVersion} is unsupported; expected {SchemaVersion}");

            ValidateProducer(problems, capture.Producer);
            ValidateGameData(problems, capture.GameData);
            Require(problems, "capture.modelCompatibility", capture.ModelCompatibility);
            if (capture.BuildData == null)
                problems.Add("capture.buildData is required");
            ValidateCompleteness(problems, capture.Completeness);
            ValidateContainers(problems, capture.Containers, capture.OwnedItems);
            return problems;
        }

        private static void ValidateProducer(List<string> problems, CaptureProducer producer)
        {
            if (producer == null)
            {
                problems.Add("capture.producer is required");
                return;
            }
            Require(problems, "capture.producer.id", producer.Id);
            Require(problems, "capture.producer.version", producer.Version);
            if (!DateTimeOffset.TryParse(producer.CapturedAtUtc, out _))
                problems.Add("capture.producer.capturedAtUtc must be an ISO-8601 timestamp");
        }

        private static void ValidateGameData(
            List<string> problems, CaptureGameDataIdentity gameData)
        {
            if (gameData == null)
            {
                problems.Add("capture.gameData is required");
                return;
            }
            Require(problems, "capture.gameData.gameVersion", gameData.GameVersion);
            Require(problems, "capture.gameData.steamBuildId", gameData.SteamBuildId);
            Require(problems, "capture.gameData.assemblySha256", gameData.AssemblySha256);
        }

        private static void ValidateCompleteness(
            List<string> problems, IReadOnlyDictionary<string, string> completeness)
        {
            if (completeness == null)
            {
                problems.Add("capture.completeness is required");
                return;
            }
            foreach (var (section, state) in completeness)
            {
                if (string.IsNullOrWhiteSpace(section))
                    problems.Add("capture.completeness contains an empty section name");
                if (state != "complete" && state != "missing" && state != "excluded")
                    problems.Add($"capture.completeness.{section} must be complete, missing, or excluded");
            }
        }

        private static void ValidateContainers(
            List<string> problems,
            IReadOnlyList<CaptureContainer> containers,
            IReadOnlyList<CapturedItem> items)
        {
            if (containers == null)
            {
                problems.Add("capture.containers is required; use an empty list for none");
                return;
            }
            if (items == null)
            {
                problems.Add("capture.ownedItems is required; use an empty list for none");
                return;
            }

            var byId = new Dictionary<string, CaptureContainer>(StringComparer.Ordinal);
            for (var i = 0; i < containers.Count; i++)
            {
                var container = containers[i];
                var path = $"capture.containers[{i}]";
                if (container == null)
                {
                    problems.Add($"{path} is required");
                    continue;
                }
                if (Require(problems, $"{path}.containerId", container.ContainerId)
                    && !byId.TryAdd(container.ContainerId, container))
                    problems.Add($"{path}.containerId duplicates {container.ContainerId}");
                if (container.State != "complete"
                    && container.State != "missing"
                    && container.State != "excluded")
                    problems.Add($"{path}.state must be complete, missing, or excluded");
                if (container.EntryCount < 0)
                    problems.Add($"{path}.entryCount must not be negative");
                if (container.TotalQuantity < 0)
                    problems.Add($"{path}.totalQuantity must not be negative");
            }

            var instanceIds = new HashSet<string>(StringComparer.Ordinal);
            for (var i = 0; i < items.Count; i++)
            {
                var item = items[i];
                var path = $"capture.ownedItems[{i}]";
                if (item == null)
                {
                    problems.Add($"{path} is required");
                    continue;
                }
                if (Require(problems, $"{path}.instanceId", item.InstanceId)
                    && !instanceIds.Add(item.InstanceId))
                    problems.Add($"{path}.instanceId duplicates {item.InstanceId}");
                Require(problems, $"{path}.itemId", item.ItemId);
                Require(problems, $"{path}.containerId", item.ContainerId);
                ValidateOptionalString(problems, $"{path}.itemName", item.ItemName);
                ValidateOptionalString(problems, $"{path}.augmentId", item.AugmentId);
                if (item.Quantity <= 0)
                    problems.Add($"{path}.quantity must be above zero");
                if (item.Slot < 0)
                    problems.Add($"{path}.slot must not be negative");
                if (item.Durability < 0)
                    problems.Add($"{path}.durability must not be negative");
                if (!string.IsNullOrWhiteSpace(item.ContainerId)
                    && !byId.ContainsKey(item.ContainerId))
                    problems.Add($"{path}.containerId names unknown container {item.ContainerId}");
            }

            foreach (var (containerId, container) in byId)
            {
                var captured = items.Where(item => item?.ContainerId == containerId).ToArray();
                var capturedQuantity = captured.Sum(item => item.Quantity);
                if (container.EntryCount != captured.Length)
                    problems.Add($"capture.containers.{containerId}.entryCount does not match ownedItems");
                if (container.TotalQuantity != capturedQuantity)
                    problems.Add($"capture.containers.{containerId}.totalQuantity does not match ownedItems");
                if (container.State != "complete" && captured.Length != 0)
                    problems.Add($"capture.containers.{containerId} is {container.State} but contains ownedItems");
            }
        }

        private static JsonSerializerSettings Settings() => new()
        {
            MissingMemberHandling = MissingMemberHandling.Error,
        };

        private static void ValidateOptionalString(
            List<string> problems, string path, string value)
        {
            if (value != null && string.IsNullOrWhiteSpace(value))
                problems.Add($"{path} must be null or a non-empty string");
        }

        private static bool Require(List<string> problems, string path, string value)
        {
            if (!string.IsNullOrWhiteSpace(value))
                return true;
            problems.Add($"{path} must be a non-empty string");
            return false;
        }
    }

    public sealed class CaptureBuildException : Exception
    {
        public CaptureBuildException(IReadOnlyList<string> problems)
            : base(string.Join("; ", problems))
        {
            Problems = problems;
        }

        public IReadOnlyList<string> Problems { get; }
    }
}
