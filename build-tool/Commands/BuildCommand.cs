using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Output;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class BuildCommand : AsyncCommand<BuildCommand.Settings>
{
    private readonly string _repoRoot;
    private readonly IProcessRunner _runner;
    private readonly CommandResultStore _resultStore;

    public BuildCommand()
        : this(Directory.GetCurrentDirectory(), new CliWrapProcessRunner(), new CommandResultStore())
    {
    }

    public BuildCommand(string repoRoot, IProcessRunner runner, CommandResultStore? resultStore = null)
    {
        _repoRoot = repoRoot;
        _runner = runner;
        _resultStore = resultStore ?? new CommandResultStore();
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
            return ExitCodes.InvalidUsage;
        }

        var projectFiles = Directory.EnumerateFiles(modsRoot, "*.csproj", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.Ordinal)
            .ToArray();
        if (projectFiles.Length == 0)
        {
            Console.WriteLine("No mod projects found in mods/");
            _resultStore.SetData(new { projectCount = 0, failed = false });
            return ExitCodes.Success;
        }

        var failed = false;
        foreach (var projectFile in projectFiles)
        {
            var modName = Path.GetFileNameWithoutExtension(projectFile);
            Console.WriteLine($"Building {modName}...");

            var request = new ProcessRequest(
                Program: "dotnet",
                Arguments: new[] { "build", projectFile, "-c", "Release", "--no-incremental" });
            ProcessResult result;
            try
            {
                result = await _runner.RunAsync(request, CancellationToken.None);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Failed to start dotnet build for {modName}: {ex.Message}");
                _resultStore.SetErrorDetails(new { modName, projectFile, message = ex.Message });
                return ExitCodes.Unreachable;
            }
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

        var data = new { projectCount = projectFiles.Length, failed };
        if (failed)
            _resultStore.SetErrorDetails(data);
        else
            _resultStore.SetData(data);
        Console.WriteLine(failed ? "Build completed with errors!" : "Build complete!");
        return failed ? ExitCodes.CommandFailed : ExitCodes.Success;
    }
}
