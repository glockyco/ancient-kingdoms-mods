using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using BuildTool.Configuration;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class DeployCommand : AsyncCommand<DeployCommand.Settings>
{
    internal static readonly ISet<string> DisabledDeploymentDllNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "BossMod.dll",
        "BossMod.Core.dll",
    };

    private readonly string _repoRoot;
    private readonly LocalConfig _config;

    public DeployCommand()
        : this(Directory.GetCurrentDirectory(), LocalConfigLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), "Local.props")))
    {
    }

    public DeployCommand(string repoRoot, LocalConfig config)
    {
        _repoRoot = repoRoot;
        _config = config;
    }

    public sealed class Settings : BaseSettings { }

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        Console.WriteLine("Deploying Ancient Kingdoms mods...");

        var modsPath = _config.ModsPath;
        Console.WriteLine($"Mods path: {modsPath}");
        Console.WriteLine();

        Directory.CreateDirectory(modsPath);
        foreach (var removedPath in RemoveDisabledDeploymentArtifacts(modsPath))
            Console.WriteLine($"Removed disabled deployment artifact: {Path.GetFileName(removedPath)}");

        var modsDir = Path.Combine(_repoRoot, "mods");
        var dllFiles = GetDeployableModDlls(modsDir);
        if (dllFiles.Count == 0)
        {
            Console.WriteLine("Warning: No built mods found in mods/ directory. Did you run build first?");
            return Task.FromResult(1);
        }

        foreach (var dllFile in dllFiles)
        {
            var modName = Path.GetFileNameWithoutExtension(dllFile);
            var targetPath = Path.Combine(modsPath, $"{modName}.dll");

            Console.WriteLine($"Deploying {modName}...");
            try
            {
                File.Copy(dllFile, targetPath, overwrite: true);
                Console.WriteLine($"  {modName}.dll copied to mods directory");
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to copy {modName}.dll: {ex.Message}");
                Console.Error.WriteLine("Note: Close the game before deploying to avoid file lock issues.");
                return Task.FromResult(1);
            }
        }

        Console.WriteLine();
        Console.WriteLine("Deploy complete!");
        Console.WriteLine("Note: Close the game before deploying to avoid file lock issues.");
        return Task.FromResult(0);
    }

    internal static List<string> GetDeployableModDlls(string modsDir)
    {
        return Directory.GetFiles(modsDir, "*.dll", SearchOption.AllDirectories)
            .Where(f => f.Contains(Path.Combine("bin", "Release", "net6.0"), StringComparison.Ordinal))
            .Where(f => !DisabledDeploymentDllNames.Contains(Path.GetFileName(f)))
            .OrderBy(f => f, StringComparer.Ordinal)
            .ToList();
    }

    internal static IReadOnlyList<string> RemoveDisabledDeploymentArtifacts(string modsPath)
    {
        var removed = new List<string>();
        foreach (var dllName in DisabledDeploymentDllNames)
        {
            var path = Path.Combine(modsPath, dllName);
            if (!File.Exists(path))
                continue;

            File.Delete(path);
            removed.Add(path);
        }

        return removed;
    }
}
