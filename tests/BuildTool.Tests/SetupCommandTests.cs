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
                <ANCIENT_KINGDOMS_PATH>C:\Games\AK</ANCIENT_KINGDOMS_PATH>
                <DATA_EXPORT_PATH>C:\export</DATA_EXPORT_PATH>
              </PropertyGroup>
            </Project>
            """);

        var settings = new SetupCommand.Settings { NonInteractive = true };
        var command = new SetupCommand(tempRoot);
        var result = await command.ExecuteAsync(null!, settings);

        Assert.Equal(0, result);
        var contents = File.ReadAllText(propsPath);
        Assert.Contains("C:\\Games\\AK", contents);
        Directory.Delete(tempRoot, recursive: true);
    }
}
