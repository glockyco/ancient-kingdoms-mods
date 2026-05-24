#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class CompendiumExportResult
    {
        [JsonProperty("ok",             Required = Required.Always)] public bool Ok { get; set; }
        [JsonProperty("durationMs",     Required = Required.Always)] public long DurationMs { get; set; }
        [JsonProperty("exporterCount",  Required = Required.Always)] public int ExporterCount { get; set; }
        [JsonProperty("screenshotCount",Required = Required.AllowNull)] public int? ScreenshotCount { get; set; }
        [JsonProperty("errors",         Required = Required.Always)] public string[] Errors { get; set; }
    }
}
