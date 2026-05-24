using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class GameQuitResult
    {
        [JsonProperty("quitting", Required = Required.Always)]
        public bool Quitting { get; set; }
    }
}
