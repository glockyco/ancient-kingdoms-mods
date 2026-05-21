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
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var command = CreateCommand(tempRoot, runner, isMacOs: true);

        var settings = new LaunchCommand.Settings { Export = true };
        var result = await command.ExecuteAsync(null!, settings);

        Assert.Equal(0, result);
        Assert.Single(runner.Calls);
        Assert.Contains("--export-data", runner.Calls[0].Arguments);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task NonWait_ReturnsCommandFailed_WhenLaunchExitsImmediatelyNonZero()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(42, "", "failed", default));
        var command = CreateCommand(tempRoot, runner, isMacOs: false);

        var result = await command.ExecuteAsync(null!, new LaunchCommand.Settings());

        Assert.Equal(7, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task Wait_ReturnsCommandFailed_WhenRunnerThrowsBeforeStart()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var runner = new FakeProcessRunner();
        var command = CreateCommand(tempRoot, runner, isMacOs: false);

        var result = await command.ExecuteAsync(null!, new LaunchCommand.Settings { Wait = true });

        Assert.Equal(7, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public async Task Wait_ReturnsCommandFailed_WhenProcessExitsBeforeBanner()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var command = CreateCommand(tempRoot, runner, isMacOs: false);

        var result = await command.ExecuteAsync(null!, new LaunchCommand.Settings { Wait = true });

        Assert.Equal(7, result);
        Directory.Delete(tempRoot, recursive: true);
    }

    private static LaunchCommand CreateCommand(string tempRoot, FakeProcessRunner runner, bool isMacOs)
    {
        var gamePath = Path.Combine(tempRoot, "game");
        Directory.CreateDirectory(gamePath);
        File.WriteAllText(Path.Combine(gamePath, "ancientkingdoms.exe"), "exe");
        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: "/wine",
            WinePrefix: "/prefix");
        return new LaunchCommand(config, runner, isMacOs);
    }
}
