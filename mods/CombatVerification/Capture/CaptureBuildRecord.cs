#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace CombatVerification.Capture
{
    /// <summary>Capture-only metadata and raw build contents at the import boundary.</summary>
    public sealed class CaptureBuildRecord
    {
        [JsonProperty("captureSchemaVersion", Required = Required.Always)]
        public int CaptureSchemaVersion { get; set; }

        [JsonProperty("producer", Required = Required.Always)]
        public CaptureProducer Producer { get; set; }

        [JsonProperty("gameData", Required = Required.Always)]
        public CaptureGameDataIdentity GameData { get; set; }

        [JsonProperty("modelCompatibility", Required = Required.Always)]
        public string ModelCompatibility { get; set; }

        /// <summary>
        /// Raw logical-build data. A partial capture remains inspectable until a consumer requests
        /// a complete logical build through the checked adapter.
        /// </summary>
        [JsonProperty("buildData", Required = Required.Always)]
        public JToken BuildData { get; set; }

        [JsonProperty("completeness", Required = Required.Always)]
        public Dictionary<string, string> Completeness { get; set; }

        [JsonProperty("containers", Required = Required.Always)]
        public List<CaptureContainer> Containers { get; set; }

        [JsonProperty("ownedItems", Required = Required.Always)]
        public List<CapturedItem> OwnedItems { get; set; }
    }

    public sealed class CaptureProducer
    {
        [JsonProperty("id", Required = Required.Always)] public string Id { get; set; }
        [JsonProperty("version", Required = Required.Always)] public string Version { get; set; }
        [JsonProperty("capturedAtUtc", Required = Required.Always)] public string CapturedAtUtc { get; set; }
    }

    public sealed class CaptureGameDataIdentity
    {
        [JsonProperty("gameVersion", Required = Required.Always)] public string GameVersion { get; set; }
        [JsonProperty("steamBuildId", Required = Required.Always)] public string SteamBuildId { get; set; }
        [JsonProperty("assemblySha256", Required = Required.Always)] public string AssemblySha256 { get; set; }
    }

    public sealed class CaptureContainer
    {
        [JsonProperty("containerId", Required = Required.Always)] public string ContainerId { get; set; }
        [JsonProperty("state", Required = Required.Always)] public string State { get; set; }
        [JsonProperty("entryCount", Required = Required.Always)] public int EntryCount { get; set; }
        [JsonProperty("totalQuantity", Required = Required.Always)] public int TotalQuantity { get; set; }
    }

    public sealed class CapturedItem
    {
        [JsonProperty("instanceId", Required = Required.Always)] public string InstanceId { get; set; }
        [JsonProperty("itemId", Required = Required.Always)] public string ItemId { get; set; }
        [JsonProperty("itemName", Required = Required.AllowNull)] public string ItemName { get; set; }
        [JsonProperty("quantity", Required = Required.Always)] public int Quantity { get; set; }
        [JsonProperty("containerId", Required = Required.Always)] public string ContainerId { get; set; }
        [JsonProperty("slot", Required = Required.AllowNull)] public int? Slot { get; set; }
        [JsonProperty("augmentId", Required = Required.AllowNull)] public string AugmentId { get; set; }
        [JsonProperty("durability", Required = Required.AllowNull)] public int? Durability { get; set; }
    }
}
