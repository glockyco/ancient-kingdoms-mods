using Newtonsoft.Json;

namespace HotReplCommands.Dtos
{
    public sealed class ZoneShotsArgs
    {
        /// <summary>Optional absolute focal-point JSON path; defaults to the repository's checked-in file.</summary>
        [JsonProperty("focalPointsPath")]
        public string FocalPointsPath { get; set; }
        /// <summary>Optional zone subset for reviewing compositions before the complete capture.</summary>
        [JsonProperty("zoneIds")]
        public string[] ZoneIds { get; set; }
        /// <summary>Keep creatures in the scene, with their labels and health bars hidden.</summary>
        [JsonProperty("includeCreatures")]
        public bool IncludeCreatures { get; set; } = true;
    }

    public sealed class ZoneShotsResult
    {
        [JsonProperty("count")]
        public int Count { get; set; }
        [JsonProperty("manifestPath")]
        public string ManifestPath { get; set; }
    }

    public sealed class ZoneShotFocalPoint
    {
        public string zone_id { get; set; }
        public float x { get; set; }
        public float y { get; set; }
        public string comment { get; set; }
    }

    public sealed class ZoneShotRecord
    {
        public string zone_id { get; set; }
        public float x { get; set; }
        public float y { get; set; }
        public float camera_size { get; set; }
        public int width { get; set; }
        public int height { get; set; }
        public string captured_at { get; set; }
    }
}
