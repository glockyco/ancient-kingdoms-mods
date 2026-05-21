using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class ExportCommand : AsyncCommand<ExportCommand.Settings>
{
    private readonly string _repoRoot;
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly bool _isMacOs;

    public ExportCommand()
        : this(
            Directory.GetCurrentDirectory(),
            LocalConfigLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner(),
            OperatingSystem.IsMacOS())
    {
    }

    public ExportCommand(string repoRoot, LocalConfig config, IProcessRunner runner, bool isMacOs)
    {
        _repoRoot = repoRoot;
        _config = config;
        _runner = runner;
        _isMacOs = isMacOs;
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

    public static Task<int> Invoke(string repoRoot, LocalConfig config, IProcessRunner runner, bool isMacOs, string[] args)
    {
        var settings = new Settings
        {
            Screenshots = HasFlag(args, "--screenshots"),
            Update = HasFlag(args, "--update"),
        };
        return new ExportCommand(repoRoot, config, runner, isMacOs).ExecuteAsync(null!, settings);
    }

    public override async Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        var gameExe = Path.Combine(_config.GamePath, "ancientkingdoms.exe");
        if (!File.Exists(gameExe))
        {
            Console.Error.WriteLine($"Error: Game executable not found at: {gameExe}");
            return 1;
        }

        if (settings.Update)
        {
            var updateResult = await UpdateCommand.RunSteamUpdateAsync(
                _repoRoot,
                _config,
                _runner);
            if (updateResult != 0)
                return updateResult;
        }

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


        if (!DeleteStaleResultFile())
            return 1;
        var gameArgs = new List<string> { "--export-data" };
        if (settings.Screenshots)
            gameArgs.Add("--export-screenshots");

        var request = GameLauncher.BuildLaunchRequest(_config, gameArgs, _isMacOs);
        Console.WriteLine("Launching game for export...");
        Console.WriteLine($"  Game: {_config.GamePath}");
        Console.WriteLine();
        Console.WriteLine("Streaming MelonLoader log...");
        Console.WriteLine("---");

        var runTask = _runner.RunAsync(request, CancellationToken.None);
        return await WaitForExportResultAsync(logPath, runTask);
    }


    private bool DeleteStaleResultFile()
    {
        var path = Path.Combine(_config.DataExportPath, ExportResultReader.FileName);
        if (!File.Exists(path))
            return true;

        try
        {
            File.Delete(path);
            return true;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: Could not delete stale export result file: {ex.Message}");
            return false;
        }
    }

    private async Task<int> WaitForExportResultAsync(string logPath, Task<ProcessResult> runTask)
    {
        using var logCts = new CancellationTokenSource();
        var logTask = StreamLogAsync(logPath, logCts.Token);
        var outcomeTask = ExportResultReader.WaitForResultAsync(
            _config.DataExportPath,
            TimeSpan.FromMinutes(5),
            CancellationToken.None);

        try
        {
            var completed = await Task.WhenAny(outcomeTask, runTask);
            if (completed == outcomeTask)
                return ReportOutcome(await outcomeTask);

            var result = await runTask;
            var outcome = await ExportResultReader.WaitForResultAsync(
                _config.DataExportPath,
                TimeSpan.Zero,
                CancellationToken.None);
            if (!outcome.TimedOut)
                return ReportOutcome(outcome);

            Console.WriteLine("---");
            Console.WriteLine();
            Console.Error.WriteLine("Error: Export result file not found before the game exited.");
            Console.Error.WriteLine($"Game exited with code: {result.ExitCode}");
            return 7;
        }
        finally
        {
            logCts.Cancel();
            try { await logTask; }
            catch (OperationCanceledException) { }
        }
    }

    private static int ReportOutcome(ExportOutcome outcome)
    {
        if (outcome.Ok)
        {
            Console.WriteLine("---");
            Console.WriteLine();
            Console.WriteLine("Export complete.");
            return 0;
        }

        Console.WriteLine("---");
        Console.WriteLine();
        if (outcome.TimedOut)
        {
            Console.Error.WriteLine("Error: Timed out waiting for export result file.");
            return 6;
        }

        if (outcome.UnknownSchema)
            Console.Error.WriteLine($"Error: {outcome.ErrorMessage}");
        else
            Console.Error.WriteLine("Error: Export result file reported failure.");

        foreach (var exporter in outcome.Exporters)
        {
            if (!exporter.Ok)
                Console.Error.WriteLine($"  {exporter.Name}: {exporter.ErrorMessage}");
        }

        return 7;
    }

    private static async Task StreamLogAsync(string logPath, CancellationToken cancellationToken)
    {
        var stream = new LogStream(logPath, TimeSpan.FromMilliseconds(100));
        await foreach (var chunk in stream.ReadAsync(cancellationToken))
            Console.Write(chunk);
    }


    private static bool HasFlag(string[] args, string name) =>
        Array.Exists(args, arg => string.Equals(arg, name, StringComparison.OrdinalIgnoreCase));
}
