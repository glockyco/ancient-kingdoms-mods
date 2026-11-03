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

        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(tempRoot, "exported-data"),
            WinePath: "/wine",
            WinePrefix: "/prefix");
        var command = new DeployCommand(tempRoot, config);

        var result = await command.RunAsync(new DeployCommand.Settings(), TestContext.Current.CancellationToken);

        Assert.Equal(0, result);
        Assert.Equal("data", File.ReadAllText(Path.Combine(modsPath, "DataExporter.dll")));
        Directory.Delete(tempRoot, recursive: true);
    }

    [Fact]
    public void LeavesThePocketCompendiumUpdaterOutOfMods()
    {
        var tempRoot = Directory.CreateTempSubdirectory().FullName;
        foreach (var (project, file) in new[]
        {
            ("PocketCompendium", "PocketCompendium.dll"),
            ("PocketCompendiumUpdater", "PocketCompendiumUpdater.dll"),
            ("PocketCompendiumUpdateCore", "PocketCompendium.UpdateCore.dll"),
        })
        {
            var dir = Path.Combine(tempRoot, "mods", project, "bin", "Release", "net6.0");
            Directory.CreateDirectory(dir);
            File.WriteAllText(Path.Combine(dir, file), "dll");
        }

        var deployed = DeployCommand.GetDeployableModDlls(Path.Combine(tempRoot, "mods"));

        Assert.Equal("PocketCompendium.dll", Path.GetFileName(Assert.Single(deployed)));
        Directory.Delete(tempRoot, recursive: true);
    }
}
