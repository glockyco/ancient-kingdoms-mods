#nullable disable

using System;
using System.IO;
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
        /// <summary>Select individual primary or illustration records without erasing previous captures.</summary>
        [JsonProperty("captureIds")]
        public string[] CaptureIds { get; set; }
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
        [JsonProperty("schema_version", Required = Required.Always)]
        public int SchemaVersion { get; set; }
        [JsonProperty("frame_scale", Required = Required.Always)]
        public double FrameScale { get; set; }
        [JsonProperty("zones", Required = Required.Always)]
        public List<ZoneShotFocalPoint> Zones { get; set; }
    }

    public sealed class ZoneShotFocalPoint
    {
        public string zone_id { get; set; }
        public string capture_id { get; set; }
        public string mode { get; set; }
        public string artwork_kind { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public int? chamber_index { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public float[] room_camera { get; set; }
        [JsonProperty(Required = Required.DisallowNull, NullValueHandling = NullValueHandling.Ignore)]
        public float? x { get; set; }
        [JsonProperty(Required = Required.DisallowNull, NullValueHandling = NullValueHandling.Ignore)]
        public float? y { get; set; }
        [JsonProperty(Required = Required.DisallowNull, NullValueHandling = NullValueHandling.Ignore)]
        public Dictionary<string, string> anchor { get; set; }
        [JsonProperty(Required = Required.DisallowNull, NullValueHandling = NullValueHandling.Ignore)]
        public float[] offset { get; set; }
        public string comment { get; set; }
        [JsonProperty("frame_scale", Required = Required.DisallowNull, NullValueHandling = NullValueHandling.Ignore)]
        public double? FrameScale { get; set; }

        /// <summary>Keep withheld positions out of both focal files and capture manifests.</summary>
        public void ValidatePosition()
        {
            if (mode == "procedural_run")
            {
                if (zone_id != "chambers_of_chaos" || x.HasValue || y.HasValue || anchor != null || offset != null ||
                    chamber_index is not (>= 0 and <= 2) || room_camera == null || room_camera.Length != 2 ||
                    !float.IsFinite(room_camera[0]) || !float.IsFinite(room_camera[1]))
                    throw new InvalidDataException("Procedural framing requires Chambers, chamber 0 to 2 and two finite room_camera values, without world coordinates.");
                return;
            }
            if (zone_id == "chambers_of_chaos" || chamber_index.HasValue || room_camera != null)
                throw new InvalidDataException("Chambers requires procedural_run framing. Other modes forbid procedural fields.");
            if (zone_id == "temple_of_valaark")
            {
                if (x.HasValue || y.HasValue)
                    throw new InvalidDataException($"Suppressed zone forbids absolute coordinates: {zone_id}");
                if (anchor == null || anchor.Count != 1 || !anchor.TryGetValue("monster", out var id) ||
                    string.IsNullOrWhiteSpace(id))
                    throw new InvalidDataException($"Suppressed zone requires one monster anchor: {zone_id}");
                if (offset != null && (offset.Length != 2 || !float.IsFinite(offset[0]) || !float.IsFinite(offset[1])))
                    throw new InvalidDataException($"Anchor offset requires two finite numbers: {zone_id}");
            }
            else if (anchor != null || offset != null || !x.HasValue || !y.HasValue ||
                !float.IsFinite(x.Value) || !float.IsFinite(y.Value))
                throw new InvalidDataException($"Normal zone requires absolute coordinates without anchor or offset: {zone_id}");
        }
    }

    public sealed class ZoneShotRecord
    {
        public string zone_id { get; set; }
        public string capture_id { get; set; }
        public string mode { get; set; }
        public string artwork_kind { get; set; }
        public string image { get; set; }
        public string sha256 { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public int? run_seed { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public int? chamber_index { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public string trial_kind { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public float[] room_camera { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public float? x { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public float? y { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public Dictionary<string, string> anchor { get; set; }
        [JsonProperty(NullValueHandling = NullValueHandling.Ignore)]
        public float[] offset { get; set; }
        public float camera_size { get; set; }
        public int width { get; set; }
        public int height { get; set; }
        public string captured_at { get; set; }
    }

    public sealed class ZoneShotManifest
    {
        [JsonProperty(Required = Required.Always)]
        public int schema_version { get; set; } = 2;
        [JsonProperty(Required = Required.Always)]
        public List<ZoneShotRecord> captures { get; set; } = new();
    }
}
