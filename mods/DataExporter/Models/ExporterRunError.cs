#nullable disable

using Newtonsoft.Json;

namespace DataExporter.Models
{
    public sealed class ExporterRunError
    {
        [JsonProperty("kind")]
        public string Kind { get; set; } = "exporter_failed";

        [JsonProperty("message")]
        public string Message { get; set; } = string.Empty;

        [JsonProperty("details", NullValueHandling = NullValueHandling.Ignore)]
        public object Details { get; set; }
    }
}
