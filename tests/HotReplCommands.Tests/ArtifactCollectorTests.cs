using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using HotReplCommands.Artifacts;
using Newtonsoft.Json.Linq;
using Xunit;

namespace HotReplCommands.Tests
{
    public class ArtifactCollectorTests : IDisposable
    {
        private const string SessionId = "20261016T231500Z-1a2b3c4d";
        private readonly string _exportDir = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        private readonly JArray _files = new();
        private readonly JObject _manifest;
        private string SessionPath => Path.Combine(_exportDir, "sessions", SessionId);
        private string ScreenshotPath => Path.Combine(_exportDir, "screenshots");

        public ArtifactCollectorTests()
        {
            Directory.CreateDirectory(SessionPath);
            Directory.CreateDirectory(ScreenshotPath);
            _manifest = new JObject
            {
                ["schema_version"] = 1,
                ["session_id"] = SessionId,
                ["started_at"] = "2026-10-16T23:15:00Z",
                ["completed_at"] = "2026-10-16T23:16:00Z",
                ["game_version"] = "1.0.0",
                ["locale"] = "en",
                ["steam_build_id"] = "12345678",
                ["files"] = _files,
            };
            AddJson("game_config.json", "{\"game_version\":\"1.0.0\",\"export_locale\":\"en\"}");
        }

        public void Dispose() => Directory.Delete(_exportDir, recursive: true);

        private string AddJson(string path, string json)
            => AddFile(path, Encoding.UTF8.GetBytes(json), JToken.Parse(json) is JArray rows ? rows.Count : 1);

        private string AddFile(string relativePath, byte[] content, long? count)
        {
            var path = Path.Combine(SessionPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllBytes(path, content);
            _files.Add(new JObject
            {
                ["path"] = relativePath,
                ["exporter"] = count == null ? "visualAssets" : Path.GetFileNameWithoutExtension(relativePath),
                ["bytes"] = content.LongLength,
                ["count"] = count.HasValue ? new JValue(count.Value) : JValue.CreateNull(),
                ["sha256"] = Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant(),
            });
            return path;
        }

        private void WriteManifest()
            => File.WriteAllText(Path.Combine(SessionPath, "manifest.json"), _manifest.ToString());

        [Fact]
        public void Collect_UsesOnlySelectedSessionAndStableKeys()
        {
            var combat = AddJson("classes_combat.json", "[{\"id\":\"fighter\"}]");
            AddJson("visual_assets.json", "[]");
            WriteManifest();
            File.WriteAllText(Path.Combine(_exportDir, "doors.json"), "[]");
            File.WriteAllText(Path.Combine(_exportDir, "static_data.json"), "{}");
            var oldSession = Path.Combine(_exportDir, "sessions", "20261015T231500Z-12345678");
            Directory.CreateDirectory(oldSession);
            File.WriteAllText(Path.Combine(oldSession, "interactive_objects.json"), "[]");

            var map = ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false);

            Assert.Equal(new[] { "data.classes-combat", "data.game-config", "session.manifest", "visual-assets.manifest" },
                map.Keys.OrderBy(key => key).ToArray());
            Assert.Equal(combat, map["data.classes-combat"].Path);
            Assert.Equal(Path.Combine(SessionPath, "manifest.json"), map["session.manifest"].Path);
            Assert.All(map.Values, artifact => Assert.True(artifact.Finalized));
        }

        [Fact]
        public void Collect_RejectsUnlistedSessionFile()
        {
            WriteManifest();
            File.WriteAllText(Path.Combine(SessionPath, "doors.json"), "[]");

            var error = Assert.Throws<InvalidDataException>(() =>
                ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false));

            Assert.Contains("doors.json", error.Message);
        }

        [Fact]
        public void Collect_RejectsMissingListedFile()
        {
            var path = AddJson("monsters.json", "[]");
            WriteManifest();
            File.Delete(path);

            var error = Assert.Throws<FileNotFoundException>(() =>
                ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false));

            Assert.Contains("monsters.json", error.Message);
        }

        [Theory]
        [InlineData("[2]")]
        [InlineData("[1,2]")]
        public void Collect_RejectsDigestOrSizeMismatch(string replacement)
        {
            var path = AddJson("monsters.json", "[1]");
            WriteManifest();
            File.WriteAllText(path, replacement);

            var error = Assert.Throws<InvalidDataException>(() =>
                ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false));

            Assert.Contains("monsters.json", error.Message);
        }

        [Theory]
        [InlineData("schema_version", "2")]
        [InlineData("locale", "fr")]
        [InlineData("session_id", "20261016T231500Z-87654321")]
        public void Collect_RejectsInvalidSessionMetadata(string field, string value)
        {
            _manifest[field] = field == "schema_version" ? new JValue(int.Parse(value)) : new JValue(value);
            WriteManifest();

            var error = Assert.Throws<InvalidDataException>(() =>
                ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false));

            Assert.Contains(value, error.Message);
        }

        [Theory]
        [InlineData("classes.json")]
        [InlineData("static_data.json")]
        public void Collect_RejectsCuratedInputsInRuntimeManifest(string path)
        {
            AddJson(path, "{}");
            WriteManifest();

            var error = Assert.Throws<InvalidDataException>(() =>
                ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false));

            Assert.Contains(path, error.Message);
        }

        [Fact]
        public void Collect_RequiresSessionManifestWithoutFlatFallback()
        {
            File.WriteAllText(Path.Combine(_exportDir, "monsters.json"), "[]");

            Assert.ThrowsAny<IOException>(() =>
                ArtifactCollector.Collect(_exportDir, ScreenshotPath, includeScreenshots: false));
        }

        [Fact]
        public void Collect_ReportsVerifiedImageIntegrity()
        {
            const string relativePath = "images/monster/primary/goblin.png";
            var bytes = new byte[] { 0x89, 0x50, 0x4e, 0x47 };
            var path = AddFile(relativePath, bytes, null);
            AddJson("visual_assets.json", "[{\"domain\":\"monster\",\"entity_id\":\"goblin\",\"kind\":\"primary\",\"export_path\":\"" + relativePath + "\"}]");
            WriteManifest();

            var map = ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false);
            var artifact = map["visual-assets.image." + relativePath];

            Assert.Equal(path, artifact.Path);
            Assert.Equal(new Uri(path).AbsoluteUri, artifact.Uri);
            Assert.Equal("image/png", artifact.ContentType);
            Assert.Equal(bytes.LongLength, artifact.ByteSize);
            Assert.Equal(Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant(), artifact.Sha256);
        }

        [Fact]
        public void Collect_AchievementImagesUseJpegContentType()
        {
            const string relativePath = "icons/unlocked.jpg";
            AddFile(relativePath, new byte[] { 1, 2, 3 }, null);
            AddJson("achievements.json", "[{\"unlocked_icon_path\":\"" + relativePath + "\"}]");
            WriteManifest();

            var map = ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false);

            Assert.Equal("image/jpeg", map["visual-assets.image." + relativePath].ContentType);
        }

        [Fact]
        public void Collect_RejectsChangedListedImage()
        {
            var path = AddFile("images/monster/goblin.png", new byte[] { 1, 2, 3 }, null);
            WriteManifest();
            File.WriteAllBytes(path, new byte[] { 3, 2, 1 });

            var error = Assert.Throws<InvalidDataException>(() =>
                ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots: false));

            Assert.Contains("goblin.png", error.Message);
        }

        [Theory]
        [InlineData(false)]
        [InlineData(true)]
        public void Collect_ScreenshotsStayOutsideSession(bool includeScreenshots)
        {
            WriteManifest();
            var metadata = Path.Combine(ScreenshotPath, "metadata.json");
            var image = Path.Combine(ScreenshotPath, "world_x000_y000.png");
            File.WriteAllText(metadata, "{}");
            File.WriteAllBytes(image, new byte[] { 0x89, 0x50 });

            var map = ArtifactCollector.Collect(SessionPath, ScreenshotPath, includeScreenshots);

            Assert.Equal(includeScreenshots, map.ContainsKey("screenshots.metadata"));
            Assert.Equal(includeScreenshots, map.ContainsKey("screenshots.world_x000_y000"));
            if (includeScreenshots)
            {
                Assert.Equal(metadata, map["screenshots.metadata"].Path);
                Assert.Equal(image, map["screenshots.world_x000_y000"].Path);
            }
        }
    }
}
