#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Capture;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CharacterCapture
{
    public sealed class ContainerCapture
    {
        public string ContainerId { get; set; }
        public string State { get; set; }
        public List<CapturedItem> Items { get; set; } = new();
    }

    /// <summary>Builds and validates capture documents without reading game objects.</summary>
    public static class CaptureDocumentBuilder
    {
        public const int CaptureSchemaVersion = 1;
        public const string ModelCompatibility = "1";
        public const string ProducerId = "character-capture";
        public const string ProducerVersion = "1.0.0";

        public static CaptureBuildRecord Build(
            JToken buildData,
            CaptureGameDataIdentity gameData,
            IDictionary<string, string> completeness,
            IEnumerable<ContainerCapture> containerCaptures,
            DateTime capturedAtUtc)
        {
            if (buildData == null) throw new ArgumentNullException(nameof(buildData));
            if (gameData == null) throw new ArgumentNullException(nameof(gameData));
            if (completeness == null) throw new ArgumentNullException(nameof(completeness));
            if (containerCaptures == null) throw new ArgumentNullException(nameof(containerCaptures));

            var containers = containerCaptures.ToList();
            var ownedItems = new List<CapturedItem>();
            foreach (var container in containers)
                ownedItems.AddRange(container.Items);
            var record = new CaptureBuildRecord
            {
                CaptureSchemaVersion = CaptureSchemaVersion,
                Producer = new CaptureProducer
                {
                    Id = ProducerId,
                    Version = ProducerVersion,
                    CapturedAtUtc = capturedAtUtc.ToUniversalTime().ToString("O"),
                },
                GameData = gameData,
                ModelCompatibility = ModelCompatibility,
                BuildData = buildData.DeepClone(),
                Completeness = new Dictionary<string, string>(completeness, StringComparer.Ordinal),
                Containers = containers.Select(container => new CaptureContainer
                {
                    ContainerId = container.ContainerId,
                    State = container.State,
                    EntryCount = container.Items.Count,
                    TotalQuantity = container.Items.Sum(item => item.Quantity),
                }).ToList(),
                OwnedItems = ownedItems,
            };

            var json = JsonConvert.SerializeObject(record, Formatting.Indented);
            return CaptureBuildAdapter.Deserialize(json);
        }
    }
}
