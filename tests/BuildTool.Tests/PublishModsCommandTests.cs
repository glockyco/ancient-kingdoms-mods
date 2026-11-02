using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using Xunit;

namespace BuildTool.Tests;

public class PublishModsCommandTests
{
    [Fact]
    public async Task BuildsOnlyConfiguredModsAndPublishesStableManifestPaths()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        try
        {
            WriteConfig(tempRoot, "BetterBestiary", "better-bestiary", "Better Bestiary");
            var projectPath = CreateProjectAndArtifact(tempRoot, "BetterBestiary");
            var stalePath = Path.Combine(
                tempRoot,
                "website",
                "static",
                "mods",
                "OldMod.dll");
            Directory.CreateDirectory(Path.GetDirectoryName(stalePath)!);
            File.WriteAllText(stalePath, "stale-dll");

            var runner = new FakeProcessRunner();
            runner.Enqueue(new ProcessResult(0, "", "", default));
            var command = new PublishModsCommand(tempRoot, runner);

            var result = await command.RunAsync(new PublishModsCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.Equal(0, result);
            var call = Assert.Single(runner.Calls);
            Assert.Equal("dotnet", call.Program);
            Assert.Equal(
                new[] { "build", projectPath, "-c", "Release", "--no-incremental" },
                call.Arguments);

            var publishedDll = Path.Combine(
                tempRoot,
                "website",
                "static",
                "mods",
                "BetterBestiary.dll");
            Assert.Equal(File.ReadAllBytes(ThisAssembly), File.ReadAllBytes(publishedDll));
            Assert.False(File.Exists(stalePath));

            var manifestPath = Path.Combine(
                tempRoot,
                "website",
                "static",
                "mods",
                "manifest.json");
            using var manifest = JsonDocument.Parse(File.ReadAllText(manifestPath));
            Assert.Equal(1, manifest.RootElement.GetProperty("schemaVersion").GetInt32());
            var mod = Assert.Single(manifest.RootElement.GetProperty("mods").EnumerateArray());
            Assert.Equal("better-bestiary", mod.GetProperty("id").GetString());
            Assert.Equal("Better Bestiary", mod.GetProperty("name").GetString());
            Assert.Equal("2.3.4", mod.GetProperty("version").GetString());
            Assert.Equal("BetterBestiary.dll", mod.GetProperty("fileName").GetString());
            Assert.Equal(
                "/mods/BetterBestiary.dll",
                mod.GetProperty("downloadPath").GetString());
            Assert.Equal(new FileInfo(publishedDll).Length, mod.GetProperty("sizeBytes").GetInt64());
            Assert.Matches("^[0-9a-f]{64}$", mod.GetProperty("sha256").GetString());
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task KeepsCurrentDownloadsWhenConfiguredBuildFails()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        try
        {
            WriteConfig(tempRoot, "BossTracker", "boss-tracker", "Boss Tracker");
            CreateProjectAndArtifact(tempRoot, "BossTracker");
            var currentPath = Path.Combine(
                tempRoot,
                "website",
                "static",
                "mods",
                "BossTracker.dll");
            Directory.CreateDirectory(Path.GetDirectoryName(currentPath)!);
            File.WriteAllText(currentPath, "current-dll");

            var runner = new FakeProcessRunner();
            runner.Enqueue(new ProcessResult(1, "", "build failed", default));
            var command = new PublishModsCommand(tempRoot, runner);

            var result = await command.RunAsync(new PublishModsCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.NotEqual(0, result);
            Assert.Equal("current-dll", File.ReadAllText(currentPath));
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task KeepsCurrentDownloadsWhenABuiltModNamesNoVersion()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        try
        {
            WriteConfig(tempRoot, "BossTracker", "boss-tracker", "Boss Tracker");
            var projectPath = CreateProjectAndArtifact(tempRoot, "BossTracker");
            File.WriteAllText(Path.Combine(Path.GetDirectoryName(projectPath)!, "bin", "Release", "net6.0", "BossTracker.dll"), "not an assembly");
            var currentPath = Path.Combine(tempRoot, "website", "static", "mods", "BossTracker.dll");
            Directory.CreateDirectory(Path.GetDirectoryName(currentPath)!);
            File.WriteAllText(currentPath, "current-dll");

            var runner = new FakeProcessRunner();
            runner.Enqueue(new ProcessResult(0, "", "", default));
            var command = new PublishModsCommand(tempRoot, runner);

            var result = await command.RunAsync(new PublishModsCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.NotEqual(0, result);
            Assert.Equal("current-dll", File.ReadAllText(currentPath));
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    private static void WriteConfig(string root, string project, string id, string name)
    {
        var websiteDir = Path.Combine(root, "website");
        Directory.CreateDirectory(websiteDir);
        File.WriteAllText(
            Path.Combine(websiteDir, "mod-downloads.json"),
            $$"""
            {
              "schemaVersion": 1,
              "mods": [
                {
                  "id": "{{id}}",
                  "project": "{{project}}",
                  "name": "{{name}}",
                  "description": "Test description."
                }
              ]
            }
            """);
    }

    // This test assembly carries a MelonInfo attribute, so it stands in for a built mod.
    private static string ThisAssembly => typeof(PublishModsCommandTests).Assembly.Location;

    private static string CreateProjectAndArtifact(string root, string project)
    {
        var projectDir = Path.Combine(root, "mods", project);
        Directory.CreateDirectory(projectDir);
        var projectPath = Path.Combine(projectDir, $"{project}.csproj");
        File.WriteAllText(projectPath, "<Project />");

        var outputDir = Path.Combine(projectDir, "bin", "Release", "net6.0");
        Directory.CreateDirectory(outputDir);
        File.Copy(ThisAssembly, Path.Combine(outputDir, $"{project}.dll"));
        return projectPath;
    }
}
