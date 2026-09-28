#nullable disable

using Newtonsoft.Json;

namespace DataExporter.Models
{
    public sealed class ExporterRunResult
    {
        [JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [JsonProperty("ok")]
        public bool Ok { get; set; }

        [JsonProperty("error", NullValueHandling = NullValueHandling.Ignore)]
        public ExporterRunError Error { get; set; }
    }
}
