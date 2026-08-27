using BuildTool.Configuration;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public class PlatformEnvironmentTests
{
    private static LocalConfig MacConfig() => new(
        GamePath: "/Users/me/Library/Application Support/CrossOver/Bottles/Steam/drive_c/Game",
        DataExportPath: "/Users/me/exported-data",
        WinePath: "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine",
        WinePrefix: "/Users/me/Library/Application Support/CrossOver/Bottles/Steam");

    [Fact]
    public void Wine_BuildsRequestWithCrossOverBottleAndDotnetRoot()
    {
        var request = WineEnvironment.BuildLaunchRequest(MacConfig(), gameArgs: new string[0]);

        Assert.Equal("/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine", request.Program);
        Assert.Equal(new[] { "ancientkingdoms.exe" }, request.Arguments);
        Assert.Equal(MacConfig().GamePath, request.WorkingDirectory);
        Assert.Equal("Steam", request.Environment!["CX_BOTTLE"]);
        Assert.Equal(MacConfig().WinePrefix, request.Environment!["WINEPREFIX"]);
        Assert.Equal(@"C:\Program Files\dotnet", request.Environment!["DOTNET_ROOT"]);
        Assert.Equal("version=n,b", request.Environment!["WINEDLLOVERRIDES"]);
    }

    [Fact]
    public void Wine_AppendsExportArgs()
    {
        var request = WineEnvironment.BuildLaunchRequest(
            MacConfig(),
            gameArgs: new[] { "--export-data", "--export-screenshots" });

        Assert.Equal(
            new[] { "ancientkingdoms.exe", "--export-data", "--export-screenshots" },
            request.Arguments);
    }

    [Fact]
    public void Wine_PassesTheReplPortThrough()
    {
        var previous = System.Environment.GetEnvironmentVariable("HOTREPL_PORT");
        System.Environment.SetEnvironmentVariable("HOTREPL_PORT", "18591");
        try
        {
            var request = WineEnvironment.BuildLaunchRequest(MacConfig(), gameArgs: new string[0]);

            Assert.Equal("18591", request.Environment!["HOTREPL_PORT"]);
        }
        finally
        {
            System.Environment.SetEnvironmentVariable("HOTREPL_PORT", previous);
        }
    }

    [Fact]
    public void Wine_OmitsTheReplPortWhenUnset()
    {
        var previous = System.Environment.GetEnvironmentVariable("HOTREPL_PORT");
        System.Environment.SetEnvironmentVariable("HOTREPL_PORT", null);
        try
        {
            var request = WineEnvironment.BuildLaunchRequest(MacConfig(), gameArgs: new string[0]);

            Assert.False(request.Environment!.ContainsKey("HOTREPL_PORT"));
        }
        finally
        {
            System.Environment.SetEnvironmentVariable("HOTREPL_PORT", previous);
        }
    }

    [Fact]
    public void GameLauncher_BuildsTheWineRequest()
    {
        var config = MacConfig();

        var request = GameLauncher.BuildLaunchRequest(config, gameArgs: new[] { "--export-data" });

        Assert.Equal(config.WinePath, request.Program);
        Assert.Contains("--export-data", request.Arguments);
    }
}
