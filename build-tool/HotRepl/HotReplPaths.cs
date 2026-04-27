using System;
using System.IO;

namespace BuildTool.HotRepl;

internal sealed record HotReplPaths(
    string RepoRoot,
    string GamePath,
    string ModsPath,
    string MelonLoaderPath,
    string Il2CppAssembliesPath,
    string HotReplRepoPath,
    string HostProjectPath,
    string HostOutputPath)
{
    public static HotReplPaths Resolve(
        string repoRoot,
        string gamePath,
        string configuration,
        string? explicitHotReplRepo)
    {
        if (string.IsNullOrWhiteSpace(repoRoot))
            throw new ArgumentException("Repository root is required.", nameof(repoRoot));
        if (string.IsNullOrWhiteSpace(gamePath))
            throw new ArgumentException("ANCIENT_KINGDOMS_PATH is required for HotRepl deployment.", nameof(gamePath));
        if (string.IsNullOrWhiteSpace(configuration))
            configuration = "Debug";

        var hotReplRepo = string.IsNullOrWhiteSpace(explicitHotReplRepo)
            ? Path.GetFullPath(Path.Combine(repoRoot, "..", "HotRepl"))
            : Path.GetFullPath(explicitHotReplRepo);

        var hostProjectPath = Path.Combine(
            hotReplRepo,
            "src",
            "HotRepl.Host.MelonLoader",
            "HotRepl.Host.MelonLoader.csproj");

        var hostOutputPath = Path.Combine(
            hotReplRepo,
            "src",
            "HotRepl.Host.MelonLoader",
            "bin",
            configuration,
            "net6.0");

        return new HotReplPaths(
            RepoRoot: repoRoot,
            GamePath: gamePath,
            ModsPath: Path.Combine(gamePath, "Mods"),
            MelonLoaderPath: Path.Combine(gamePath, "MelonLoader"),
            Il2CppAssembliesPath: Path.Combine(gamePath, "MelonLoader", "Il2CppAssemblies"),
            HotReplRepoPath: hotReplRepo,
            HostProjectPath: hostProjectPath,
            HostOutputPath: hostOutputPath);
    }
}
