using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using BuildTool.HotRepl;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

[Collection("ConsoleOutput")]
public class ExportCommandTests
{
    private static int _nextEndpointPort = 50000;
    [Fact]
    public async Task Export_ReturnsUnreachable_WhenGameExeMissing()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var command = CreateCommand(tempRoot, createExe: false);

        var result = await command.RunAsync(new ExportCommand.Settings(), TestContext.Current.CancellationToken);

        Assert.Equal(ExitCodes.Unreachable, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    /// <summary>
    /// The update runs before the game does, and a failed update stops the export. Here the
    /// configured bottle holds no CrossOver launcher, so the update cannot start and the game
    /// is never launched.
    /// </summary>
    [Fact]
    public async Task Export_RunsTheUpdateFirstAndStopsWhenItFails_WhenUpdateFlagSet()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var runner = new FakeProcessRunner();
        var command = CreateCommand(tempRoot, runner: runner);

        var result = await command.RunAsync(new ExportCommand.Settings { Update = true }, TestContext.Current.CancellationToken);

        Assert.NotEqual(0, result);
        Assert.Empty(runner.Calls);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task Export_LaunchesGameWithoutExportFlags()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var command = CreateCommand(tempRoot, runner: runner);

        await command.RunAsync(new ExportCommand.Settings { Screenshots = true }, TestContext.Current.CancellationToken);

        // Game launch args must not include --export-data or --export-screenshots
        var launchArgs = runner.Calls.Count > 0
            ? string.Join(" ", runner.Calls[^1].Arguments)
            : string.Empty;
        Assert.DoesNotContain("--export-data", launchArgs);
        Assert.DoesNotContain("--export-screenshots", launchArgs);
    }

    [Fact]
    public async Task Export_ReturnsUnityDependencyFailure_WhenMelonLoaderReportsMissingUnityDependencies()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var runner = new FakeProcessRunner();
        runner.Enqueue(async (_, cancellationToken) =>
        {
            var logPath = Path.Combine(tempRoot, "game", "MelonLoader", "Latest.log");
            await File.AppendAllTextAsync(logPath, """
                [Il2CppAssemblyGenerator] C:\Game\MelonLoader\Dependencies\Il2CppAssemblyGenerator\UnityDependencies_6000.3.17.zip does not Exist!
                [INTERNAL FAILURE] Failed to Process UnityDependencies!

                """, cancellationToken);
            await Task.Delay(TimeSpan.FromMinutes(10), cancellationToken);
            return new ProcessResult(1, "", "", default);
        });
        var resultStore = new CommandResultStore();
        var command = CreateCommand(
            tempRoot,
            runner: runner,
            resultStore: resultStore,
            exportRunner: async (_, cancellationToken) =>
            {
                await Task.Delay(TimeSpan.FromMinutes(10), cancellationToken);
                return new ExportRunnerResult(false, ExitCodes.Cancelled, "cancelled");
            },
            hotReplReadinessTimeout: TimeSpan.FromMilliseconds(100));

        var result = await command.RunAsync(new ExportCommand.Settings(), TestContext.Current.CancellationToken);

        Assert.Equal(ExitCodes.ReadinessFailed, result);
        Assert.Contains("UnityDependencies_6000.3.17.zip", resultStore.ErrorDetails?.ToString());
        Directory.Delete(tempRoot, recursive: true);
    }

    [Theory]
    [InlineData("host")]
    [InlineData("wine")]
    [InlineData("uri")]
    [InlineData("wine-uri")]
    public async Task Export_PrintsPromotedSessionPath(string pathKind)
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var originalOutput = Console.Out;
        using var output = new StringWriter();
        try
        {
            var sessionPath = pathKind is "wine" or "wine-uri"
                ? Path.Combine(tempRoot, "prefix", "drive_c", "exports", "sessions", "completed")
                : Path.Combine(tempRoot, "exported-data", "sessions", "completed");
            Directory.CreateDirectory(sessionPath);
            var manifestPath = Path.Combine(sessionPath, "manifest.json");
            File.WriteAllText(manifestPath, """{"schema_version":1,"session_id":"completed","files":[]}""");
            var winePath = @"C:\exports\sessions\completed\manifest.json";
            var artifact = pathKind switch
            {
                "wine" => JsonSerializer.SerializeToElement(new { path = winePath }),
                "uri" => JsonSerializer.SerializeToElement(new { uri = new Uri(manifestPath).AbsoluteUri }),
                "wine-uri" => JsonSerializer.SerializeToElement(new { uri = "file:///C:/exports/sessions/completed/manifest.json" }),
                _ => JsonSerializer.SerializeToElement(new { path = manifestPath }),
            };
            var expectedPath = sessionPath;
            var artifacts = new Dictionary<string, JsonElement> { ["session.manifest"] = artifact };
            var runner = new FakeProcessRunner();
            runner.Enqueue(async (_, cancellationToken) =>
            {
                await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
                return new ProcessResult(0, "", "", default);
            });
            var resultStore = new CommandResultStore();
            var command = CreateCommand(
                tempRoot,
                runner: runner,
                resultStore: resultStore,
                exportRunner: (_, _) => Task.FromResult(
                    new ExportRunnerResult(true, ExitCodes.Success, "Export completed.", artifacts)));
            Console.SetOut(output);

            var result = await command.RunAsync(new ExportCommand.Settings(), TestContext.Current.CancellationToken);

            Assert.Equal(ExitCodes.Success, result);
            Assert.Contains($"Export complete. Session: {expectedPath}", output.ToString());
            var data = JsonSerializer.SerializeToElement(resultStore.Data);
            Assert.True(data.GetProperty("ok").GetBoolean());
            Assert.Equal("Export completed.", data.GetProperty("message").GetString());
            Assert.Equal(expectedPath, data.GetProperty("sessionPath").GetString());
        }
        finally
        {
            Console.SetOut(originalOutput);
            Directory.Delete(tempRoot, recursive: true);
        }
    }


    // ----

    private static ExportCommand CreateCommand(
        string tempRoot,
        FakeProcessRunner? runner = null,
        bool createExe = true,
        CommandResultStore? resultStore = null,
        TimeSpan? hotReplReadinessTimeout = null,
        Func<HotReplRunnerOptions, CancellationToken, Task<ExportRunnerResult>>? exportRunner = null)
    {
        var gamePath = Path.Combine(tempRoot, "game");
        Directory.CreateDirectory(gamePath);
        if (createExe)
            File.WriteAllText(Path.Combine(gamePath, "ancientkingdoms.exe"), "exe");

        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: "/wine",
            WinePrefix: Path.Combine(tempRoot, "prefix"),
            HotReplEndpoint: $"ws://127.0.0.1:{Interlocked.Increment(ref _nextEndpointPort)}");

        return new ExportCommand(
            tempRoot,
            config,
            runner ?? new FakeProcessRunner(),
            resultStore ?? new CommandResultStore(),
            hotReplReadinessTimeout: hotReplReadinessTimeout ?? TimeSpan.Zero,
            hotReplPollInterval: TimeSpan.Zero,
            exportRunner: exportRunner,
            endpointAnswers: (_, _) => Task.FromResult(false),
            relevantProcessExists: _ => false);
    }
}
