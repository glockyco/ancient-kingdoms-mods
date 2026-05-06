using System;
using System.IO;
using System.Linq;
using Xunit;

namespace BuildTool.Tests;

public class ProgramDeploymentTests
{
    [Fact]
    public void GetDeployableModDlls_SkipsBossModAssemblies()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var releaseDir = Path.Combine(root, "mods", "DataExporter", "bin", "Release", "net6.0");
        var bossDir = Path.Combine(root, "mods", "BossMod", "bin", "Release", "net6.0");
        var coreDir = Path.Combine(root, "mods", "BossMod.Core", "bin", "Release", "net6.0");
        var debugDir = Path.Combine(root, "mods", "DebugOnly", "bin", "Debug", "net6.0");
        Directory.CreateDirectory(releaseDir);
        Directory.CreateDirectory(bossDir);
        Directory.CreateDirectory(coreDir);
        Directory.CreateDirectory(debugDir);

        var dataExporter = Path.Combine(releaseDir, "DataExporter.dll");
        var bossMod = Path.Combine(bossDir, "BossMod.dll");
        var bossModCore = Path.Combine(coreDir, "BossMod.Core.dll");
        var debugOnly = Path.Combine(debugDir, "DebugOnly.dll");
        File.WriteAllText(dataExporter, "data");
        File.WriteAllText(bossMod, "boss");
        File.WriteAllText(bossModCore, "core");
        File.WriteAllText(debugOnly, "debug");

        var deployable = global::Program.GetDeployableModDlls(Path.Combine(root, "mods"));

        Assert.Equal(new[] { dataExporter }, deployable);
    }

    [Fact]
    public void RemoveDisabledDeploymentArtifacts_RemovesBossModFilesOnly()
    {
        var modsPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(modsPath);
        var bossMod = Path.Combine(modsPath, "BossMod.dll");
        var bossModCore = Path.Combine(modsPath, "BossMod.Core.dll");
        var dataExporter = Path.Combine(modsPath, "DataExporter.dll");
        File.WriteAllText(bossMod, "boss");
        File.WriteAllText(bossModCore, "core");
        File.WriteAllText(dataExporter, "data");

        var removed = global::Program.RemoveDisabledDeploymentArtifacts(modsPath).OrderBy(Path.GetFileName).ToArray();

        Assert.Equal(new[] { bossMod, bossModCore }.OrderBy(Path.GetFileName).ToArray(), removed);
        Assert.False(File.Exists(bossMod));
        Assert.False(File.Exists(bossModCore));
        Assert.True(File.Exists(dataExporter));
    }
}
