#nullable disable
using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class WorldSummaryResult
    {
        [JsonProperty("scene",           Required = Required.AllowNull)] public string Scene { get; set; }
        [JsonProperty("networkState",    Required = Required.AllowNull)] public string NetworkState { get; set; }
        [JsonProperty("characterCount",  Required = Required.AllowNull)] public int? CharacterCount { get; set; }
        [JsonProperty("selectedChar",    Required = Required.AllowNull)] public string SelectedChar { get; set; }
        [JsonProperty("localPlayerReady",Required = Required.Always)]   public bool LocalPlayerReady { get; set; }
    }
}
