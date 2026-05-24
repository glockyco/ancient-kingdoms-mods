using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class CompendiumExportArgs
    {
        [JsonProperty("screenshots", Required = Required.Always)]
        public bool Screenshots { get; set; }
    }
}
