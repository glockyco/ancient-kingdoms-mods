using Newtonsoft.Json;
using System.Collections.Generic;

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
        /// <summary>Optional preview override for every zone's configured native gameplay frame scale.</summary>
        [JsonProperty("frameScale")]
        public double? FrameScale { get; set; }
    }

    public sealed class ZoneShotsResult
    {
        [JsonProperty("count")]
        public int Count { get; set; }
        [JsonProperty("manifestPath")]
        public string ManifestPath { get; set; }
    }

    public sealed class ZoneShotFocalFile
    {
        [JsonProperty("frame_scale", Required = Required.Always)]
        public double FrameScale { get; set; }
        [JsonProperty("zones", Required = Required.Always)]
        public List<ZoneShotFocalPoint> Zones { get; set; }
    }

    public sealed class ZoneShotFocalPoint
    {
        public string zone_id { get; set; }
        public float x { get; set; }
        public float y { get; set; }
        public string comment { get; set; }
        [JsonProperty("frame_scale", Required = Required.DisallowNull, NullValueHandling = NullValueHandling.Ignore)]
        public double? FrameScale { get; set; }
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
