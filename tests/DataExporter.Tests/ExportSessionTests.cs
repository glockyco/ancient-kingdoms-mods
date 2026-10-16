using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DataExporter.Models;
using DataExporter.Sessions;
using Newtonsoft.Json.Linq;
using Xunit;

namespace DataExporter.Tests;

public sealed class ExportSessionTests : IDisposable
{
    private readonly string _directory = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
    private readonly string _root;
    private readonly string _game;
    private readonly string _steamManifest;

    public ExportSessionTests()
    {
        _root = Path.Combine(_directory, "exported-data");
        _game = Path.Combine(_directory, "steamapps", "common", "Ancient Kingdoms");
        _steamManifest = Path.Combine(_directory, "steamapps", "appmanifest_2241380.acf");
        Directory.CreateDirectory(_game);
        WriteSteamManifest();
    }

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    [Fact]
    public void CatalogRejectsDuplicateIdsBeforeRunningAnyExporter()
    {
        var executed = false;
        var run = ExportSession.Run(_root, _game, _ => new[]
        {
            new ExporterDescriptor("same", new[] { "one.json" }, () => executed = true),
            new ExporterDescriptor("same", new[] { "two.json" }, () => executed = true),
        });
        Assert.False(run.Ok);
        Assert.False(executed);
        Assert.Contains("same", Assert.Single(run.Errors));
        Assert.Empty(run.Exporters);
        Assert.False(File.Exists(Path.Combine(_root, "active-session.json")));
    }

    [Fact]
    public void CatalogRejectsDuplicatePathsEvenWhenCaseDiffers()
    {
        var catalog = new[]
        {
            new ExporterDescriptor("one", new[] { "data.json" }, () => { }),
            new ExporterDescriptor("two", new[] { "DATA.json" }, () => { }),
        };
        Assert.Contains("DATA.json", Assert.Throws<InvalidOperationException>(() => ExporterDescriptor.Validate(catalog)).Message);
    }

    [Theory]
    [InlineData("../escape.json")]
    [InlineData("/absolute.json")]
    [InlineData("images\\escape.png")]
    [InlineData("manifest.json")]
    [InlineData("classes.json")]
    [InlineData("static_data.json")]
    public void CatalogRejectsUnsafeOrReservedOutputs(string path)
    {
        Assert.ThrowsAny<Exception>(() => ExporterDescriptor.Validate(new[]
        {
            new ExporterDescriptor("invalid", new[] { path }, () => { }),
        }));
    }

    [Fact]
    public void CatalogRejectsReferencesFromUndeclaredOutput()
    {
        var descriptor = new ExporterDescriptor("data", new[] { "data.json" }, () => { }, true,
            new ImageReferences("missing.json", "data", json => ImageReferences.ReadFields(json, "path")));
        Assert.Contains("missing.json", Assert.Throws<InvalidOperationException>(() => ExporterDescriptor.Validate(new[] { descriptor })).Message);
    }

    [Fact]
    public void SuccessRecordsCountsHashesProvenanceAndPromotesDirectory()
    {
        var run = Run(staging => new[]
        {
            Write(staging, "rows", "rows.json", "[1,2,3]"),
            Write(staging, "object", "object.json", "{\"answer\":42}"),
            Images(staging, "visualAssets.manifest", "visual_assets.json", "visualAssets", "export_path", "art/pose.png"),
        });
        Assert.True(run.Ok, string.Join(", ", run.Errors));
        Assert.Matches(@"^\d{8}T\d{6}Z-[0-9a-f]{8}$", run.SessionId);
        Assert.Equal(Path.Combine(_root, "sessions", run.SessionId), run.SessionPath);
        Assert.False(Directory.Exists(Path.Combine(_root, "staging", run.SessionId)));
        var manifest = SessionIntegrity.Verify(run.SessionPath);
        Assert.Equal(run.SessionId, manifest.SessionId);
        Assert.Equal(run.StartedAt, manifest.StartedAt);
        Assert.InRange(manifest.CompletedAt, run.StartedAt, run.CompletedAt);
        Assert.Equal("0.9.1", manifest.GameVersion);
        Assert.Equal("en", manifest.Locale);
        Assert.Equal("123456", manifest.SteamBuildId);
        Assert.Equal(3, manifest.Files.Single(file => file.Path == "rows.json").Count);
        Assert.Equal(1, manifest.Files.Single(file => file.Path == "object.json").Count);
        var image = manifest.Files.Single(file => file.Path == "art/pose.png");
        Assert.Null(image.Count);
        Assert.Equal("visualAssets", image.Exporter);
        Assert.DoesNotContain(manifest.Files, file => file.Path == "manifest.json");
        foreach (var file in manifest.Files)
        {
            var path = Path.Combine(run.SessionPath, file.Path);
            Assert.Equal(new FileInfo(path).Length, file.Bytes);
            Assert.Equal(SessionIntegrity.Digest(path), file.Sha256);
        }
        var pointer = JObject.Parse(File.ReadAllText(Path.Combine(_root, "active-session.json")));
        Assert.Equal(run.SessionId, (string?)pointer["session_id"]);
        Assert.Equal("sessions/" + run.SessionId, (string?)pointer["path"]);
        Assert.Empty(Directory.GetFiles(_root, "*.tmp"));
    }

    [Fact]
    public void AchievementReferencesOwnImagesWithoutAssumingAnImageDirectory()
    {
        var run = Run(staging => new[]
        {
            new ExporterDescriptor("achievements", new[] { "achievements.json" }, () =>
            {
                File.WriteAllBytes(Path.Combine(staging, "unlocked.jpg"), new byte[] { 1, 2 });
                File.WriteAllBytes(Path.Combine(staging, "locked.jpg"), new byte[] { 3, 4 });
                File.WriteAllText(Path.Combine(staging, "achievements.json"),
                    "[{\"unlocked_icon_path\":\"unlocked.jpg\",\"locked_icon_path\":\"locked.jpg\"}]");
            }, true, new ImageReferences("achievements.json", "achievements",
                json => ImageReferences.ReadFields(json, "unlocked_icon_path", "locked_icon_path"))),
        });
        Assert.True(run.Ok, string.Join(", ", run.Errors));
        var manifest = SessionIntegrity.Verify(run.SessionPath);
        Assert.Equal(2, manifest.Files.Count(file => file.Exporter == "achievements" && file.Count == null));
    }

    [Fact]
    public void RepeatedReferencesListAnImageOnce()
    {
        var run = Run(staging => new[]
        {
            new ExporterDescriptor("visualAssets.manifest", new[] { "visual_assets.json" }, () =>
            {
                File.WriteAllBytes(Path.Combine(staging, "same.png"), new byte[] { 1 });
                File.WriteAllText(Path.Combine(staging, "visual_assets.json"),
                    "[{\"export_path\":\"same.png\"},{\"export_path\":\"same.png\"}]");
            }, true, new ImageReferences("visual_assets.json", "visualAssets",
                json => ImageReferences.ReadFields(json, "export_path"))),
        });
        Assert.True(run.Ok, string.Join(", ", run.Errors));
        Assert.Single(SessionIntegrity.Verify(run.SessionPath).Files, file => file.Path == "same.png");
    }

    [Fact]
    public void SuccessReplacesPointerAndRetainsOnlyNewAndReplacedSessions()
    {
        var first = Run();
        var second = Run();
        var failed = Run(staging => new[] { new ExporterDescriptor("failed", Array.Empty<string>(), () => throw new IOException("no output")) });
        Assert.False(failed.Ok);
        var orphan = Path.Combine(_root, "sessions", "orphan");
        Directory.CreateDirectory(orphan);
        var screenshot = Path.Combine(_root, "screenshots", "metadata.json");
        Directory.CreateDirectory(Path.GetDirectoryName(screenshot)!);
        File.WriteAllText(screenshot, "{}");
        var third = Run();
        Assert.True(first.Ok && second.Ok && third.Ok);
        Assert.Equal(new[] { second.SessionId, third.SessionId }.OrderBy(id => id),
            Directory.GetDirectories(Path.Combine(_root, "sessions")).Select(Path.GetFileName).OrderBy(id => id));
        Assert.Empty(Directory.GetDirectories(Path.Combine(_root, "staging")));
        Assert.Equal("{}", File.ReadAllText(screenshot));
        Assert.Equal(third.SessionId, (string?)JObject.Parse(File.ReadAllText(Path.Combine(_root, "active-session.json")))["session_id"]);
    }

    [Fact]
    public void ExporterFailureLeavesPreviousSessionAndPointerByteForByteUnchanged()
    {
        var previous = Run();
        var snapshot = Snapshot(previous.SessionPath);
        var pointer = File.ReadAllBytes(Path.Combine(_root, "active-session.json"));
        var failed = Run(staging => new[]
        {
            Write(staging, "early", "early.json", "[42]"),
            new ExporterDescriptor("later", new[] { "later.json" }, () => throw new IOException("later exporter failed")),
        });
        Assert.False(failed.Ok);
        Assert.Equal(Path.Combine(_root, "staging", failed.SessionId), failed.SessionPath);
        Assert.True(File.Exists(Path.Combine(failed.SessionPath, "early.json")));
        Assert.Contains(failed.Exporters, exporter => exporter.Name == "early" && exporter.Ok);
        Assert.Contains(failed.Exporters, exporter => exporter.Name == "later" && !exporter.Ok);
        Assert.Equal(pointer, File.ReadAllBytes(Path.Combine(_root, "active-session.json")));
        AssertSnapshot(snapshot, previous.SessionPath);
        Assert.Single(Directory.GetDirectories(Path.Combine(_root, "sessions")));
    }

    [Theory]
    [InlineData("unowned")]
    [InlineData("missing-json")]
    [InlineData("invalid-json")]
    [InlineData("scalar-json")]
    [InlineData("missing-image")]
    [InlineData("wrong-locale")]
    [InlineData("missing-version")]
    public void IntegrityFailureRefusesPromotionWithoutChangingPreviousSession(string failure)
    {
        var previous = Run();
        var snapshot = Snapshot(previous.SessionPath);
        var pointer = File.ReadAllBytes(Path.Combine(_root, "active-session.json"));
        var run = Run(staging => new[]
        {
            new ExporterDescriptor("broken", new[] { "broken.json" }, () =>
            {
                switch (failure)
                {
                    case "unowned":
                        File.WriteAllText(Path.Combine(staging, "doors.json"), "[]");
                        File.WriteAllText(Path.Combine(staging, "broken.json"), "[]");
                        break;
                    case "invalid-json": File.WriteAllText(Path.Combine(staging, "broken.json"), "["); break;
                    case "scalar-json": File.WriteAllText(Path.Combine(staging, "broken.json"), "1"); break;
                    case "missing-image": File.WriteAllText(Path.Combine(staging, "broken.json"), "[{\"image\":\"missing.png\"}]"); break;
                    case "wrong-locale":
                        File.WriteAllText(Path.Combine(staging, "broken.json"), "[]");
                        File.WriteAllText(Path.Combine(staging, "game_config.json"), "{\"game_version\":\"0.9.1\",\"export_locale\":\"fr\"}");
                        break;
                    case "missing-version":
                        File.WriteAllText(Path.Combine(staging, "broken.json"), "[]");
                        File.WriteAllText(Path.Combine(staging, "game_config.json"), "{\"export_locale\":\"en\"}");
                        break;
                }
            }, true, failure == "missing-image"
                ? new[] { new ImageReferences("broken.json", "broken", json => ImageReferences.ReadFields(json, "image")) }
                : Array.Empty<ImageReferences>()),
        });
        Assert.False(run.Ok);
        Assert.NotEmpty(run.Errors);
        Assert.Equal(pointer, File.ReadAllBytes(Path.Combine(_root, "active-session.json")));
        AssertSnapshot(snapshot, previous.SessionPath);
        Assert.True(Directory.Exists(run.SessionPath));
        Assert.Single(Directory.GetDirectories(Path.Combine(_root, "sessions")));
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("incomplete")]
    [InlineData("update-required")]
    [InlineData("installing")]
    [InlineData("wrong-install")]
    public void UnverifiedSteamProvenanceRefusesPromotion(string state)
    {
        var previous = Run();
        var pointer = File.ReadAllBytes(Path.Combine(_root, "active-session.json"));
        switch (state)
        {
            case "missing": File.Delete(_steamManifest); break;
            case "incomplete": File.WriteAllText(_steamManifest, "\"buildid\" \"123\""); break;
            case "update-required": WriteSteamManifest(6); break;
            case "installing": WriteSteamManifest(1030); break;
            case "wrong-install": WriteSteamManifest(4, "Different Game"); break;
        }
        var run = Run();
        Assert.False(run.Ok);
        Assert.Contains(_steamManifest, Assert.Single(run.Errors));
        Assert.Equal(pointer, File.ReadAllBytes(Path.Combine(_root, "active-session.json")));
        Assert.True(Directory.Exists(previous.SessionPath));
        Assert.True(Directory.Exists(run.SessionPath));
    }

    private ExportRunResult Run(Func<string, ExporterDescriptor[]>? additional = null) =>
        ExportSession.Run(_root, _game, staging => new[]
        {
            Write(staging, "gameConfig", "game_config.json", "{\"game_version\":\"0.9.1\",\"export_locale\":\"en\"}"),
        }.Concat(additional?.Invoke(staging) ?? Array.Empty<ExporterDescriptor>()).ToArray());

    private static ExporterDescriptor Write(string staging, string id, string path, string content) =>
        new(id, new[] { path }, () => File.WriteAllText(Path.Combine(staging, path), content));

    private static ExporterDescriptor Images(string staging, string id, string output, string owner, string field, string image) =>
        new(id, new[] { output }, () =>
        {
            var fullPath = Path.Combine(staging, image);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
            File.WriteAllBytes(fullPath, new byte[] { 1, 2, 3 });
            File.WriteAllText(Path.Combine(staging, output), new JArray(new JObject { [field] = image }).ToString());
        }, true, new ImageReferences(output, owner, json => ImageReferences.ReadFields(json, field)));

    private void WriteSteamManifest(int flags = 4, string install = "Ancient Kingdoms") =>
        File.WriteAllText(_steamManifest, $"\"AppState\"\n{{\n\"installdir\" \"{install}\"\n\"buildid\" \"123456\"\n\"StateFlags\" \"{flags}\"\n}}\n");

    private static Dictionary<string, byte[]> Snapshot(string root) => Directory.GetFiles(root, "*", SearchOption.AllDirectories)
        .ToDictionary(path => Path.GetRelativePath(root, path), File.ReadAllBytes);

    private static void AssertSnapshot(Dictionary<string, byte[]> expected, string root)
    {
        var actual = Snapshot(root);
        Assert.Equal(expected.Keys.OrderBy(path => path), actual.Keys.OrderBy(path => path));
        foreach (var (path, bytes) in expected)
            Assert.Equal(bytes, actual[path]);
    }
}
