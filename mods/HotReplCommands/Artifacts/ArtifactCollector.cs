using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using HotRepl.Control.Artifacts;

namespace HotReplCommands.Artifacts
{
    /// <summary>
    /// Builds the top-level artifact map from known export output files.
    /// Stable key rules from the Phase 3 spec:
    ///   data.{stem}, visual-assets.manifest, visual-assets.image.{rel},
    ///   screenshots.metadata, screenshots.{stem}.
    /// </summary>
    public static class ArtifactCollector
    {
        public static Dictionary<string, ArtifactRef> Collect(
            string exportDir,
            string screenshotDir,
            bool includeScreenshots)
        {
            var map = new Dictionary<string, ArtifactRef>(StringComparer.Ordinal);

            if (Directory.Exists(exportDir))
            {
                foreach (var file in Directory.GetFiles(exportDir, "*.json"))
                {
                    var rawStem = Path.GetFileNameWithoutExtension(file);
                    // Skip visual_assets manifest — covered below with stable key
                    if (string.Equals(rawStem, "visual_assets", StringComparison.OrdinalIgnoreCase))
                        continue;

                    var stem = rawStem.Replace('_', '-').ToLowerInvariant();
                    var key = "data." + stem;
                    map[key] = MakeRef(file, "application/json", key);
                }

                // Visual assets manifest with stable key
                var manifestPath = Path.Combine(exportDir, "visual_assets.json");
                if (File.Exists(manifestPath))
                    map["visual-assets.manifest"] = MakeRef(manifestPath, "application/json", "visual-assets.manifest");
            }

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
        {
            var info = new FileInfo(path);
            var sha = ComputeSha256(path);
            var uri = new Uri(Path.GetFullPath(path)).AbsoluteUri;
            return new ArtifactRef(
                LogicalName: logicalName,
                Uri: uri,
                Path: path,
                ContentType: contentType,
                ByteSize: info.Length,
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
