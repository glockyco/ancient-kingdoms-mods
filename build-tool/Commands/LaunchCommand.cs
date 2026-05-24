using System;
using System.ComponentModel;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using BuildTool.Output;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class LaunchCommand : AsyncCommand<LaunchCommand.Settings>
{
    private const string LegacyMelonLoaderLoadedBanner = "MelonLoader Loaded.";
    private const string SupportModuleLoadedBanner = "Support Module Loaded:";
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly bool _isMacOs;
    private readonly CommandResultStore _resultStore;

    public LaunchCommand()
        : this(
            LocalConfigLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner(),
            OperatingSystem.IsMacOS(),
            new CommandResultStore())
    {
    }

    public LaunchCommand(
        LocalConfig config,
        IProcessRunner runner,
        bool isMacOs,
        CommandResultStore? resultStore = null)
    {
        _config = config;
        _runner = runner;
        _isMacOs = isMacOs;
        _resultStore = resultStore ?? new CommandResultStore();
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--wait")]
        [Description("Block until the MelonLoader bootstrap banner appears.")]
        public bool Wait { get; set; }

    }


    public static Task<int> Invoke(LocalConfig config, IProcessRunner runner, bool isMacOs, string[] args)
    {
        var settings = new Settings { Wait = HasFlag(args, "--wait") };

        return new LaunchCommand(config, runner, isMacOs).ExecuteAsync(null!, settings);
    }

    public override async Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        var gameExe = Path.Combine(_config.GamePath, "ancientkingdoms.exe");
        if (!File.Exists(gameExe))
        {
            Console.Error.WriteLine($"Error: Game executable not found at: {gameExe}");
            return ExitCodes.Unreachable;
        }

        var gameArgs = Array.Empty<string>();
        ProcessRequest request;
        try
        {
            request = GameLauncher.BuildLaunchRequest(_config, gameArgs, _isMacOs);
        }
        catch (InvalidOperationException ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            _resultStore.SetErrorDetails(new { gamePath = _config.GamePath, message = ex.Message });
            return ExitCodes.InvalidUsage;
        }

        Console.WriteLine("Launching Ancient Kingdoms for HotRepl...");
        Console.WriteLine($"  Game: {_config.GamePath}");
        Console.WriteLine($"  Command: {request.Program} {string.Join(' ', request.Arguments)}".TrimEnd());
        Console.WriteLine();

        var logPath = Path.Combine(_config.MelonLoaderPath, "Latest.log");
        if (!settings.Wait)
        {
            Task<ProcessResult> launchTask;
            try
            {
                launchTask = _runner.RunAsync(request, CancellationToken.None);
            }
            catch (Exception ex)
            {
                ReportLaunchFailure(request, logPath, settings, ex.Message);
                return ExitCodes.CommandFailed;
            }

            var startupCompleted = await Task.WhenAny(launchTask, Task.Delay(TimeSpan.FromSeconds(1)));
            if (startupCompleted != launchTask)
            {
                ReportLaunchSuccess(request, logPath, settings, status: "started");
                return ExitCodes.Success;
            }

            try
            {
                var result = await launchTask;
                if (result.ExitCode == 0)
                {
                    ReportLaunchSuccess(request, logPath, settings, status: "exited", result.ExitCode);
                    return ExitCodes.Success;
                }

                ReportLaunchFailure(request, logPath, settings, $"Game exited with code {result.ExitCode}.", result.ExitCode);
                return ExitCodes.CommandFailed;
            }
            catch (Exception ex)
            {
                ReportLaunchFailure(request, logPath, settings, ex.Message);
                return ExitCodes.CommandFailed;
            }
        }

        Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
        File.WriteAllText(logPath, string.Empty);

        using var bannerCts = new CancellationTokenSource(TimeSpan.FromSeconds(120));
        var bannerTask = WaitForBannerAsync(logPath, bannerCts.Token);
        Task<ProcessResult> runTask;
        try
        {
            runTask = _runner.RunAsync(request, CancellationToken.None);
        }
        catch (Exception ex)
        {
            ReportLaunchFailure(request, logPath, settings, ex.Message);
            return ExitCodes.CommandFailed;
        }

        var completed = await Task.WhenAny(bannerTask, runTask);
        if (completed == bannerTask && await bannerTask)
        {
            ReportLaunchSuccess(request, logPath, settings, status: "ready");
            return ExitCodes.Success;
        }

        if (completed == runTask)
        {
            try
            {
                var result = await runTask;
                if (result.ExitCode == 0)
                {
                    ReportLaunchFailure(
                        request,
                        logPath,
                        settings,
                        "Game exited before the MelonLoader bootstrap banner appeared.",
                        result.ExitCode);
                    return ExitCodes.CommandFailed;
                }

                ReportLaunchFailure(request, logPath, settings, $"Game exited with code {result.ExitCode}.", result.ExitCode);
                return ExitCodes.CommandFailed;
            }
            catch (Exception ex)
            {
                ReportLaunchFailure(request, logPath, settings, ex.Message);
                return ExitCodes.CommandFailed;
            }
        }

        ReportLaunchFailure(request, logPath, settings, "Timed out waiting for MelonLoader bootstrap.");
        return ExitCodes.ReadinessFailed;
    }

    private void ReportLaunchSuccess(
        ProcessRequest request,
        string logPath,
        Settings settings,
        string status,
        int? exitCode = null)
    {
        _resultStore.SetData(new
        {
            gamePath = _config.GamePath,
            logPath,
            wait = settings.Wait,
            program = request.Program,
            arguments = request.Arguments,
            status,
            exitCode,
        });
    }

    private void ReportLaunchFailure(
        ProcessRequest request,
        string logPath,
        Settings settings,
        string message,
        int? exitCode = null)
    {
        Console.Error.WriteLine($"Error: failed to launch game: {message}");
        _resultStore.SetErrorDetails(new
        {
            gamePath = _config.GamePath,
            logPath,
            wait = settings.Wait,
            program = request.Program,
            arguments = request.Arguments,
            message,
            exitCode,
        });
    }

    internal static bool IsMelonLoaderReadyLog(string text) =>
        text.Contains(LegacyMelonLoaderLoadedBanner, StringComparison.Ordinal)
        || text.Contains(SupportModuleLoadedBanner, StringComparison.Ordinal);
    private static async Task<bool> WaitForBannerAsync(string logPath, CancellationToken cancellationToken)
    {
        var stream = new LogStream(logPath, TimeSpan.FromMilliseconds(200));
        var buffer = new StringBuilder();
        try
        {
            await foreach (var chunk in stream.ReadAsync(cancellationToken))
            {
                buffer.Append(chunk);
                Console.Write(chunk);
                if (IsMelonLoaderReadyLog(buffer.ToString()))
                    return true;
            }
        }
        catch (OperationCanceledException)
        {
        }

        return false;
    }

    private static bool HasFlag(string[] args, string name) =>
        Array.Exists(args, arg => string.Equals(arg, name, StringComparison.OrdinalIgnoreCase));
}
