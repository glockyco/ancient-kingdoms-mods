using System.IO;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

public class ExportCommandTests
{
    [Fact]
    public async Task Export_ReturnsUnreachable_WhenGameExeMissing()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var command = CreateCommand(tempRoot, createExe: false);

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

        Assert.Equal(ExitCodes.Unreachable, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task Export_RunsSteamcmdUpdateFirst_WhenUpdateFlagSet()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        File.WriteAllText(
            Path.Combine(tempRoot, "config.toml"),
            "[steam]\nusername = \"user\"");
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default)); // steamcmd
        runner.Enqueue(new ProcessResult(0, "", "", default)); // game launch
        var command = CreateCommand(tempRoot, runner: runner);

        // Export fails after launch (no real HotRepl) — we only verify order
        await command.ExecuteAsync(null!, new ExportCommand.Settings { Update = true });

        Assert.True(runner.Calls.Count >= 1);
        Assert.Equal("steamcmd", runner.Calls[0].Program);
    }

    [Fact]
    public async Task Export_LaunchesGameWithoutExportFlags()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var command = CreateCommand(tempRoot, runner: runner);

        await command.ExecuteAsync(null!,
            new ExportCommand.Settings { Screenshots = true });

        // Game launch args must not include --export-data or --export-screenshots
        var launchArgs = runner.Calls.Count > 0
            ? string.Join(" ", runner.Calls[^1].Arguments)
            : string.Empty;
        Assert.DoesNotContain("--export-data", launchArgs);
        Assert.DoesNotContain("--export-screenshots", launchArgs);
    }

    // ----

    private static ExportCommand CreateCommand(
        string tempRoot,
        FakeProcessRunner? runner = null,
        bool createExe = true)
    {
        var gamePath = Path.Combine(tempRoot, "game");
        Directory.CreateDirectory(gamePath);
        if (createExe)
            File.WriteAllText(Path.Combine(gamePath, "ancientkingdoms.exe"), "exe");

        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: null,
            WinePrefix: null,
            HotReplEndpoint: "ws://127.0.0.1:18590");

        return new ExportCommand(
            tempRoot,
            config,
            runner ?? new FakeProcessRunner(),
            isMacOs: false,
            new CommandResultStore());
    }
}
