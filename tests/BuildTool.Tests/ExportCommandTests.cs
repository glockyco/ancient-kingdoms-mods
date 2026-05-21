using System.IO;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using Xunit;

namespace BuildTool.Tests;

public class ExportCommandTests
{
    [Fact]
    public async Task UpdateRunsBeforeLaunchAndScreenshotsArgumentIsPassed()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        File.WriteAllText(Path.Combine(tempRoot, "config.toml"), """
            [steam]
            username = "steam-user"
            """);
        var gamePath = Path.Combine(tempRoot, "game");
        Directory.CreateDirectory(gamePath);
        File.WriteAllText(Path.Combine(gamePath, "ancientkingdoms.exe"), "exe");

        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: null,
            WinePrefix: null);
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var command = new ExportCommand(tempRoot, config, runner, isMacOs: false);

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings { Update = true, Screenshots = true });

        Assert.Equal(7, result);
        Assert.Equal(2, runner.Calls.Count);
        Assert.Equal("steamcmd", runner.Calls[0].Program);
        Assert.Contains("--export-data", runner.Calls[1].Arguments);
        Assert.Contains("--export-screenshots", runner.Calls[1].Arguments);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task ReturnsSuccess_WhenResultFileShowsOkTrue()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var exportDir = Path.Combine(tempRoot, "exported-data");
        Directory.CreateDirectory(exportDir);
        File.WriteAllText(Path.Combine(exportDir, ".exporter-result.json"), """
            { "schemaVersion": 1, "ok": true, "exporters": [], "errors": [] }
            """);
        var command = CreateCommand(tempRoot, exportDir, out var runner);
        runner.Enqueue(new ProcessResult(0, "", "", default));

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

        Assert.Equal(0, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task ReturnsCommandFailed_WhenResultFileShowsOkFalse()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var exportDir = Path.Combine(tempRoot, "exported-data");
        Directory.CreateDirectory(exportDir);
        File.WriteAllText(Path.Combine(exportDir, ".exporter-result.json"), """
            { "schemaVersion": 1, "ok": false, "exporters": [
                { "name": "items", "ok": false, "error": { "kind": "exporter_failed", "message": "boom" } }
            ], "errors": [] }
            """);
        var command = CreateCommand(tempRoot, exportDir, out var runner);
        runner.Enqueue(new ProcessResult(0, "", "", default));

        var result = await command.ExecuteAsync(null!, new ExportCommand.Settings());

        Assert.Equal(7, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    private static ExportCommand CreateCommand(string tempRoot, string exportDir, out FakeProcessRunner runner)
    {
        var gamePath = Path.Combine(tempRoot, "game");
        Directory.CreateDirectory(gamePath);
        File.WriteAllText(Path.Combine(gamePath, "ancientkingdoms.exe"), "exe");
        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: exportDir,
            WinePath: null,
            WinePrefix: null);
        runner = new FakeProcessRunner();
        return new ExportCommand(tempRoot, config, runner, isMacOs: false);
    }
}
