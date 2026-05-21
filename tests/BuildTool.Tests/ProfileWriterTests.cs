using System.IO;
using System.Text.Json;
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class ProfileWriterTests
{
    [Fact]
    public void Upsert_CreatesProfileFileWhenAbsent()
    {
        var path = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());

        ProfileWriter.Upsert(path, profileName: "ancient-kingdoms", url: "ws://127.0.0.1:18590",
            authSource: "env", authName: "HOTREPL_TOKEN");

        var doc = JsonDocument.Parse(File.ReadAllText(path));
        var profile = doc.RootElement.GetProperty("profiles").GetProperty("ancient-kingdoms");
        Assert.Equal("ws://127.0.0.1:18590", profile.GetProperty("url").GetString());
        Assert.Equal("env", profile.GetProperty("auth").GetProperty("source").GetString());
        Assert.Equal("HOTREPL_TOKEN", profile.GetProperty("auth").GetProperty("name").GetString());
        File.Delete(path);
    }

    [Fact]
    public void Upsert_PreservesOtherProfiles()
    {
        var path = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        File.WriteAllText(path, """
            {
              "schemaVersion": 1,
              "profiles": {
                "other": { "url": "ws://example/" }
              }
            }
            """);

        ProfileWriter.Upsert(path, profileName: "ancient-kingdoms", url: "ws://127.0.0.1:18590",
            authSource: "env", authName: "HOTREPL_TOKEN");

        var doc = JsonDocument.Parse(File.ReadAllText(path));
        var profiles = doc.RootElement.GetProperty("profiles");
        Assert.True(profiles.TryGetProperty("other", out _));
        Assert.True(profiles.TryGetProperty("ancient-kingdoms", out _));
        File.Delete(path);
    }

    [Fact]
    public void Upsert_ReplacesExistingEntry()
    {
        var path = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());
        File.WriteAllText(path, """
            {
              "schemaVersion": 1,
              "profiles": {
                "ancient-kingdoms": { "url": "ws://old/" }
              }
            }
            """);

        ProfileWriter.Upsert(path, profileName: "ancient-kingdoms", url: "ws://new/",
            authSource: "env", authName: "HOTREPL_TOKEN");

        var doc = JsonDocument.Parse(File.ReadAllText(path));
        var profile = doc.RootElement.GetProperty("profiles").GetProperty("ancient-kingdoms");
        Assert.Equal("ws://new/", profile.GetProperty("url").GetString());
        File.Delete(path);
    }
}
