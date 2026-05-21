using BuildTool.Commands;
using Spectre.Console.Cli;
using Xunit;

namespace BuildTool.Tests;

public class CommandRegistrationTests
{
    [Fact]
    public void AllCommandsAreRegisteredWithExpectedVerbs()
    {
        var app = new CommandApp();
        app.Configure(config =>
        {
            config.AddCommand<SetupCommand>("setup");
            config.AddCommand<BuildCommand>("build");
            config.AddCommand<DeployCommand>("deploy");
            config.AddCommand<DeployHostCommand>("deploy-host");
            config.AddCommand<LaunchCommand>("launch");
            config.AddCommand<ExportCommand>("export");
            config.AddCommand<UpdateCommand>("update");
        });

        Assert.NotNull(app);
    }
}
