using System.IO;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using Xunit;

namespace BuildTool.Tests;

public class LaunchCommandTests
{
    [Fact]
    public async Task BuildsLaunchRequest_AppendsExportArgWhenSet()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var gamePath = Path.Combine(tempRoot, "game");
        Directory.CreateDirectory(gamePath);
        File.WriteAllText(Path.Combine(gamePath, "ancientkingdoms.exe"), "exe");
        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: "/wine",
            WinePrefix: "/prefix");
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));

        var settings = new LaunchCommand.Settings { Export = true };
        var command = new LaunchCommand(config, runner, isMacOs: true);
        var result = await command.ExecuteAsync(null!, settings);

        Assert.Equal(0, result);
        Assert.Single(runner.Calls);
        Assert.Contains("--export-data", runner.Calls[0].Arguments);
        Directory.Delete(tempRoot, recursive: true);
    }
}
