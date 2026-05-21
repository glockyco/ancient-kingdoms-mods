using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using System.Text;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class ExportCommand : AsyncCommand<ExportCommand.Settings>
{
    private const string ExportCompleteMarker = "All exports complete. Quitting.";
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
            var updateResult = await RunSteamUpdateAsync();
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
        return await WaitForExportCompletionAsync(logPath, runTask);
    }

    private async Task<int> RunSteamUpdateAsync()
    {
        var steamUser = ReadSteamUsername(Path.Combine(_repoRoot, "config.toml"));
        if (string.IsNullOrEmpty(steamUser))
        {
            Console.Error.WriteLine("Error: Steam username not found in config.toml.");
            Console.Error.WriteLine("Add it under [steam] username = \"your_username\"");
            return 1;
        }

        Console.WriteLine("Running steamcmd to update Ancient Kingdoms...");
        Console.WriteLine($"  Steam user: {steamUser}");
        Console.WriteLine($"  Install dir: {_config.GamePath}");
        Console.WriteLine();

        var request = new ProcessRequest(
            Program: "steamcmd",
            Arguments: new[]
            {
                "+@sSteamCmdForcePlatformType",
                "windows",
                "+force_install_dir",
                _config.GamePath,
                "+login",
                steamUser,
                "+app_update",
                "2241380",
                "validate",
                "+quit",
            });
        var result = await _runner.RunAsync(request, CancellationToken.None);
        if (result.ExitCode != 0)
        {
            Console.Error.WriteLine($"Error: steamcmd exited with code {result.ExitCode}.");
            return 1;
        }

        Console.WriteLine();
        Console.WriteLine("Steam update complete.");
        Console.WriteLine();
        return 0;
    }

    private static async Task<int> WaitForExportCompletionAsync(string logPath, Task<ProcessResult> runTask)
    {
        using var timeoutCts = new CancellationTokenSource(TimeSpan.FromMinutes(5));
        var markerTask = WatchForMarkerAsync(logPath, timeoutCts.Token);
        var completed = await Task.WhenAny(markerTask, runTask);

        if (completed == markerTask)
            return await markerTask ? 0 : 6;

        var result = await runTask;
        timeoutCts.Cancel();
        if (File.Exists(logPath) && File.ReadAllText(logPath).Contains(ExportCompleteMarker, StringComparison.Ordinal))
            return 0;

        Console.WriteLine("---");
        Console.WriteLine();
        Console.Error.WriteLine("Error: Export completion signal not found in log.");
        Console.Error.WriteLine($"Game exited with code: {result.ExitCode}");
        return 7;
    }

    private static async Task<bool> WatchForMarkerAsync(string logPath, CancellationToken cancellationToken)
    {
        var stream = new LogStream(logPath, TimeSpan.FromMilliseconds(100));
        var buffer = new StringBuilder();
        try
        {
            await foreach (var chunk in stream.ReadAsync(cancellationToken))
            {
                buffer.Append(chunk);
                Console.Write(chunk);
                if (buffer.ToString().Contains(ExportCompleteMarker, StringComparison.Ordinal))
                    return true;
            }
        }
        catch (OperationCanceledException)
        {
        }

        return false;
    }

    private static string? ReadSteamUsername(string configPath)
    {
        if (!File.Exists(configPath))
            return null;

        var inSteamSection = false;
        foreach (var line in File.ReadLines(configPath))
        {
            var trimmed = line.Trim();
            if (trimmed.StartsWith("[", StringComparison.Ordinal))
                inSteamSection = trimmed == "[steam]";

            if (inSteamSection && trimmed.StartsWith("username", StringComparison.Ordinal))
            {
                var eq = trimmed.IndexOf('=');
                if (eq < 0) continue;
                return trimmed[(eq + 1)..].Trim().Trim('"');
            }
        }

        return null;
    }

    private static bool HasFlag(string[] args, string name) =>
        Array.Exists(args, arg => string.Equals(arg, name, StringComparison.OrdinalIgnoreCase));
}
