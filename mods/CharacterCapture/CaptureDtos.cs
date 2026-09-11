#nullable disable
using System.Collections.Generic;
using Newtonsoft.Json;

namespace CharacterCapture
{
    public sealed class CharacterCaptureResult
    {
        [JsonProperty("path")] public string Path { get; set; }
        [JsonProperty("captureSchemaVersion")] public int CaptureSchemaVersion { get; set; }
        [JsonProperty("complete")] public bool Complete { get; set; }
        [JsonProperty("missingSections")] public string[] MissingSections { get; set; }
    }

    public sealed class MeterCaptureResult
    {
        [JsonProperty("capturedAtUtc")] public string CapturedAtUtc { get; set; }
        [JsonProperty("denominator")] public string Denominator { get; set; }
        [JsonProperty("meters")] public List<EntityMeterCapture> Meters { get; set; }
    }

    public sealed class EntityMeterCapture
    {
        [JsonProperty("entityId")] public string EntityId { get; set; }
        [JsonProperty("kind")] public string Kind { get; set; }
        [JsonProperty("damageTotal")] public long DamageTotal { get; set; }
        [JsonProperty("healingTotal")] public long HealingTotal { get; set; }
        [JsonProperty("activeSeconds")] public double ActiveSeconds { get; set; }
        [JsonProperty("firstActionServerTime")] public double? FirstActionServerTime { get; set; }
        [JsonProperty("lastActionServerTime")] public double? LastActionServerTime { get; set; }
        [JsonProperty("elapsedWindowSeconds")] public double? ElapsedWindowSeconds { get; set; }
        [JsonProperty("eventCount")] public int? EventCount { get; set; }
    }
}
