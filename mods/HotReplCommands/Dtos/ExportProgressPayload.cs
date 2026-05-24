#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class ExportProgressPayload
    {
        [JsonProperty("phase",   Required = Required.Always)]   public string Phase { get; set; }
        [JsonProperty("message", Required = Required.AllowNull)] public string Message { get; set; }
        [JsonProperty("current", Required = Required.AllowNull)] public int? Current { get; set; }
        [JsonProperty("total",   Required = Required.AllowNull)] public int? Total { get; set; }
    }
}
