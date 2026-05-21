using System;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.HotRepl;
using BuildTool.Output;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class DeployHostCommand : AsyncCommand<DeployHostCommand.Settings>
{
    private readonly string _repoRoot;
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly CommandResultStore _resultStore;

    public DeployHostCommand()
        : this(
            Directory.GetCurrentDirectory(),
            LocalConfigLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner(),
            new CommandResultStore())
    {
    }

    public DeployHostCommand(
        string repoRoot,
        LocalConfig config,
        IProcessRunner runner,
        CommandResultStore? resultStore = null)
    {
        _repoRoot = repoRoot;
        _config = config;
        _runner = runner;
        _resultStore = resultStore ?? new CommandResultStore();
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--configuration <CONFIGURATION>")]
        [Description("Build configuration for the HotRepl host.")]
        public string Configuration { get; set; } = "Debug";

        [CommandOption("--hotrepl-repo <PATH>")]
        [Description("Path to the HotRepl repository checkout.")]
        public string? HotReplRepo { get; set; }
    }

    public static Task<int> Invoke(string repoRoot, LocalConfig config, IProcessRunner runner, string[] args)
    {
        var settings = new Settings
        {
            Configuration = ReadOption(args, "--configuration") ?? "Debug",
            HotReplRepo = ReadOption(args, "--hotrepl-repo"),
        };
        return new DeployHostCommand(repoRoot, config, runner).ExecuteAsync(null!, settings);
    }

    public override async Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        var configuration = string.IsNullOrWhiteSpace(settings.Configuration) ? "Debug" : settings.Configuration;
        var paths = HotReplPaths.Resolve(_repoRoot, _config.GamePath, configuration, settings.HotReplRepo);

        Console.WriteLine("Building HotRepl MelonLoader host...");
        Console.WriteLine($"  HotRepl repo: {paths.HotReplRepoPath}");
        Console.WriteLine($"  Host project: {paths.HostProjectPath}");
        Console.WriteLine($"  Game: {paths.GamePath}");
        Console.WriteLine($"  Mods: {paths.ModsPath}");
        Console.WriteLine();

        var buildExit = await HotReplDeployer.BuildAsync(paths, configuration, _runner, CancellationToken.None);
        if (buildExit != 0)
        {
            _resultStore.SetErrorDetails(new { paths.HostProjectPath, buildExit });
            return ExitCodes.CommandFailed;
        }

        try
        {
            var report = HotReplDeployer.Deploy(paths.HostOutputPath, paths.ModsPath);
            _resultStore.SetData(new
            {
                copiedFiles = report.CopiedFiles.Select(Path.GetFileName).ToArray(),
                copiedDirectories = report.CopiedDirectories.Select(Path.GetFileName).ToArray(),
                paths.ModsPath,
            });
            foreach (var copiedFile in report.CopiedFiles)
                Console.WriteLine($"  copied {Path.GetFileName(copiedFile)}");
            foreach (var copiedDir in report.CopiedDirectories)
                Console.WriteLine($"  copied {Path.GetFileName(copiedDir)}/");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: HotRepl deploy failed: {ex.Message}");
            Console.Error.WriteLine("Note: Close the game before deploying to avoid file lock issues.");
            _resultStore.SetErrorDetails(new { paths.ModsPath, message = ex.Message });
            return ExitCodes.LeaseConflict;
        }

        Console.WriteLine("HotRepl deploy complete.");
        return ExitCodes.Success;
    }

    private static string? ReadOption(string[] args, string name)
    {
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (args[i] == name)
                return args[i + 1];
        }

        return null;
    }
}
