using System.IO;
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class HotReplLauncherTests
{
    [Fact]
    public void CreateMacLaunchInfo_UsesCrossOverSteamBottleAndNoExportArgs()
    {
        var gamePath = "/Users/me/Library/Application Support/CrossOver/Bottles/Steam/drive_c/Game";
        var winePath = "/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine";
        var winePrefix = "/Users/me/Library/Application Support/CrossOver/Bottles/Steam";

        var psi = HotReplLauncher.CreateMacLaunchInfo(gamePath, winePath, winePrefix);

        Assert.Equal(winePath, psi.FileName);
        Assert.Equal("ancientkingdoms.exe", psi.Arguments);
        Assert.Equal(gamePath, psi.WorkingDirectory);
        Assert.False(psi.UseShellExecute);
        Assert.Equal("Steam", psi.Environment["CX_BOTTLE"]);
        Assert.Equal(winePrefix, psi.Environment["WINEPREFIX"]);
        Assert.Equal(@"C:\Program Files\dotnet", psi.Environment["DOTNET_ROOT"]);
        Assert.DoesNotContain("--export-data", psi.Arguments);
    }

    [Fact]
    public void CreateWindowsLaunchInfo_UsesGameExeAndNoExportArgs()
    {
        var gamePath = @"C:\Games\Ancient Kingdoms";

        var psi = HotReplLauncher.CreateWindowsLaunchInfo(gamePath);

        Assert.Equal(Path.Combine(gamePath, "ancientkingdoms.exe"), psi.FileName);
        Assert.Equal("", psi.Arguments);
        Assert.Equal(gamePath, psi.WorkingDirectory);
        Assert.False(psi.UseShellExecute);
    }
}
