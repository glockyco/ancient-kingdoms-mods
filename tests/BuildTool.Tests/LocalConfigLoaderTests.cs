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
}
