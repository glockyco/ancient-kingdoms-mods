#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class PreflightResult
    {
        [JsonProperty("ready",                Required = Required.Always)] public bool Ready { get; set; }
        [JsonProperty("exportDirExists",      Required = Required.Always)] public bool ExportDirExists { get; set; }
        [JsonProperty("screenshotDirExists",  Required = Required.Always)] public bool ScreenshotDirExists { get; set; }
        [JsonProperty("dataExporterFound",    Required = Required.Always)] public bool DataExporterFound { get; set; }
        [JsonProperty("mapScreenshotterFound",Required = Required.Always)] public bool MapScreenshotterFound { get; set; }
        [JsonProperty("scene",                Required = Required.AllowNull)] public string Scene { get; set; }
        [JsonProperty("localPlayerReady",     Required = Required.Always)] public bool LocalPlayerReady { get; set; }
    }
}
