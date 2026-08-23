using System;
using System.ComponentModel;
using System.IO;
using System.Threading;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using BuildTool.HotRepl;
using BuildTool.Output;
using BuildTool.UnityDependencies;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

public sealed class ExportCommand : AsyncCommand<ExportCommand.Settings>
{
    private readonly string _repoRoot;
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly CommandResultStore _resultStore;
    private readonly UnityDependenciesPreflight _unityDependenciesPreflight;
    private readonly Func<HotReplRunnerOptions, CancellationToken, Task<ExportRunnerResult>> _exportRunner;

    private readonly TimeSpan? _hotReplReadinessTimeout;
    private readonly TimeSpan? _hotReplPollInterval;
    public ExportCommand()
        : this(
            Directory.GetCurrentDirectory(),
            LocalConfigLoader.Load(
                Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner(),
            new CommandResultStore(),
            unityDependenciesPreflight: new UnityDependenciesPreflight())
    {
    }

    public ExportCommand(
        string repoRoot,
        LocalConfig config,
        IProcessRunner runner,
        CommandResultStore? resultStore = null,
        TimeSpan? hotReplReadinessTimeout = null,
        TimeSpan? hotReplPollInterval = null,
        Func<HotReplRunnerOptions, CancellationToken, Task<ExportRunnerResult>>? exportRunner = null,
        UnityDependenciesPreflight? unityDependenciesPreflight = null)
    {
        _repoRoot                   = repoRoot;
        _config                     = config;
        _runner                     = runner;
        _resultStore                = resultStore ?? new CommandResultStore();
        _unityDependenciesPreflight = unityDependenciesPreflight ?? new UnityDependenciesPreflight();
        _hotReplReadinessTimeout    = hotReplReadinessTimeout;
        _hotReplPollInterval        = hotReplPollInterval;
        _exportRunner               = exportRunner ?? RunHotReplExportAsync;
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--screenshots")]
        [Description("Also capture map screenshots.")]
        public bool Screenshots { get; set; }

        [CommandOption("--update")]
        [Description("Ask Steam to bring the game current before exporting.")]
        public bool Update { get; set; }

        [CommandOption("--unity-version <VERSION>")]
        [Description("Override the Unity version used for MelonLoader reference assemblies.")]
        public string? UnityVersion { get; set; }
    }

    internal Task<int> RunAsync(Settings settings, CancellationToken cancellationToken = default) =>
        ExecuteAsync(null!, settings, cancellationToken);

    protected override async Task<int> ExecuteAsync(
        CommandContext context,
        Settings settings,
        CancellationToken cancellationToken)
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
                _config, _runner, cancellationToken);
            if (updateResult != 0) return updateResult;
        }

        if (settings.UnityVersion is not null)
        {
            Console.Error.WriteLine(
                $"WARNING: --unity-version {settings.UnityVersion} override supplied. "
                + "MelonLoader reference assemblies may not match the running game.");
        }
        else
        {
            var preflight = await _unityDependenciesPreflight.CheckAsync(
                _config.MelonLoaderPath,
                cancellationToken);
            if (preflight.Status == UnityDependenciesPreflightStatus.ReleaseMissing)
            {
                var message = MissingReleaseMessage(preflight);
                Console.Error.WriteLine($"Error: {message}");
                _resultStore.SetErrorDetails(new { message });
                return ExitCodes.Unreachable;
            }

            if (preflight.Status == UnityDependenciesPreflightStatus.CheckInconclusive)
            {
                Console.Error.WriteLine(
                    "Warning: Could not verify the MelonLoader UnityDependencies release "
                    + $"{preflight.UnityVersion ?? "for the detected Unity version"}; proceeding. "
                    + (preflight.Detail ?? "The upstream check was inconclusive."));
            }
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
            var gameArgs = settings.UnityVersion is null
                ? Array.Empty<string>()
                : new[] { "--melonloader.unityversion", settings.UnityVersion };
            request = GameLauncher.BuildLaunchRequest(_config, gameArgs);
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

        using var gameCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        Task<ProcessResult> runTask;
        try
        {
            runTask = _runner.RunAsync(request, gameCts.Token);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: failed to launch game: {ex.Message}");
            return ExitCodes.CommandFailed;
        }

        // Stream log concurrently while runner orchestrates the export. Some
        // MelonLoader startup failures never make it to HotRepl, so the log
        // monitor must also surface known fatal startup errors.
        using var logCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var logTask = StreamLogAndDetectFatalAsync(logPath, logCts.Token);

        var runnerOptions = new HotReplRunnerOptions
        {
            Endpoint = new Uri(_config.HotReplEndpoint),
            Screenshots = settings.Screenshots,
            ReadinessTimeout = _hotReplReadinessTimeout ?? TimeSpan.FromMinutes(5),
            JobTimeout = TimeSpan.FromMinutes(60),
            PollInterval = _hotReplPollInterval ?? TimeSpan.FromSeconds(3),
        };

        ExportRunnerResult runnerResult;
        using var runnerCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var runnerTask = _exportRunner(runnerOptions, runnerCts.Token);
        var completedTask = await Task.WhenAny((Task)runnerTask, logTask);

        if (completedTask == logTask)
        {
            var logResult = await logTask;
            if (logResult is not null)
            {
                runnerCts.Cancel();
                gameCts.Cancel();
                await ObserveGameExitAsync(runTask);
                runnerResult = logResult;
            }
            else
            {
                runnerResult = await runnerTask;
            }
        }
        else
        {
            runnerResult = await runnerTask;
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

    private static async Task<ExportRunnerResult> RunHotReplExportAsync(
        HotReplRunnerOptions runnerOptions,
        CancellationToken cancellationToken)
    {
        try
        {
            return await HotReplExportRunner.Create(runnerOptions)
                .RunAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            return new ExportRunnerResult(false, ExitCodes.Internal,
                $"Runner threw: {ex.Message}");
        }
    }

    private static async Task<ExportRunnerResult?> StreamLogAndDetectFatalAsync(
        string logPath, CancellationToken cancellationToken)
    {
        var stream = new LogStream(logPath, TimeSpan.FromMilliseconds(100));
        var recentLog = string.Empty;
        await foreach (var chunk in stream.ReadAsync(cancellationToken))
        {
            Console.Write(chunk);
            recentLog = recentLog.Length + chunk.Length > 8192
                ? string.Concat(recentLog, chunk)[^8192..]
                : string.Concat(recentLog, chunk);

            var fatalMessage = TryDetectFatalMelonLoaderError(recentLog);
            if (fatalMessage is not null)
                return new ExportRunnerResult(false, ExitCodes.ReadinessFailed, fatalMessage);
        }

        return null;
    }

    private static string? TryDetectFatalMelonLoaderError(string logText)
    {
        if (logText.Contains("UnityDependencies_", StringComparison.OrdinalIgnoreCase)
            && logText.Contains("does not Exist!", StringComparison.OrdinalIgnoreCase))
        {
            var match = Regex.Match(logText, @"UnityDependencies_[^\\/\s]+\.zip",
                RegexOptions.IgnoreCase);
            var dependency = match.Success ? match.Value : "UnityDependencies_<unity-version>.zip";
            return "MelonLoader failed before HotRepl startup: missing Unity dependency "
                + $"{dependency}. Download Managed.zip from the matching "
                + "LavaGang/MelonLoader.UnityDependencies release and save it with that filename "
                + "under MelonLoader/Dependencies/Il2CppAssemblyGenerator, then rerun export.";
        }

        if (logText.Contains("Failed to Process UnityDependencies", StringComparison.OrdinalIgnoreCase))
        {
            return "MelonLoader failed before HotRepl startup while processing Unity dependencies. "
                + "Refresh the matching UnityDependencies_<unity-version>.zip from "
                + "LavaGang/MelonLoader.UnityDependencies, then rerun export.";
        }

        return null;
    }

    private static string MissingReleaseMessage(UnityDependenciesPreflightResult result) =>
        "MelonLoader UnityDependencies release check returned 404. "
        + $"URL: {result.ReleaseUrl}. Unity version detected: {result.UnityVersion}. "
        + "Upstream publishes these releases on a weekly cadence, so it will likely appear "
        + "within days. Pass --unity-version <version> to override with a different published "
        + "version at the cost of generating against mismatched reference assemblies.";

    private static async Task ObserveGameExitAsync(Task<ProcessResult> runTask)
    {
        try
        {
            await runTask;
        }
        catch (OperationCanceledException)
        {
        }
    }
}
