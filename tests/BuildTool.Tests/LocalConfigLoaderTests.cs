using System.IO;
using BuildTool.Configuration;
using Xunit;

namespace BuildTool.Tests;

public class LocalConfigLoaderTests
{
    [Fact]
    public void Load_ParsesWindowsShape()
    {
        var temp = Path.GetTempFileName();
        File.WriteAllText(temp, @"<Project>
  <PropertyGroup>
    <ANCIENT_KINGDOMS_PATH>C:\Games\AK</ANCIENT_KINGDOMS_PATH>
    <DATA_EXPORT_PATH>C:\Projects\AK\exported-data</DATA_EXPORT_PATH>
  </PropertyGroup>
</Project>");

        var config = LocalConfigLoader.Load(temp);

        Assert.Equal(@"C:\Games\AK", config.GamePath);
        Assert.Equal(@"C:\Projects\AK\exported-data", config.DataExportPath);
        Assert.Null(config.WinePath);
        Assert.Null(config.WinePrefix);
    }

    [Fact]
    public void Load_ParsesMacOsShapeWithWineFields()
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
        Assert.Equal("/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine", config.WinePath);
        Assert.Equal("/Users/me/Library/Application Support/CrossOver/Bottles/Steam", config.WinePrefix);
    }
}
