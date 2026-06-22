using System;
using System.IO;
using BuildTool.Commands;
using Xunit;

namespace BuildTool.Tests;

public class ProgramDeploymentTests
{
    [Fact]
    public void GetDeployableModDlls_ReturnsReleaseDllsOnly()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var releaseDir = Path.Combine(root, "mods", "DataExporter", "bin", "Release", "net6.0");
        var debugDir = Path.Combine(root, "mods", "DebugOnly", "bin", "Debug", "net6.0");
        Directory.CreateDirectory(releaseDir);
        Directory.CreateDirectory(debugDir);

        var dataExporter = Path.Combine(releaseDir, "DataExporter.dll");
        var debugOnly = Path.Combine(debugDir, "DebugOnly.dll");
        File.WriteAllText(dataExporter, "data");
        File.WriteAllText(debugOnly, "debug");

        var deployable = DeployCommand.GetDeployableModDlls(Path.Combine(root, "mods"));

        Assert.Equal(new[] { dataExporter }, deployable);
    }

}
