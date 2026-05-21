using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class HotReplDeployerTests
{
    [Fact]
    public void Deploy_CopiesTopLevelAssembliesAndSatelliteFolders()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var output = Path.Combine(root, "hotrepl-output");
        var mods = Path.Combine(root, "game", "Mods");
        Directory.CreateDirectory(output);
        Directory.CreateDirectory(Path.Combine(output, "cs"));

        File.WriteAllText(Path.Combine(output, "HotRepl.Host.MelonLoader.dll"), "host");
        File.WriteAllText(Path.Combine(output, "HotRepl.Core.dll"), "core");
        File.WriteAllText(Path.Combine(output, "Microsoft.CodeAnalysis.dll"), "roslyn");
        File.WriteAllText(Path.Combine(output, "HotRepl.Host.MelonLoader.deps.json"), "deps");
        File.WriteAllText(Path.Combine(output, "HotRepl.Host.MelonLoader.pdb"), "pdb");
        File.WriteAllText(Path.Combine(output, "cs", "Microsoft.CodeAnalysis.resources.dll"), "resources");

        var report = HotReplDeployer.Deploy(output, mods);

        Assert.Contains(Path.Combine(mods, "HotRepl.Host.MelonLoader.dll"), report.CopiedFiles);
        Assert.Contains(Path.Combine(mods, "HotRepl.Core.dll"), report.CopiedFiles);
        Assert.Contains(Path.Combine(mods, "Microsoft.CodeAnalysis.dll"), report.CopiedFiles);
        Assert.Contains(Path.Combine(mods, "HotRepl.Host.MelonLoader.deps.json"), report.CopiedFiles);
        Assert.Contains(Path.Combine(mods, "HotRepl.Host.MelonLoader.pdb"), report.CopiedFiles);
        Assert.True(File.Exists(Path.Combine(mods, "cs", "Microsoft.CodeAnalysis.resources.dll")));
    }

    [Fact]
    public void Deploy_RemovesStaleHotReplDependencyFilesButLeavesOtherMods()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var output = Path.Combine(root, "hotrepl-output");
        var mods = Path.Combine(root, "game", "Mods");
        Directory.CreateDirectory(output);
        Directory.CreateDirectory(mods);

        File.WriteAllText(Path.Combine(output, "HotRepl.Host.MelonLoader.dll"), "host");
        File.WriteAllText(Path.Combine(output, "Microsoft.CodeAnalysis.dll"), "roslyn");
        File.WriteAllText(Path.Combine(mods, "System.Collections.Immutable.dll"), "stale");
        File.WriteAllText(Path.Combine(mods, "System.Reflection.Metadata.dll"), "stale");
        File.WriteAllText(Path.Combine(mods, "MapEnhancer.dll"), "unrelated");

        HotReplDeployer.Deploy(output, mods);

        Assert.False(File.Exists(Path.Combine(mods, "System.Collections.Immutable.dll")));
        Assert.False(File.Exists(Path.Combine(mods, "System.Reflection.Metadata.dll")));
        Assert.True(File.Exists(Path.Combine(mods, "MapEnhancer.dll")));
    }

    [Fact]
    public void Deploy_SkipsSystemFrameworkAssembliesFromHostOutput()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var output = Path.Combine(root, "hotrepl-output");
        var mods = Path.Combine(root, "game", "Mods");
        Directory.CreateDirectory(output);

        File.WriteAllText(Path.Combine(output, "HotRepl.Host.MelonLoader.dll"), "host");
        File.WriteAllText(Path.Combine(output, "System.Memory.dll"), "framework");
        File.WriteAllText(Path.Combine(output, "System.Runtime.CompilerServices.Unsafe.dll"), "framework");

        HotReplDeployer.Deploy(output, mods);

        Assert.False(File.Exists(Path.Combine(mods, "System.Memory.dll")));
        Assert.False(File.Exists(Path.Combine(mods, "System.Runtime.CompilerServices.Unsafe.dll")));
    }

    [Fact]
    public void Deploy_RejectsMissingHostAssembly()
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var output = Path.Combine(root, "hotrepl-output");
        var mods = Path.Combine(root, "game", "Mods");
        Directory.CreateDirectory(output);

        var ex = Assert.Throws<FileNotFoundException>(() => HotReplDeployer.Deploy(output, mods));

        Assert.Contains("HotRepl.Host.MelonLoader.dll", ex.Message);
    }

    [Fact]
    public async Task Build_InvokesDotnetBuildWithHostProject()
    {
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(0, "Build succeeded", "", TimeSpan.FromSeconds(1)));

        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        var hostProjectPath = Path.Combine(root, "HotRepl.Host.MelonLoader.csproj");
        Directory.CreateDirectory(root);
        File.WriteAllText(hostProjectPath, "<Project />");

        var paths = new HotReplPaths(
            RepoRoot: root,
            GamePath: Path.Combine(root, "game"),
            ModsPath: Path.Combine(root, "game", "Mods"),
            MelonLoaderPath: Path.Combine(root, "game", "MelonLoader"),
            Il2CppAssembliesPath: Path.Combine(root, "game", "MelonLoader", "Il2CppAssemblies"),
            HotReplRepoPath: Path.Combine(root, "HotRepl"),
            HostProjectPath: hostProjectPath,
            HostOutputPath: Path.Combine(root, "HotRepl", "bin", "Debug", "net6.0"));

        var exit = await HotReplDeployer.BuildAsync(paths, "Debug", runner, CancellationToken.None);

        Assert.Equal(0, exit);
        Assert.Single(runner.Calls);
        var call = runner.Calls[0];
        Assert.Equal("dotnet", call.Program);
        Assert.Contains("build", call.Arguments);
        Assert.Contains(paths.HostProjectPath, call.Arguments);
    }
}
