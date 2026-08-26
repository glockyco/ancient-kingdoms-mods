#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class WorldEnterResult
    {
        [JsonProperty("localPlayerReady", Required = Required.Always)] public bool LocalPlayerReady { get; set; }
        [JsonProperty("scene",            Required = Required.AllowNull)] public string Scene { get; set; }
        [JsonProperty("character",        Required = Required.AllowNull)] public string Character { get; set; }
    }
}
