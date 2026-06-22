using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using BuildTool.Configuration;
using BuildTool.Output;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class DeployCommand : AsyncCommand<DeployCommand.Settings>
{

    private readonly string _repoRoot;
    private readonly LocalConfig _config;
    private readonly CommandResultStore _resultStore;

    public DeployCommand()
        : this(Directory.GetCurrentDirectory(), LocalConfigLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), "Local.props")), new CommandResultStore())
    {
    }

    public DeployCommand(string repoRoot, LocalConfig config, CommandResultStore? resultStore = null)
    {
        _repoRoot = repoRoot;
        _config = config;
        _resultStore = resultStore ?? new CommandResultStore();
    }

    public sealed class Settings : BaseSettings { }

    public override Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        Console.WriteLine("Deploying Ancient Kingdoms mods...");

        var modsPath = _config.ModsPath;
        Console.WriteLine($"Mods path: {modsPath}");
        Console.WriteLine();

        Directory.CreateDirectory(modsPath);

        var modsDir = Path.Combine(_repoRoot, "mods");
        var dllFiles = GetDeployableModDlls(modsDir);
        if (dllFiles.Count == 0)
        {
            Console.WriteLine("Warning: No built mods found in mods/ directory. Did you run build first?");
            _resultStore.SetErrorDetails(new { modsDir, deployedCount = 0 });
            return Task.FromResult(ExitCodes.InvalidUsage);
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
                _resultStore.SetErrorDetails(new { modName, targetPath, message = ex.Message });
                return Task.FromResult(ExitCodes.ResourceConflict);
            }
        }

        Console.WriteLine();
        _resultStore.SetData(new
        {
            modsPath,
            deployedCount = dllFiles.Count,
            deployed = dllFiles.Select(Path.GetFileName).ToArray(),
        });
        Console.WriteLine("Deploy complete!");
        Console.WriteLine("Note: Close the game before deploying to avoid file lock issues.");
        return Task.FromResult(ExitCodes.Success);
    }

    internal static List<string> GetDeployableModDlls(string modsDir)
    {
        return Directory.GetFiles(modsDir, "*.dll", SearchOption.AllDirectories)
            .Where(f => f.Contains(Path.Combine("bin", "Release", "net6.0"), StringComparison.Ordinal))
            .OrderBy(f => f, StringComparer.Ordinal)
            .ToList();
    }
}
