using System;
using System.ComponentModel;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class LaunchCommand : AsyncCommand<LaunchCommand.Settings>
{
    private const string MelonLoaderLoadedBanner = "MelonLoader Loaded.";
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly bool _isMacOs;

    public LaunchCommand()
        : this(
            LocalConfigLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner(),
            OperatingSystem.IsMacOS())
    {
    }

    public LaunchCommand(LocalConfig config, IProcessRunner runner, bool isMacOs)
    {
        _config = config;
        _runner = runner;
        _isMacOs = isMacOs;
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--wait")]
        [Description("Block until the MelonLoader bootstrap banner appears.")]
        public bool Wait { get; set; }

        [CommandOption("--export")]
        [Description("Pass --export-data to the game on launch.")]
        public bool Export { get; set; }
    }

    public static Task<int> Invoke(LocalConfig config, IProcessRunner runner, bool isMacOs, string[] args)
    {
        var settings = new Settings
        {
            Wait = HasFlag(args, "--wait"),
            Export = HasFlag(args, "--export"),
        };
        return new LaunchCommand(config, runner, isMacOs).ExecuteAsync(null!, settings);
    }

    public override async Task<int> ExecuteAsync(CommandContext context, Settings settings)
    {
        var gameExe = Path.Combine(_config.GamePath, "ancientkingdoms.exe");
        if (!File.Exists(gameExe))
        {
            Console.Error.WriteLine($"Error: Game executable not found at: {gameExe}");
            return 1;
        }

        var gameArgs = settings.Export ? new[] { "--export-data" } : Array.Empty<string>();
        var request = GameLauncher.BuildLaunchRequest(_config, gameArgs, _isMacOs);

        Console.WriteLine(settings.Export
            ? "Launching Ancient Kingdoms for export..."
            : "Launching Ancient Kingdoms for HotRepl...");
        Console.WriteLine($"  Game: {_config.GamePath}");
        Console.WriteLine($"  Command: {request.Program} {string.Join(' ', request.Arguments)}".TrimEnd());
        Console.WriteLine();

        if (!settings.Wait)
        {
            var launchTask = _runner.RunAsync(request, CancellationToken.None);
            var startupCompleted = await Task.WhenAny(launchTask, Task.Delay(TimeSpan.FromSeconds(1)));
            if (startupCompleted != launchTask)
                return 0;

            try
            {
                var result = await launchTask;
                return result.ExitCode == 0 ? 0 : 7;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: failed to launch game: {ex.Message}");
                return 7;
            }
        }

        var logPath = Path.Combine(_config.MelonLoaderPath, "Latest.log");
        Directory.CreateDirectory(Path.GetDirectoryName(logPath)!);
        File.WriteAllText(logPath, string.Empty);

        using var bannerCts = new CancellationTokenSource(TimeSpan.FromSeconds(120));
        var bannerTask = WaitForBannerAsync(logPath, bannerCts.Token);
        var runTask = _runner.RunAsync(request, CancellationToken.None);

        var completed = await Task.WhenAny(bannerTask, runTask);
        if (completed == bannerTask && await bannerTask)
            return 0;
        if (completed == runTask)
            return runTask.Result.ExitCode == 0 ? 0 : 7;
        return 6;
    }

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
                if (buffer.ToString().Contains(MelonLoaderLoadedBanner, StringComparison.Ordinal))
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
