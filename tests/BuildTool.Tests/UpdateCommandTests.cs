using System.IO;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Commands;
using BuildTool.Configuration;
using Xunit;

namespace BuildTool.Tests;

public class UpdateCommandTests
{
    [Fact]
    public async Task InvokesSteamcmdForAncientKingdomsAppId()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        File.WriteAllText(Path.Combine(tempRoot, "config.toml"), """
            [steam]
            username = "steam-user"
            """);
        var config = new LocalConfig(
            GamePath: Path.Combine(tempRoot, "game"),
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: null,
            WinePrefix: null);
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "", "", default));
        var command = new UpdateCommand(tempRoot, config, runner);

        var result = await command.ExecuteAsync(null!, new UpdateCommand.Settings());

        Assert.Equal(0, result);
        Assert.Single(runner.Calls);
        Assert.Equal("steamcmd", runner.Calls[0].Program);
        Assert.Contains("+app_update", runner.Calls[0].Arguments);
        Assert.Contains("2241380", runner.Calls[0].Arguments);
        Directory.Delete(tempRoot, recursive: true);
    }
}
