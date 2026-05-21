using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class BuildCommand : AsyncCommand<BuildCommand.Settings>
{
    private readonly string _repoRoot;
    private readonly IProcessRunner _runner;

    public BuildCommand()
        : this(Directory.GetCurrentDirectory(), new CliWrapProcessRunner())
    {
    }

    public BuildCommand(string repoRoot, IProcessRunner runner)
    {
        _repoRoot = repoRoot;
        _runner = runner;
    }

    public sealed class Settings : BaseSettings { }

    public override async Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        Console.WriteLine("Building Ancient Kingdoms mods...");
        var gamePath = Environment.GetEnvironmentVariable("ANCIENT_KINGDOMS_PATH");
        Console.WriteLine($"Game path: {gamePath}");
        Console.WriteLine();

        var modsRoot = Path.Combine(_repoRoot, "mods");
        if (!Directory.Exists(modsRoot))
        {
            Console.WriteLine("Warning: mods/ directory not found");
            return 1;
        }

        var projectFiles = Directory.EnumerateFiles(modsRoot, "*.csproj", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.Ordinal)
            .ToArray();
        if (projectFiles.Length == 0)
        {
            Console.WriteLine("No mod projects found in mods/");
            return 0;
        }

        var failed = false;
        foreach (var projectFile in projectFiles)
        {
            var modName = Path.GetFileNameWithoutExtension(projectFile);
            Console.WriteLine($"Building {modName}...");

            var request = new ProcessRequest(
                Program: "dotnet",
                Arguments: new[] { "build", projectFile, "-c", "Release", "--no-incremental" });
            var result = await _runner.RunAsync(request, CancellationToken.None);
            if (!string.IsNullOrWhiteSpace(result.StandardOutput))
                Console.WriteLine(result.StandardOutput);
            if (!string.IsNullOrWhiteSpace(result.StandardError))
                Console.Error.WriteLine(result.StandardError);

            if (result.ExitCode != 0)
            {
                Console.Error.WriteLine($"Failed to build {modName}");
                failed = true;
            }

            Console.WriteLine();
        }

        Console.WriteLine(failed ? "Build completed with errors!" : "Build complete!");
        return failed ? 1 : 0;
    }
}
