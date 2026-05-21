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
}
