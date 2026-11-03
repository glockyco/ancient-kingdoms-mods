using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using Xunit;

namespace BuildTool.Tests;

public class PublishModsCommandTests
{
    private static readonly ProcessResult Ok = new(0, "", "", default);

    [Fact]
    public async Task BuildsTheNewestReleaseTagAndPublishesStableManifestPaths()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        try
        {
            WriteConfig(tempRoot, "BetterBestiary", "better-bestiary", "Better Bestiary");
            var stalePath = Path.Combine(tempRoot, "website", "static", "mods", "OldMod.dll");
            Directory.CreateDirectory(Path.GetDirectoryName(stalePath)!);
            File.WriteAllText(stalePath, "stale-dll");

            var runner = new FakeProcessRunner();
            // A tag with a suffix after the version is no release.
            runner.Enqueue(new ProcessResult(
                0,
                "better-bestiary-v2.3.4\nbetter-bestiary-v2.3.10-rc\nbetter-bestiary-v1.9.9\nbetter-bestiary-v2.3.3\n",
                "",
                default));
            runner.Enqueue(CheckOut("BetterBestiary", ThisAssembly));
            runner.Enqueue(Ok);
            runner.Enqueue(RemoveWorktree());
            var command = new PublishModsCommand(tempRoot, runner);

            var result = await command.RunAsync(new PublishModsCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.Equal(0, result);
            Assert.Equal(4, runner.Calls.Count);
            Assert.Equal(new[] { "tag", "--list", "better-bestiary-v*" }, runner.Calls[0].Arguments);
            var checkout = runner.Calls[1];
            Assert.Equal("git", checkout.Program);
            Assert.Equal("better-bestiary-v2.3.4", checkout.Arguments[4]);
            var worktree = checkout.Arguments[3];
            var build = runner.Calls[2];
            Assert.Equal("dotnet", build.Program);
            Assert.Equal(
                new[] { "build", Path.Combine(worktree, "mods", "BetterBestiary", "BetterBestiary.csproj"), "-c", "Release", "--no-incremental", "-p:ContinuousIntegrationBuild=true" },
                build.Arguments);
            Assert.Equal(new[] { "worktree", "remove", "--force", worktree }, runner.Calls[3].Arguments);

            var publishedDll = Path.Combine(tempRoot, "website", "static", "mods", "BetterBestiary.dll");
            Assert.Equal(File.ReadAllBytes(ThisAssembly), File.ReadAllBytes(publishedDll));
            Assert.False(File.Exists(stalePath));

            var manifestPath = Path.Combine(tempRoot, "website", "static", "mods", "manifest.json");
            using var manifest = JsonDocument.Parse(File.ReadAllText(manifestPath));
            Assert.Equal(2, manifest.RootElement.GetProperty("schemaVersion").GetInt32());
            var mod = Assert.Single(manifest.RootElement.GetProperty("mods").EnumerateArray());
            Assert.Equal("better-bestiary", mod.GetProperty("id").GetString());
            Assert.Equal("Better Bestiary", mod.GetProperty("name").GetString());
            Assert.Equal("2.3.4", mod.GetProperty("version").GetString());
            Assert.Equal("BetterBestiary.dll", mod.GetProperty("fileName").GetString());
            Assert.Equal("/mods/BetterBestiary.dll", mod.GetProperty("downloadPath").GetString());
            Assert.Equal(new FileInfo(publishedDll).Length, mod.GetProperty("sizeBytes").GetInt64());
            Assert.Matches("^[0-9a-f]{64}$", mod.GetProperty("sha256").GetString());
            Assert.False(mod.TryGetProperty("releases", out _));
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task KeepsCurrentDownloadsWhenAModHasNoReleaseTag()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        try
        {
            WriteConfig(tempRoot, "BossTracker", "boss-tracker", "Boss Tracker");
            var currentPath = WriteCurrentDownload(tempRoot, "BossTracker");

            var runner = new FakeProcessRunner();
            runner.Enqueue(Ok);
            var command = new PublishModsCommand(tempRoot, runner);

            var result = await command.RunAsync(new PublishModsCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.NotEqual(0, result);
            Assert.Single(runner.Calls);
            Assert.Equal("current-dll", File.ReadAllText(currentPath));
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    [Fact]
    public async Task KeepsCurrentDownloadsWhenTheTaggedBuildNamesAnotherVersion()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        try
        {
            WriteConfig(tempRoot, "BossTracker", "boss-tracker", "Boss Tracker");
            var currentPath = WriteCurrentDownload(tempRoot, "BossTracker");

            var runner = new FakeProcessRunner();
            // 2.3.10 is newer than the 2.3.4 the DLL names, although it sorts first as text.
            runner.Enqueue(new ProcessResult(0, "boss-tracker-v2.3.10\nboss-tracker-v2.3.4\n", "", default));
            runner.Enqueue(CheckOut("BossTracker", ThisAssembly));
            runner.Enqueue(Ok);
            runner.Enqueue(RemoveWorktree());
            var command = new PublishModsCommand(tempRoot, runner);

            var result = await command.RunAsync(new PublishModsCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.NotEqual(0, result);
            Assert.Equal("boss-tracker-v2.3.10", runner.Calls[1].Arguments[4]);
            Assert.Equal(new[] { "worktree", "remove", "--force", runner.Calls[1].Arguments[3] }, runner.Calls.Last().Arguments);
            Assert.Equal("current-dll", File.ReadAllText(currentPath));
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
            var currentPath = WriteCurrentDownload(tempRoot, "BossTracker");

            var runner = new FakeProcessRunner();
            runner.Enqueue(new ProcessResult(0, "boss-tracker-v2.3.4\n", "", default));
            runner.Enqueue(CheckOut("BossTracker", ThisAssembly));
            runner.Enqueue(new ProcessResult(1, "", "build failed", default));
            runner.Enqueue(RemoveWorktree());
            var command = new PublishModsCommand(tempRoot, runner);

            var result = await command.RunAsync(new PublishModsCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.NotEqual(0, result);
            Assert.Equal(new[] { "worktree", "remove", "--force", runner.Calls[1].Arguments[3] }, runner.Calls.Last().Arguments);
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
            var currentPath = WriteCurrentDownload(tempRoot, "BossTracker");
            var notAnAssembly = Path.Combine(tempRoot, "not-an-assembly.dll");
            File.WriteAllText(notAnAssembly, "not an assembly");

            var runner = new FakeProcessRunner();
            runner.Enqueue(new ProcessResult(0, "boss-tracker-v2.3.4\n", "", default));
            runner.Enqueue(CheckOut("BossTracker", notAnAssembly));
            runner.Enqueue(Ok);
            runner.Enqueue(RemoveWorktree());
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
    public async Task KeepsCurrentDownloadsWhenNewestTagHasNoReleaseChanges()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        try
        {
            WriteConfig(
                tempRoot,
                "BossTracker",
                "boss-tracker",
                "Boss Tracker",
                """[{"version":"2.3.3","changes":["A change."]}]""");
            var currentPath = WriteCurrentDownload(tempRoot, "BossTracker");
            var runner = new FakeProcessRunner();
            runner.Enqueue(new ProcessResult(0, "boss-tracker-v2.3.4\n", "", default));

            var result = await new PublishModsCommand(tempRoot, runner)
                .RunAsync(new PublishModsCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.NotEqual(0, result);
            Assert.Single(runner.Calls);
            Assert.Equal("current-dll", File.ReadAllText(currentPath));
            Assert.Empty(Directory.GetDirectories(Path.Combine(tempRoot, "website", "static"), ".mods-*"));
        }
        finally
        {
            Directory.Delete(tempRoot, recursive: true);
        }
    }

    private static void WriteConfig(string root, string project, string id, string name, string releasesJson = "null")
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
                  "description": "Test description.",
                  "releases": {{releasesJson}}
                }
              ]
            }
            """);
    }

    private static string WriteCurrentDownload(string root, string project)
    {
        var currentPath = Path.Combine(root, "website", "static", "mods", $"{project}.dll");
        Directory.CreateDirectory(Path.GetDirectoryName(currentPath)!);
        File.WriteAllText(currentPath, "current-dll");
        return currentPath;
    }

    // This test assembly carries a MelonInfo attribute naming 2.3.4, so it stands in for a built mod.
    private static string ThisAssembly => typeof(PublishModsCommandTests).Assembly.Location;

    // Stands in for `git worktree add`: the tag's tree with the project and, as if already built, its DLL.
    private static Func<ProcessRequest, System.Threading.CancellationToken, Task<ProcessResult>> CheckOut(string project, string artifact) =>
        (request, _) =>
        {
            var projectDir = Path.Combine(request.Arguments[3], "mods", project);
            var outputDir = Path.Combine(projectDir, "bin", "Release", "net6.0");
            Directory.CreateDirectory(outputDir);
            File.WriteAllText(Path.Combine(projectDir, $"{project}.csproj"), "<Project />");
            File.Copy(artifact, Path.Combine(outputDir, $"{project}.dll"));
            return Task.FromResult(Ok);
        };

    private static Func<ProcessRequest, System.Threading.CancellationToken, Task<ProcessResult>> RemoveWorktree() =>
        (request, _) =>
        {
            Directory.Delete(request.Arguments[3], recursive: true);
            return Task.FromResult(Ok);
        };
}
