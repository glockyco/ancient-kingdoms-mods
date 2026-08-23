using System.IO;
using System.Threading.Tasks;
using BuildTool.Commands;
using Xunit;

namespace BuildTool.Tests;

public class SetupCommandTests
{
    [Fact]
    public async Task NonInteractive_WithExistingPropsFile_PreservesValues()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var propsPath = Path.Combine(tempRoot, "Local.props");
        File.WriteAllText(propsPath, """
            <Project>
              <PropertyGroup>
                <ANCIENT_KINGDOMS_PATH>/bottle/drive_c/Program Files (x86)/Steam/steamapps/common/Ancient Kingdoms</ANCIENT_KINGDOMS_PATH>
                <DATA_EXPORT_PATH>/repo/exported-data</DATA_EXPORT_PATH>
                <WINE_PATH>/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine</WINE_PATH>
                <WINE_PREFIX>/bottle</WINE_PREFIX>
              </PropertyGroup>
            </Project>
            """);

        var settings = new SetupCommand.Settings { NonInteractive = true };
        var command = new SetupCommand(tempRoot);
        var result = await command.RunAsync(settings);

        Assert.Equal(0, result);
        var contents = File.ReadAllText(propsPath);
        Assert.Contains("/bottle/drive_c/Program Files (x86)/Steam/steamapps/common/Ancient Kingdoms", contents);
        Assert.Contains("/Applications/CrossOver.app/Contents/SharedSupport/CrossOver/bin/wine", contents);
        Assert.Contains("<WINE_PREFIX>/bottle</WINE_PREFIX>", contents);
        Directory.Delete(tempRoot, recursive: true);
    }

    [Theory]
    [InlineData("WINE_PATH")]
    [InlineData("WINE_PREFIX")]
    public async Task NonInteractive_FailsWhenAWineKeyIsMissing(string missingKey)
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var propsPath = Path.Combine(tempRoot, "Local.props");
        File.WriteAllText(propsPath, $"""
            <Project>
              <PropertyGroup>
                <ANCIENT_KINGDOMS_PATH>/bottle/drive_c/Game</ANCIENT_KINGDOMS_PATH>
                <DATA_EXPORT_PATH>/repo/exported-data</DATA_EXPORT_PATH>
                {(missingKey == "WINE_PATH" ? "" : "<WINE_PATH>/wine</WINE_PATH>")}
                {(missingKey == "WINE_PREFIX" ? "" : "<WINE_PREFIX>/bottle</WINE_PREFIX>")}
              </PropertyGroup>
            </Project>
            """);

        var settings = new SetupCommand.Settings { NonInteractive = true };
        var command = new SetupCommand(tempRoot);
        var result = await command.RunAsync(settings);

        Assert.NotEqual(0, result);
        Directory.Delete(tempRoot, recursive: true);
    }
}
