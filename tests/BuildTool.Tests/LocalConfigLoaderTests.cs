using System;
using System.IO;
using BuildTool.Configuration;
using Xunit;

namespace BuildTool.Tests;

public class LocalConfigLoaderTests
{
    [Fact]
    public void Load_ParsesEveryRequiredKey()
    {
        var temp = Path.GetTempFileName();
        File.WriteAllText(temp, @"<Project>
  <PropertyGroup>
    <ANCIENT_KINGDOMS_PATH>/Users/me/.../drive_c/Game</ANCIENT_KINGDOMS_PATH>
    <DATA_EXPORT_PATH>/Users/me/Projects/AK/exported-data</DATA_EXPORT_PATH>
    <WINE_PATH>/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine</WINE_PATH>
    <WINE_PREFIX>/Users/me/Library/Application Support/CrossOver/Bottles/Steam</WINE_PREFIX>
  </PropertyGroup>
</Project>");

        var config = LocalConfigLoader.Load(temp);

        Assert.Equal("/Users/me/.../drive_c/Game", config.GamePath);
        Assert.Equal("/Users/me/Projects/AK/exported-data", config.DataExportPath);
        Assert.Equal("/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine", config.WinePath);
        Assert.Equal("/Users/me/Library/Application Support/CrossOver/Bottles/Steam", config.WinePrefix);
    }

    [Theory]
    [InlineData("WINE_PATH")]
    [InlineData("WINE_PREFIX")]
    public void Load_FailsAndNamesTheMissingWineKeyAndTheFile(string missingKey)
    {
        var temp = Path.GetTempFileName();
        File.WriteAllText(temp, $@"<Project>
  <PropertyGroup>
    <ANCIENT_KINGDOMS_PATH>/Users/me/.../drive_c/Game</ANCIENT_KINGDOMS_PATH>
    <DATA_EXPORT_PATH>/Users/me/Projects/AK/exported-data</DATA_EXPORT_PATH>
    {(missingKey == "WINE_PATH" ? "" : "<WINE_PATH>/wine</WINE_PATH>")}
    {(missingKey == "WINE_PREFIX" ? "" : "<WINE_PREFIX>/prefix</WINE_PREFIX>")}
  </PropertyGroup>
</Project>");

        var ex = Assert.Throws<InvalidOperationException>(() => LocalConfigLoader.Load(temp));

        Assert.Contains(missingKey, ex.Message, StringComparison.Ordinal);
        Assert.Contains(temp, ex.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("ws://127.0.0.1:18590", "18599", "ws://127.0.0.1:18599")]
    [InlineData("ws://host.lan:1234", "18599", "ws://host.lan:18599")]
    [InlineData("ws://127.0.0.1:18590", null, "ws://127.0.0.1:18590")]
    [InlineData("ws://127.0.0.1:18590", " ", "ws://127.0.0.1:18590")]
    public void ResolveHotReplEndpoint_TakesTheLaunchPortAndKeepsTheHost(
        string configured, string? port, string expected)
    {
        Assert.Equal(expected, LocalConfigLoader.ResolveHotReplEndpoint(configured, port));
    }

    [Theory]
    [InlineData("eighteen")]
    [InlineData("0")]
    [InlineData("70000")]
    public void ResolveHotReplEndpoint_RejectsAValueThatIsNotAPort(string port)
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => LocalConfigLoader.ResolveHotReplEndpoint("ws://127.0.0.1:18590", port));

        Assert.Contains("HOTREPL_PORT", ex.Message, StringComparison.Ordinal);
    }
}
