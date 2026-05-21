using System;
using System.Collections.Generic;
using Newtonsoft.Json;

namespace DataExporter.Models
{
    public sealed class ExportRunResult
    {
        [JsonProperty("schemaVersion")]
        public int SchemaVersion { get; set; } = 1;

        [JsonProperty("ok")]
        public bool Ok { get; set; }

        [JsonProperty("startedAt")]
        public DateTime StartedAt { get; set; }

        [JsonProperty("completedAt")]
        public DateTime CompletedAt { get; set; }

        [JsonProperty("durationMs")]
        public long DurationMs { get; set; }

        [JsonProperty("exporters")]
        public List<ExporterRunResult> Exporters { get; set; } = new();

        [JsonProperty("errors")]
        public List<string> Errors { get; set; } = new();
    }
}
