using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using DataExporter.Sessions;
using HotRepl.Control.Artifacts;

namespace HotReplCommands.Artifacts
{
    /// <summary>
    /// Builds finalized artifacts from a verified runtime session and separate screenshots.
    /// </summary>
    public static class ArtifactCollector
    {
        public static Dictionary<string, ArtifactRef> Collect(
            string sessionPath,
            string screenshotDir,
            bool includeScreenshots)
        {
            var map = new Dictionary<string, ArtifactRef>(StringComparer.Ordinal);

            var manifest = SessionIntegrity.Verify(sessionPath);
            foreach (var file in manifest.Files)
            {
                var path = SessionIntegrity.ResolvePath(sessionPath, file.Path);
                string key;
                string contentType;
                if (string.Equals(file.Path, "visual_assets.json", StringComparison.Ordinal))
                {
                    key = "visual-assets.manifest";
                    contentType = "application/json";
                }
                else if (string.Equals(Path.GetExtension(file.Path), ".json", StringComparison.Ordinal))
                {
                    key = "data." + Path.GetFileNameWithoutExtension(file.Path)
                        .Replace('_', '-').ToLowerInvariant();
                    contentType = "application/json";
                }
                else
                {
                    key = "visual-assets.image." + file.Path;
                    contentType = Path.GetExtension(file.Path).ToLowerInvariant() switch
                    {
                        ".jpg" or ".jpeg" => "image/jpeg",
                        ".png" => "image/png",
                        _ => throw new InvalidDataException($"Unsupported session image '{file.Path}'."),
                    };
                }

                if (!map.TryAdd(key, MakeRef(path, contentType, key, file.Bytes, file.Sha256)))
                    throw new InvalidDataException($"Session files produce duplicate artifact key '{key}'.");
            }

            const string manifestKey = "session.manifest";
            map.Add(manifestKey, MakeRef(
                Path.Combine(sessionPath, "manifest.json"), "application/json", manifestKey));

            if (includeScreenshots && Directory.Exists(screenshotDir))
            {
                var metaPath = Path.Combine(screenshotDir, "metadata.json");
                if (File.Exists(metaPath))
                    map["screenshots.metadata"] = MakeRef(metaPath, "application/json", "screenshots.metadata");

                foreach (var file in Directory.GetFiles(screenshotDir, "*.png"))
                {
                    var stem = Path.GetFileNameWithoutExtension(file).ToLowerInvariant();
                    var key = "screenshots." + stem;
                    map[key] = MakeRef(file, "image/png", key);
                }
            }

            return map;
        }

        private static ArtifactRef MakeRef(string path, string contentType, string logicalName)
            => MakeRef(path, contentType, logicalName, new FileInfo(path).Length, ComputeSha256(path));

        private static ArtifactRef MakeRef(
            string path, string contentType, string logicalName, long bytes, string sha)
        {
            var uri = new Uri(Path.GetFullPath(path)).AbsoluteUri;
            return new ArtifactRef(
                LogicalName: logicalName,
                Uri: uri,
                Path: path,
                ContentType: contentType,
                ByteSize: bytes,
                Sha256: sha,
                Finalized: true);
        }

        private static string ComputeSha256(string path)
        {
            using (var sha = SHA256.Create())
            using (var stream = File.OpenRead(path))
            {
                var hash = sha.ComputeHash(stream);
                return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
        }
    }
}
