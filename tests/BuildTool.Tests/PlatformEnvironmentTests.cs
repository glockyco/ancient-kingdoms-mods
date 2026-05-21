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

    private static LocalConfig WindowsConfig() => new(
        GamePath: @"C:\Games\Ancient Kingdoms",
        DataExportPath: @"C:\Projects\AK\exported-data",
        WinePath: null,
        WinePrefix: null);

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
    public void Windows_BuildsRequestPointingAtGameExe()
    {
        var request = WindowsEnvironment.BuildLaunchRequest(WindowsConfig(), gameArgs: new string[0]);

        Assert.Equal(System.IO.Path.Combine(WindowsConfig().GamePath, "ancientkingdoms.exe"), request.Program);
        Assert.Empty(request.Arguments);
        Assert.Equal(WindowsConfig().GamePath, request.WorkingDirectory);
    }
}
