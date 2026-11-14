#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using HotReplCommands.Dtos;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace HotReplCommands.World
{
    public static class ZoneShotStore
    {
        public static void Validate(ZoneShotFocalFile focal)
        {
            if (focal.SchemaVersion != 2) throw new InvalidDataException("Focal schema_version must be 2.");
            if (focal.Zones == null || focal.Zones.Count == 0) throw new InvalidDataException("Focal zones must not be empty.");
            var ids = new HashSet<string>();
            var artwork = new HashSet<string>();
            foreach (var point in focal.Zones)
            {
                if (point == null || !Segment(point.capture_id) || !Segment(point.zone_id) || !Segment(point.artwork_kind))
                    throw new InvalidDataException("Each focal point requires safe capture_id, zone_id and artwork_kind segments.");
                if (!ids.Add(point.capture_id)) throw new InvalidDataException($"Duplicate capture ID: {point.capture_id}");
                if (!artwork.Add(point.zone_id + "/" + point.artwork_kind)) throw new InvalidDataException("Duplicate zone artwork identity.");
                var mode = point.zone_id == "chambers_of_chaos" ? "procedural_run" :
                    point.zone_id == "temple_of_valaark" ? "suppressed_anchor" : "authored_world";
                if (point.mode != mode) throw new InvalidDataException($"Invalid capture mode for {point.zone_id}: expected {mode}.");
                if (point.mode != "procedural_run" && point.artwork_kind != "shot")
                    throw new InvalidDataException("Only procedural captures support illustration kinds.");
                point.ValidatePosition();
            }
        }

        public static bool Segment(string value) => !string.IsNullOrWhiteSpace(value) && value != "." && value != ".." &&
            value.All(c => c is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or >= '0' and <= '9' or '_' or '-' or '.');

        public static string Digest(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

        private static ZoneShotManifest ReadManifest(string path)
        {
            // Keep timestamps as the capture wrote them. Date parsing would rewrite legacy receipts.
            using var reader = new JsonTextReader(new StringReader(File.ReadAllText(path))) { DateParseHandling = DateParseHandling.None };
            var json = JToken.ReadFrom(reader);
            if (json is not JArray legacy) return json.ToObject<ZoneShotManifest>();
            var manifest = new ZoneShotManifest();
            foreach (var token in legacy)
            {
                if (token is not JObject row || row.Properties().Any(property =>
                    property.Name is "capture_id" or "mode" or "artwork_kind" or "run_seed" or "chamber_index" or "trial_kind" or "room_camera"))
                    throw new InvalidDataException("Only legacy authored-world and Temple records may use the array manifest.");
                var record = row.ToObject<ZoneShotRecord>();
                if (record == null || !Segment(record.zone_id) || record.zone_id == "chambers_of_chaos")
                    throw new InvalidDataException("Legacy procedural records are not valid capture evidence.");
                record.capture_id = record.zone_id;
                record.artwork_kind = "shot";
                record.mode = record.zone_id == "temple_of_valaark" ? "suppressed_anchor" : "authored_world";
                record.image = record.zone_id + ".png";
                record.sha256 = Digest(File.ReadAllBytes(Path.Combine(Path.GetDirectoryName(path), record.image)));
                manifest.captures.Add(record);
            }
            return manifest;
        }

        public static void Merge(string directory, IEnumerable<(ZoneShotRecord Record, byte[] Image)> updates)
        {
            Directory.CreateDirectory(directory);
            var path = Path.Combine(directory, "manifest.json");
            // The manifest is the commit point. Immutable digest-named PNGs preserve earlier receipts if a write fails.
            using var ownership = new FileStream(Path.Combine(directory, ".capture.lock"), FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
            var manifest = File.Exists(path)
                ? ReadManifest(path)
                : new ZoneShotManifest();
            if (manifest == null || manifest.schema_version != 2 || manifest.captures == null)
                throw new InvalidDataException("Capture manifest has an unsupported schema_version or missing captures.");
            var records = new Dictionary<string, ZoneShotRecord>();
            foreach (var record in manifest.captures)
                if (record == null || !Segment(record.capture_id) || !records.TryAdd(record.capture_id, record))
                    throw new InvalidDataException("Capture manifest contains invalid or duplicate capture IDs.");
            var selected = new HashSet<string>();
            foreach (var (record, image) in updates)
            {
                if (!Segment(record.capture_id) || !selected.Add(record.capture_id)) throw new InvalidDataException("Duplicate or invalid capture ID update.");
                record.sha256 = Digest(image);
                record.image = record.capture_id + "_" + record.sha256 + ".png";
                var imagePath = Path.Combine(directory, record.image);
                if (!File.Exists(imagePath)) AtomicWrite(imagePath, image);
                else if (Digest(File.ReadAllBytes(imagePath)) != record.sha256) throw new InvalidDataException("Existing capture image is corrupt.");
                records[record.capture_id] = record;
            }
            if (records.Values.GroupBy(record => (record.zone_id, record.artwork_kind)).Any(group => group.Count() > 1))
                throw new InvalidDataException("Merged capture manifest contains duplicate artwork identities.");
            manifest.captures = records.Values.OrderBy(record => record.capture_id, StringComparer.Ordinal).ToList();
            AtomicWrite(path, System.Text.Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(manifest, Formatting.Indented)));
        }

        private static void AtomicWrite(string path, byte[] bytes)
        {
            var temporary = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
            try
            {
                using (var file = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                { file.Write(bytes); file.Flush(true); }
                File.Move(temporary, path, true);
            }
            finally { if (File.Exists(temporary)) File.Delete(temporary); }
        }
    }
}
