using System.IO;
using System.Threading.Tasks;
using BuildTool.Commands;
using BuildTool.Configuration;
using Xunit;

namespace BuildTool.Tests;

public class DeployCommandTests
{
    [Fact]
    public async Task CopiesReleaseModDllsToConfiguredModsPath()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        var sourceDir = Path.Combine(tempRoot, "mods", "DataExporter", "bin", "Release", "net6.0");
        var gamePath = Path.Combine(tempRoot, "game");
        var modsPath = Path.Combine(gamePath, "Mods");
        Directory.CreateDirectory(sourceDir);
        Directory.CreateDirectory(modsPath);
        var sourceDll = Path.Combine(sourceDir, "DataExporter.dll");
        File.WriteAllText(sourceDll, "data");
        File.WriteAllText(Path.Combine(modsPath, "BossMod.dll"), "stale");

        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: null,
            WinePrefix: null);
        var command = new DeployCommand(tempRoot, config);

        var result = await command.ExecuteAsync(null!, new DeployCommand.Settings());

        Assert.Equal(0, result);
        Assert.Equal("data", File.ReadAllText(Path.Combine(modsPath, "DataExporter.dll")));
        Assert.False(File.Exists(Path.Combine(modsPath, "BossMod.dll")));
        Directory.Delete(tempRoot, recursive: true);
    }
}
