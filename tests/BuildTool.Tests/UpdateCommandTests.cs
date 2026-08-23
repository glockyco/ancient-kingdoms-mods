using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using BuildTool.Game;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

public class UpdateCommandTests
{
    private const string AppId = "2241380";

    [Fact]
    public async Task StartsTheClientInTheBottleThenAsksItToValidate()
    {
        using var bottle = new FakeBottle(buildId: "24878482", stateFlags: 4);
        var runner = bottle.Runner();

        var result = await bottle.Command(runner).RunAsync(new UpdateCommand.Settings());

        Assert.Equal(0, result);
        Assert.Equal(2, runner.Calls.Count);

        var start = runner.Calls[0];
        Assert.Equal(bottle.LauncherPath, start.Program);
        Assert.Equal(
            new[] { "--bottle", bottle.BottleName, @"C:\Program Files (x86)\Steam\steam.exe" },
            start.Arguments);

        var validate = runner.Calls[1];
        Assert.Equal(bottle.LauncherPath, validate.Program);
        Assert.Contains("--bottle", validate.Arguments);
        Assert.Contains(bottle.BottleName, validate.Arguments);
        Assert.Contains($"steam://validate/{AppId}", validate.Arguments);
    }

    /// <summary>
    /// Measured against the live bottle, an install request only detects the update and then
    /// defers the download by the client's own stagger. Pinning the scheme keeps a later edit
    /// from reintroducing the day-long wait.
    /// </summary>
    [Fact]
    public async Task RequestsAValidationAndNeverAnInstall()
    {
        using var bottle = new FakeBottle(buildId: "24878482", stateFlags: 4);
        var runner = bottle.Runner();

        await bottle.Command(runner).RunAsync(new UpdateCommand.Settings());

        var urls = runner.Calls
            .SelectMany(c => c.Arguments)
            .Where(a => a.StartsWith("steam://", StringComparison.Ordinal))
            .ToList();

        Assert.Equal(new[] { $"steam://validate/{AppId}" }, urls);
    }

    [Fact]
    public async Task WaitsForTheManifestToSettleAndReportsTheNewBuild()
    {
        using var bottle = new FakeBottle(buildId: "24771490", stateFlags: 4);
        var runner = bottle.Runner();
        var store = new CommandResultStore();

        // The measured transition: the client starts work, then settles on the newer build.
        runner.OnValidate = () =>
        {
            bottle.WriteManifest("24771490", stateFlags: 1030);
            bottle.WriteManifestAfter(TimeSpan.FromMilliseconds(50), "24878482", stateFlags: 4);
        };

        var result = await bottle.Command(runner, store).RunAsync(new UpdateCommand.Settings());

        Assert.Equal(0, result);
        var settled = SteamAppManifests.Read(bottle.ManifestPath)!;
        Assert.Equal("24878482", settled.BuildId);
        Assert.True(settled.IsFullyInstalled);
    }

    [Fact]
    public async Task ReportsAlreadyCurrentWhenNoWorkStarts()
    {
        using var bottle = new FakeBottle(buildId: "24878482", stateFlags: 4);
        var runner = bottle.Runner();

        var result = await bottle.Command(runner).RunAsync(new UpdateCommand.Settings());

        Assert.Equal(0, result);
        Assert.Equal("24878482", SteamAppManifests.Read(bottle.ManifestPath)!.BuildId);
    }

    [Fact]
    public async Task FailsAndReportsTheObservedStateWhenItNeverSettles()
    {
        using var bottle = new FakeBottle(buildId: "24771490", stateFlags: 4);
        var runner = bottle.Runner();
        runner.OnValidate = () => bottle.WriteManifest("24771490", stateFlags: 1030);

        var result = await bottle
            .Command(runner, settleTimeout: TimeSpan.FromMilliseconds(200))
            .RunAsync(new UpdateCommand.Settings());

        Assert.NotEqual(0, result);
        Assert.Equal(1030, SteamAppManifests.Read(bottle.ManifestPath)!.StateFlags);
    }

    [Fact]
    public async Task FailsBeforeStartingAnythingWhenTheLauncherIsAbsent()
    {
        using var bottle = new FakeBottle("24878482", stateFlags: 4, createLauncher: false);
        var runner = bottle.Runner();

        var result = await bottle.Command(runner).RunAsync(new UpdateCommand.Settings());

        Assert.NotEqual(0, result);
        Assert.Empty(runner.Calls);
    }

    [Fact]
    public async Task FailsBeforeStartingAnythingWhenTheManifestIsAbsent()
    {
        using var bottle = new FakeBottle("24878482", stateFlags: 4);
        File.Delete(bottle.ManifestPath);
        var runner = bottle.Runner();

        var result = await bottle.Command(runner).RunAsync(new UpdateCommand.Settings());

        Assert.NotEqual(0, result);
        Assert.Empty(runner.Calls);
    }

    /// <summary>A bottle on disk: wine binary, launcher, Steam manifest, and connection log.</summary>
    private sealed class FakeBottle : IDisposable
    {
        private readonly string _root;

        public FakeBottle(string buildId, int stateFlags, bool createLauncher = true)
        {
            _root = Directory.CreateTempSubdirectory().FullName;

            WineDirectory = Path.Combine(_root, "CrossOver", "bin");
            Directory.CreateDirectory(WineDirectory);
            WinePath = Path.Combine(WineDirectory, "wine");
            File.WriteAllText(WinePath, "wine");
            if (createLauncher)
                File.WriteAllText(Path.Combine(WineDirectory, SteamBottle.LauncherFileName), "cxstart");

            WinePrefix = Path.Combine(_root, "Bottles", "Steam");
            Directory.CreateDirectory(GameDiscovery.SteamAppsDirectory(WinePrefix));
            Directory.CreateDirectory(Path.GetDirectoryName(SteamBottle.ConnectionLogPath(WinePrefix))!);
            WriteManifest(buildId, stateFlags);
        }

        public string WineDirectory { get; }
        public string WinePath { get; }
        public string WinePrefix { get; }
        public string LauncherPath => SteamBottle.LauncherPath(WinePath);
        public string BottleName => Path.GetFileName(WinePrefix);
        public string ManifestPath => SteamBottle.ManifestPath(WinePrefix, AppId);

        public void WriteManifest(string buildId, int stateFlags) =>
            File.WriteAllText(ManifestPath,
                "\"AppState\"\n{\n"
                + $"\t\"appid\"\t\t\"{AppId}\"\n"
                + $"\t\"StateFlags\"\t\t\"{stateFlags}\"\n"
                + "\t\"installdir\"\t\t\"Ancient Kingdoms\"\n"
                + $"\t\"buildid\"\t\t\"{buildId}\"\n"
                + "}\n");

        public void WriteManifestAfter(TimeSpan delay, string buildId, int stateFlags) =>
            _ = Task.Run(async () =>
            {
                await Task.Delay(delay);
                WriteManifest(buildId, stateFlags);
            });

        public void AppendLogon() =>
            File.AppendAllText(
                SteamBottle.ConnectionLogPath(WinePrefix),
                $"[2026-08-23 10:00:01] {SteamBottle.LoggedOnMarker}() : 'OK'\n");

        public ScriptedRunner Runner()
        {
            File.AppendAllText(SteamBottle.ConnectionLogPath(WinePrefix), "[2026-08-23 09:59:00] starting\n");
            return new ScriptedRunner { Bottle = this };
        }

        public UpdateCommand Command(
            IProcessRunner runner,
            CommandResultStore? store = null,
            TimeSpan? settleTimeout = null) =>
            new(
                new LocalConfig(
                    GamePath: Path.Combine(WinePrefix, "drive_c", "Game"),
                    DataExportPath: Path.Combine(_root, "exported-data"),
                    WinePath: WinePath,
                    WinePrefix: WinePrefix),
                runner,
                store,
                clientReadyTimeout: TimeSpan.FromSeconds(10),
                workStartTimeout: TimeSpan.FromMilliseconds(150),
                settleTimeout: settleTimeout ?? TimeSpan.FromSeconds(10),
                pollInterval: TimeSpan.FromMilliseconds(10));

        public void Dispose() => Directory.Delete(_root, recursive: true);
    }

    /// <summary>
    /// Answers the client start by logging on and then staying alive, as the real client does,
    /// and answers the protocol URL by running the test's hook.
    /// </summary>
    private sealed class ScriptedRunner : IProcessRunner
    {
        public FakeBottle? Bottle { get; set; }
        public Action? OnValidate { get; set; }
        public List<ProcessRequest> Calls { get; } = new();

        public async Task<ProcessResult> RunAsync(ProcessRequest request, CancellationToken cancellationToken)
        {
            Calls.Add(request);

            if (request.Arguments.Any(a => a.StartsWith("steam://", StringComparison.Ordinal)))
            {
                OnValidate?.Invoke();
                return new ProcessResult(0, "", "", TimeSpan.Zero);
            }

            Bottle?.AppendLogon();

            try
            {
                await Task.Delay(Timeout.Infinite, cancellationToken);
            }
            catch (OperationCanceledException)
            {
            }

            return new ProcessResult(0, "", "", TimeSpan.Zero);
        }
    }
}
