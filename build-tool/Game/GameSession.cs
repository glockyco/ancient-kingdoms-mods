using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Output;
using BuildTool.UnityDependencies;

namespace BuildTool.Game;

/// <summary>Why a session could not reach the point of running its work.</summary>
internal sealed record GameSessionFailure(int ExitCode, string Message);

/// <summary>
/// Result of a session: either the work's own result, or why the session failed before or
/// during it.
/// </summary>
internal sealed record GameSessionOutcome<T>(T? Work, GameSessionFailure? Failure)
{
    public bool Ok => Failure is null;
}

internal sealed record GameSessionRequest
{
    /// <summary>Ask Steam to bring the game current before launching.</summary>
    public bool RunSteamUpdate { get; init; }

    /// <summary>Override the Unity version MelonLoader generates against.</summary>
    public string? UnityVersionOverride { get; init; }

    /// <summary>What the session is for, used in the banner it prints.</summary>
    public required string Purpose { get; init; }
}

/// <summary>
/// Launches the game and runs one piece of work against the running host, then shuts down.
/// </summary>
/// <remarks>
/// Some MelonLoader start-up failures never reach the runtime host, so the work races the
/// game log: whichever finishes first decides the outcome. Without that, a failed start-up
/// would appear as a readiness timeout minutes later instead of the error it was.
/// </remarks>
internal sealed class GameSession
{
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly UnityDependenciesPreflight _unityDependenciesPreflight;

    internal GameSession(
        LocalConfig config,
        IProcessRunner runner,
        UnityDependenciesPreflight? unityDependenciesPreflight = null)
    {
        _config = config;
        _runner = runner;
        _unityDependenciesPreflight = unityDependenciesPreflight ?? new UnityDependenciesPreflight();
    }

    internal async Task<GameSessionOutcome<T>> RunAsync<T>(
        GameSessionRequest request,
        Func<CancellationToken, Task<T>> work,
        CancellationToken cancellationToken)
    {
        var gameExe = Path.Combine(_config.GamePath, "ancientkingdoms.exe");
        if (!File.Exists(gameExe))
            return Failed<T>(ExitCodes.Unreachable,
                $"Game executable not found at: {gameExe}");

        if (request.RunSteamUpdate)
        {
            var updateResult = await UpdateCommandBridge(cancellationToken);
            if (updateResult != ExitCodes.Success)
                return Failed<T>(updateResult, "Steam update did not complete.");
        }

        var preflightFailure = await CheckUnityDependenciesAsync(request, cancellationToken);
        if (preflightFailure != null)
            return new GameSessionOutcome<T>(default, preflightFailure);

        var logPath = TruncateLog();

        ProcessRequest launch;
        try
        {
            var gameArgs = request.UnityVersionOverride is null
                ? Array.Empty<string>()
                : new[] { "--melonloader.unityversion", request.UnityVersionOverride };
            launch = GameLauncher.BuildLaunchRequest(_config, gameArgs);
        }
        catch (InvalidOperationException ex)
        {
            return Failed<T>(ExitCodes.InvalidUsage, ex.Message);
        }

        Console.WriteLine($"Launching game for {request.Purpose}...");
        Console.WriteLine($"  Game:   {_config.GamePath}");
        Console.WriteLine($"  HotRepl: {_config.HotReplEndpoint}");
        Console.WriteLine();

        using var gameCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        Task<ProcessResult> gameTask;
        try
        {
            gameTask = _runner.RunAsync(launch, gameCts.Token);
        }
        catch (Exception ex)
        {
            return Failed<T>(ExitCodes.CommandFailed, $"failed to launch game: {ex.Message}");
        }

        using var logCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var logTask = StreamLogAndDetectFatalAsync(logPath, logCts.Token);

        using var workCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var workTask = work(workCts.Token);

        GameSessionOutcome<T> outcome;
        var finished = await Task.WhenAny((Task)workTask, logTask);

        if (finished == logTask)
        {
            var fatal = await logTask;
            if (fatal is not null)
            {
                // The game will not reach a usable state, so stop waiting on the work.
                workCts.Cancel();
                gameCts.Cancel();
                await ObserveGameExitAsync(gameTask);
                outcome = new GameSessionOutcome<T>(default,
                    new GameSessionFailure(ExitCodes.ReadinessFailed, fatal));
            }
            else
            {
                outcome = new GameSessionOutcome<T>(await workTask, null);
            }
        }
        else
        {
            outcome = new GameSessionOutcome<T>(await workTask, null);
        }

        logCts.Cancel();
        try { await logTask; } catch (OperationCanceledException) { }

        Console.WriteLine("---");
        Console.WriteLine();

        return outcome;
    }

    private async Task<int> UpdateCommandBridge(CancellationToken cancellationToken)
        => await Commands.UpdateCommand.RunSteamUpdateAsync(_config, _runner, cancellationToken);

    private async Task<GameSessionFailure?> CheckUnityDependenciesAsync(
        GameSessionRequest request, CancellationToken cancellationToken)
    {
        if (request.UnityVersionOverride is not null)
        {
            Console.Error.WriteLine(
                $"WARNING: --unity-version {request.UnityVersionOverride} override supplied. "
                + "MelonLoader reference assemblies may not match the running game.");
            return null;
        }

        var preflight = await _unityDependenciesPreflight.CheckAsync(
            _config.MelonLoaderPath, cancellationToken);

        if (preflight.Status == UnityDependenciesPreflightStatus.ReleaseMissing)
            return new GameSessionFailure(ExitCodes.Unreachable, MissingReleaseMessage(preflight));

        if (preflight.Status == UnityDependenciesPreflightStatus.CheckInconclusive)
        {
            Console.Error.WriteLine(
                "Warning: Could not verify the MelonLoader UnityDependencies release "
                + $"{preflight.UnityVersion ?? "for the detected Unity version"}; proceeding. "
                + (preflight.Detail ?? "The upstream check was inconclusive."));
        }

        return null;
    }

    /// <summary>Empties the log so streaming shows only this session.</summary>
    private string TruncateLog()
    {
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

        return logPath;
    }

    private static GameSessionOutcome<T> Failed<T>(int exitCode, string message)
        => new(default, new GameSessionFailure(exitCode, message));

    /// <summary>Echoes the game log and returns the first fatal start-up error in it.</summary>
    private static async Task<string?> StreamLogAndDetectFatalAsync(
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

            var fatal = TryDetectFatalMelonLoaderError(recentLog);
            if (fatal is not null)
                return fatal;
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
                + "under MelonLoader/Dependencies/Il2CppAssemblyGenerator, then rerun.";
        }

        if (logText.Contains("Failed to Process UnityDependencies", StringComparison.OrdinalIgnoreCase))
        {
            return "MelonLoader failed before HotRepl startup while processing Unity dependencies. "
                + "Refresh the matching UnityDependencies_<unity-version>.zip from "
                + "LavaGang/MelonLoader.UnityDependencies, then rerun.";
        }

        return null;
    }

    private static string MissingReleaseMessage(UnityDependenciesPreflightResult result) =>
        "MelonLoader UnityDependencies release check returned 404. "
        + $"URL: {result.ReleaseUrl}. Unity version detected: {result.UnityVersion}. "
        + "Upstream publishes these releases on a weekly cadence, so it will likely appear "
        + "within days. Pass --unity-version <version> to override with a different published "
        + "version at the cost of generating against mismatched reference assemblies.";

    private static async Task ObserveGameExitAsync(Task<ProcessResult> gameTask)
    {
        try
        {
            await gameTask;
        }
        catch (OperationCanceledException)
        {
        }
    }
}
