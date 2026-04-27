using System;
using System.IO;
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class HotReplPathResolverTests
{
    [Fact]
    public void Resolve_DefaultsHotReplRepoToSiblingCheckout()
    {
        var repoRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "ancient-kingdoms-mods");
        Directory.CreateDirectory(repoRoot);
        var parent = Directory.GetParent(repoRoot)!.FullName;
        var hotReplRepo = Path.Combine(parent, "HotRepl");
        Directory.CreateDirectory(hotReplRepo);

        var paths = HotReplPaths.Resolve(
            repoRoot: repoRoot,
            gamePath: "/game/Ancient Kingdoms",
            configuration: "Debug",
            explicitHotReplRepo: null);

        Assert.Equal(hotReplRepo, paths.HotReplRepoPath);
        Assert.Equal(Path.Combine("/game/Ancient Kingdoms", "Mods"), paths.ModsPath);
        Assert.Equal(Path.Combine("/game/Ancient Kingdoms", "MelonLoader"), paths.MelonLoaderPath);
        Assert.Equal(Path.Combine("/game/Ancient Kingdoms", "MelonLoader", "Il2CppAssemblies"), paths.Il2CppAssembliesPath);
        Assert.Equal(
            Path.Combine(hotReplRepo, "src", "HotRepl.Host.MelonLoader", "HotRepl.Host.MelonLoader.csproj"),
            paths.HostProjectPath);
        Assert.Equal(
            Path.Combine(hotReplRepo, "src", "HotRepl.Host.MelonLoader", "bin", "Debug", "net6.0"),
            paths.HostOutputPath);
    }

    [Fact]
    public void Resolve_UsesExplicitHotReplRepoAndConfiguration()
    {
        var repoRoot = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "ancient-kingdoms-mods");
        var hotReplRepo = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"), "HotReplCustom");
        Directory.CreateDirectory(repoRoot);
        Directory.CreateDirectory(hotReplRepo);

        var paths = HotReplPaths.Resolve(
            repoRoot: repoRoot,
            gamePath: "/game/Ancient Kingdoms",
            configuration: "Release",
            explicitHotReplRepo: hotReplRepo);

        Assert.Equal(hotReplRepo, paths.HotReplRepoPath);
        Assert.Equal(Path.Combine(hotReplRepo, "src", "HotRepl.Host.MelonLoader", "bin", "Release", "net6.0"), paths.HostOutputPath);
    }

    [Fact]
    public void Resolve_RejectsMissingGamePath()
    {
        var ex = Assert.Throws<ArgumentException>(() => HotReplPaths.Resolve(
            repoRoot: "/repo",
            gamePath: "",
            configuration: "Debug",
            explicitHotReplRepo: null));

        Assert.Contains("ANCIENT_KINGDOMS_PATH", ex.Message);
    }
}
