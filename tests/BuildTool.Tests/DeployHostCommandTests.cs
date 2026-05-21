using System.IO;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using Xunit;

namespace BuildTool.Tests;

public class DeployHostCommandTests
{
    [Fact]
    public async Task BuildsHostAndCopiesOutputToModsDirectory()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var hotReplRepo = Path.Combine(tempRoot, "HotRepl");
        var hostProjectDir = Path.Combine(hotReplRepo, "src", "HotRepl.Host.MelonLoader");
        var hostOutput = Path.Combine(hostProjectDir, "bin", "Debug", "net6.0");
        var gamePath = Path.Combine(tempRoot, "game");
        Directory.CreateDirectory(hostProjectDir);
        Directory.CreateDirectory(hostOutput);
        Directory.CreateDirectory(gamePath);
        File.WriteAllText(Path.Combine(hostProjectDir, "HotRepl.Host.MelonLoader.csproj"), "<Project />");
        File.WriteAllText(Path.Combine(hostOutput, "HotRepl.Host.MelonLoader.dll"), "host");

        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: null,
            WinePrefix: null);
        var command = new DeployHostCommand(tempRoot, config, runner);

        var result = await command.ExecuteAsync(null!, new DeployHostCommand.Settings { HotReplRepo = hotReplRepo });

        Assert.Equal(0, result);
        Assert.Single(runner.Calls);
        Assert.Contains("build", runner.Calls[0].Arguments);
        Assert.True(File.Exists(Path.Combine(gamePath, "Mods", "HotRepl.Host.MelonLoader.dll")));
        Directory.Delete(tempRoot, recursive: true);
    }
}
