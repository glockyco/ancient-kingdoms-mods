using System;
using System.IO;
using System.Text;
using HotReplCommands.Artifacts;
using Xunit;

namespace HotReplCommands.Tests
{
    public class ArtifactCollectorTests : IDisposable
    {
        private readonly string _exportDir = CreateTempDir();
        private readonly string _screenshotDir = CreateTempDir();

        private static string CreateTempDir()
        {
            var path = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
            Directory.CreateDirectory(path);
            return path;
        }

        public void Dispose()
        {
            Directory.Delete(_exportDir, recursive: true);
            Directory.Delete(_screenshotDir, recursive: true);
        }

        [Fact]
        public void Collect_ProducesDataKeyForEachJsonFile()
        {
            File.WriteAllText(Path.Combine(_exportDir, "monsters.json"), "[{}]");
            File.WriteAllText(Path.Combine(_exportDir, "items.json"), "[{}]");

            var map = ArtifactCollector.Collect(_exportDir, _screenshotDir, includeScreenshots: false);

            Assert.True(map.ContainsKey("data.monsters"), "Expected data.monsters key");
            Assert.True(map.ContainsKey("data.items"),    "Expected data.items key");
        }

        [Fact]
        public void Collect_VisualAssetsManifestHasStableKey()
        {
            File.WriteAllText(Path.Combine(_exportDir, "visual_assets.json"), "{}");

            var map = ArtifactCollector.Collect(_exportDir, _screenshotDir, includeScreenshots: false);

            Assert.True(map.ContainsKey("visual-assets.manifest"));
            Assert.False(map.ContainsKey("data.visual-assets"),
                "Manifest must not also appear under data.*");
        }

        [Fact]
        public void Collect_ArtifactRefHasCorrectSha256AndByteSize()
        {
            var content = Encoding.UTF8.GetBytes("[1,2,3]");
            File.WriteAllBytes(Path.Combine(_exportDir, "monsters.json"), content);

            var map = ArtifactCollector.Collect(_exportDir, _screenshotDir, includeScreenshots: false);
            var art = map["data.monsters"];

            Assert.Equal(content.Length, art.ByteSize);
            Assert.True(art.Finalized);
            Assert.Matches("^[0-9a-f]{64}$", art.Sha256);
        }

        [Fact]
        public void Collect_ScreenshotsIncludedWhenRequested()
        {
            File.WriteAllText(Path.Combine(_screenshotDir, "metadata.json"), "{}");
            File.WriteAllBytes(Path.Combine(_screenshotDir, "world_x000_y000.png"), new byte[]{ 0x89, 0x50 });

            var map = ArtifactCollector.Collect(_exportDir, _screenshotDir, includeScreenshots: true);

            Assert.True(map.ContainsKey("screenshots.metadata"));
            Assert.True(map.ContainsKey("screenshots.world_x000_y000"));
        }

        [Fact]
        public void Collect_ScreenshotsExcludedWhenNotRequested()
        {
            File.WriteAllText(Path.Combine(_screenshotDir, "metadata.json"), "{}");

            var map = ArtifactCollector.Collect(_exportDir, _screenshotDir, includeScreenshots: false);

            Assert.False(map.ContainsKey("screenshots.metadata"));
        }

        [Fact]
        public void Collect_AllArtifactsAreFinalized()
        {
            File.WriteAllText(Path.Combine(_exportDir, "items.json"), "[]");

            var map = ArtifactCollector.Collect(_exportDir, _screenshotDir, includeScreenshots: false);

            foreach (var art in map.Values)
                Assert.True(art.Finalized);
        }
    }
}
