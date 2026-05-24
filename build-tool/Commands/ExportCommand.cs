using System;
using System.ComponentModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using BuildTool.HotRepl;
using BuildTool.Output;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class ExportCommand : AsyncCommand<ExportCommand.Settings>
{
    private readonly string _repoRoot;
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly bool _isMacOs;
    private readonly CommandResultStore _resultStore;

    public ExportCommand()
        : this(
            Directory.GetCurrentDirectory(),
            LocalConfigLoader.Load(
                Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner(),
            OperatingSystem.IsMacOS(),
            new CommandResultStore())
    {
    }

    public ExportCommand(
        string repoRoot,
        LocalConfig config,
        IProcessRunner runner,
        bool isMacOs,
        CommandResultStore? resultStore = null)
    {
        _repoRoot    = repoRoot;
        _config      = config;
        _runner      = runner;
        _isMacOs     = isMacOs;
        _resultStore = resultStore ?? new CommandResultStore();
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--screenshots")]
        [Description("Also capture map screenshots.")]
        public bool Screenshots { get; set; }

        [CommandOption("--update")]
        [Description("Run steamcmd app_update before export.")]
        public bool Update { get; set; }
    }

    public override async Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        var gameExe = Path.Combine(_config.GamePath, "ancientkingdoms.exe");
        if (!File.Exists(gameExe))
        {
            Console.Error.WriteLine($"Error: Game executable not found at: {gameExe}");
            return ExitCodes.Unreachable;
        }

        if (settings.Update)
        {
            var updateResult = await UpdateCommand.RunSteamUpdateAsync(
                _repoRoot, _config, _runner);
            if (updateResult != 0) return updateResult;
        }

        // Truncate MelonLoader log for clean streaming
        var logPath = Path.Combine(_config.MelonLoaderPath, "Latest.log");
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
            File.WriteAllText(logPath, string.Empty);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Could not truncate log: {ex.Message}");
        }

        // Launch WITHOUT --export-data or --export-screenshots
        ProcessRequest request;
        try
        {
            request = GameLauncher.BuildLaunchRequest(
                _config, Array.Empty<string>(), _isMacOs);
        }
        catch (InvalidOperationException ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            return ExitCodes.InvalidUsage;
        }

        Console.WriteLine("Launching game for HotRepl export...");
        Console.WriteLine($"  Game:   {_config.GamePath}");
        Console.WriteLine($"  HotRepl: {_config.HotReplEndpoint}");
        Console.WriteLine();

        Task<ProcessResult> runTask;
        try
        {
            runTask = _runner.RunAsync(request, CancellationToken.None);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: failed to launch game: {ex.Message}");
            return ExitCodes.CommandFailed;
        }

        // Stream log concurrently while runner orchestrates the export
        using var logCts = new CancellationTokenSource();
        var logTask = StreamLogAsync(logPath, logCts.Token);

        var runnerOptions = new HotReplRunnerOptions
        {
            Endpoint         = new Uri(_config.HotReplEndpoint),
            Screenshots      = settings.Screenshots,
            ReadinessTimeout = TimeSpan.FromMinutes(5),
            JobTimeout       = TimeSpan.FromMinutes(60),
            PollInterval     = TimeSpan.FromSeconds(3),
        };

        ExportRunnerResult runnerResult;
        try
        {
            runnerResult = await HotReplExportRunner.Create(runnerOptions)
                .RunAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            runnerResult = new ExportRunnerResult(false, ExitCodes.Internal,
                $"Runner threw: {ex.Message}");
        }

        logCts.Cancel();
        try { await logTask; } catch (OperationCanceledException) { }

        Console.WriteLine("---");
        Console.WriteLine();

        if (runnerResult.Ok)
        {
            _resultStore.SetData(new { ok = true, message = runnerResult.Message });
            Console.WriteLine("Export complete.");
            return ExitCodes.Success;
        }

        Console.Error.WriteLine($"Error: {runnerResult.Message}");
        _resultStore.SetErrorDetails(new { ok = false, message = runnerResult.Message });
        return runnerResult.ExitCode;
    }

    private static async Task StreamLogAsync(
        string logPath, CancellationToken cancellationToken)
    {
        var stream = new LogStream(logPath, TimeSpan.FromMilliseconds(100));
        await foreach (var chunk in stream.ReadAsync(cancellationToken))
            Console.Write(chunk);
    }
}
