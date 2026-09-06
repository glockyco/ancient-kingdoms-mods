using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.HotRepl;
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

    /// <summary>Run owned-installation preparation before the log is changed or the game starts.</summary>
    public Func<CancellationToken, Task>? BeforeLaunch { get; init; }

    /// <summary>Read back or clear owned state after the game process stops.</summary>
    public Func<Task>? AfterShutdown { get; init; }

    /// <summary>Compare final session state after shutdown handling, without mutating scratch.</summary>
    public Func<Task>? AfterSession { get; init; }

    /// <summary>Identity the runtime uses to confirm that it serves this session.</summary>
    public string? SessionToken { get; init; }
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
    private static readonly TimeSpan CleanupTimeout = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan EndpointProbeTimeout = TimeSpan.FromSeconds(2);

    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly UnityDependenciesPreflight _unityDependenciesPreflight;
    private readonly Func<Uri, CancellationToken, Task<bool>> _endpointAnswers;
    private readonly Func<string, bool> _relevantProcessExists;

    internal GameSession(
        LocalConfig config,
        IProcessRunner runner,
        UnityDependenciesPreflight? unityDependenciesPreflight = null,
        Func<Uri, CancellationToken, Task<bool>>? endpointAnswers = null,
        Func<string, bool>? relevantProcessExists = null)
    {
        _config = config;
        _runner = runner;
        _unityDependenciesPreflight = unityDependenciesPreflight ?? new UnityDependenciesPreflight();
        _endpointAnswers = endpointAnswers ?? ((endpoint, cancellationToken) =>
            HotReplEndpointProbe.AnswersAsync(
                endpoint, TimeSpan.FromSeconds(1), cancellationToken));
        _relevantProcessExists = relevantProcessExists ?? GameProcesses.HasRelevantProcess;
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

        if (!Uri.TryCreate(_config.HotReplEndpoint, UriKind.Absolute, out var endpoint))
            return Failed<T>(ExitCodes.InvalidUsage,
                $"HotRepl endpoint is not an absolute URI: {_config.HotReplEndpoint}");

        SessionOwnership? ownership = null;
        CancellationTokenSource? gameCts = null;
        CancellationTokenSource? logCts = null;
        CancellationTokenSource? workCts = null;
        Task<ProcessResult>? gameTask = null;
        Task<string?>? logTask = null;
        Task<T>? workTask = null;
        GameSessionFailure? failure = null;
        T? result = default;
        var beforeLaunchStarted = false;
        var gameLaunchAttempted = false;
        var sessionToken = request.SessionToken ?? Guid.NewGuid().ToString("N");

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            var initialEndpointFailure = await RefuseIfOccupiedAsync(
                endpoint, cancellationToken, checkProcess: true);
            if (initialEndpointFailure is not null)
                return new GameSessionOutcome<T>(default, initialEndpointFailure);

            try
            {
                ownership = SessionOwnership.Acquire(_config.GamePath, endpoint);
            }
            catch (SessionOwnership.SessionLockBusyException exception)
            {
                return Failed<T>(ExitCodes.ResourceConflict,
                    $"The game installation or runtime endpoint is already owned: {exception.Path}");
            }
            catch (UnauthorizedAccessException exception)
            {
                return Failed<T>(ExitCodes.PermissionFailed,
                    $"Could not acquire game session ownership: {exception.Message}");
            }
            catch (IOException exception)
            {
                return Failed<T>(ExitCodes.InvalidUsage,
                    $"Could not validate game session ownership: {exception.Message}");
            }

            // The first probe and lock acquisition are separate operations. This second probe
            // closes the race where another process answers while this session takes its locks.
            var ownershipFailure = await RefuseIfOccupiedAsync(
                endpoint, cancellationToken, checkProcess: true);
            if (ownershipFailure is not null)
            {
                failure = ownershipFailure;
                goto FinishSession;
            }

            if (request.RunSteamUpdate)
            {
                var updateResult = await UpdateCommandBridge(cancellationToken);
                if (updateResult != ExitCodes.Success)
                {
                    failure = Failed<T>(updateResult, "Steam update did not complete.").Failure;
                    goto FinishSession;
                }
            }

            var preflightFailure = await CheckUnityDependenciesAsync(request, cancellationToken);
            if (preflightFailure != null)
            {
                failure = preflightFailure;
                goto FinishSession;
            }

            var callbackOwnershipFailure = await RefuseIfOccupiedAsync(
                endpoint, cancellationToken, checkProcess: true);
            if (callbackOwnershipFailure is not null)
            {
                failure = callbackOwnershipFailure;
                goto FinishSession;
            }

            if (request.BeforeLaunch is not null)
            {
                cancellationToken.ThrowIfCancellationRequested();
                beforeLaunchStarted = true;
                await request.BeforeLaunch(cancellationToken);
            }

            // Preparation callbacks can take time. Recheck immediately before the first
            // launch mutation so a newly started host is never treated as ours.
            var preLaunchFailure = await RefuseIfOccupiedAsync(
                endpoint, cancellationToken, checkProcess: true);
            if (preLaunchFailure is not null)
            {
                failure = preLaunchFailure;
                goto FinishSession;
            }
            cancellationToken.ThrowIfCancellationRequested();

            ProcessRequest launch;
            try
            {
                var gameArgs = request.UnityVersionOverride is null
                    ? Array.Empty<string>()
                    : new[] { "--melonloader.unityversion", request.UnityVersionOverride };
                launch = AddSessionToken(GameLauncher.BuildLaunchRequest(_config, gameArgs), sessionToken);
            }
            catch (InvalidOperationException exception)
            {
                failure = Failed<T>(ExitCodes.InvalidUsage, exception.Message).Failure;
                goto FinishSession;
            }

            var logPath = TruncateLog();

            Console.WriteLine($"Launching game for {request.Purpose}...");
            Console.WriteLine($"  Game:   {_config.GamePath}");
            Console.WriteLine($"  HotRepl: {_config.HotReplEndpoint}");
            Console.WriteLine();

            gameCts = new CancellationTokenSource();
            try
            {
                gameLaunchAttempted = true;
                gameTask = _runner.RunAsync(launch, gameCts.Token);
            }
            catch (Exception exception)
            {
                failure = Failed<T>(ExitCodes.CommandFailed,
                    $"failed to launch game: {exception.Message}").Failure;
                goto FinishSession;
            }

            if (gameTask.IsCompleted)
            {
                failure = cancellationToken.IsCancellationRequested
                    ? Failed<T>(ExitCodes.Cancelled, $"{request.Purpose} was cancelled.").Failure
                    : await ProcessExitFailureAsync(gameTask, request.Purpose);
                goto FinishSession;
            }

            logCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            logTask = StreamLogAndDetectFatalAsync(logPath, logCts.Token);

            workCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            workTask = work(workCts.Token);
            var cancellationTask = Task.Delay(Timeout.InfiniteTimeSpan, workCts.Token);
            var finished = await Task.WhenAny(workTask, logTask, gameTask, cancellationTask);

            if (finished == cancellationTask)
            {
                failure = Failed<T>(ExitCodes.Cancelled, $"{request.Purpose} was cancelled.").Failure;
            }
            else if (finished == gameTask)
            {
                failure = cancellationToken.IsCancellationRequested
                    ? Failed<T>(ExitCodes.Cancelled, $"{request.Purpose} was cancelled.").Failure
                    : await ProcessExitFailureAsync(gameTask, request.Purpose);
            }
            else if (finished == logTask)
            {
                var fatal = await logTask;
                failure = cancellationToken.IsCancellationRequested
                    ? Failed<T>(ExitCodes.Cancelled, $"{request.Purpose} was cancelled.").Failure
                    : fatal is null
                        ? Failed<T>(ExitCodes.ReadinessFailed,
                            "The game log stream stopped before HotRepl became ready.").Failure
                        : new GameSessionFailure(ExitCodes.ReadinessFailed, fatal);
            }
            else
            {
                try
                {
                    result = await workTask;
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    failure = Failed<T>(ExitCodes.Cancelled, $"{request.Purpose} was cancelled.").Failure;
                }
                catch (Exception exception)
                {
                    failure = Failed<T>(ExitCodes.Internal,
                        $"{request.Purpose} failed: {exception.GetType().Name}: {exception.Message}").Failure;
                }
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            failure = Failed<T>(ExitCodes.Cancelled, $"{request.Purpose} was cancelled.").Failure;
        }
        catch (Exception exception)
        {
            failure = Failed<T>(ExitCodes.Internal,
                $"{request.Purpose} failed: {exception.GetType().Name}: {exception.Message}").Failure;
        }
        finally
        {
            workCts?.Cancel();
            logCts?.Cancel();

            failure = await ObserveCleanupTaskAsync(
                workTask, "session work", failure, ignoreCancellation: true,
                timeout: TimeSpan.FromSeconds(8));
            gameCts?.Cancel();
            failure = await ObserveCleanupTaskAsync(
                logTask, "game log", failure, ignoreCancellation: true);
            var gameStop = await ObserveGameTaskAsync(gameTask, gameLaunchAttempted, failure);
            failure = gameStop.Failure;

            var endpointRelease = (Failure: failure, Confirmed: true);
            if (ownership is not null)
                endpointRelease = await VerifyRuntimeReleaseAsync(
                    endpoint, failure, gameLaunchAttempted ? sessionToken : null);
            failure = endpointRelease.Failure;

            if (beforeLaunchStarted && request.AfterShutdown is not null)
            {
                if (gameStop.Confirmed && endpointRelease.Confirmed)
                    failure = await RunCleanupCallbackAsync(request.AfterShutdown, "AfterShutdown", failure);
                else
                    failure = AddFailure(failure, ExitCodes.Internal,
                        "AfterShutdown was skipped because owned process and endpoint release were not confirmed.");
            }

            if (beforeLaunchStarted && request.AfterSession is not null)
                failure = await RunCleanupCallbackAsync(request.AfterSession, "AfterSession", failure);

            if (ownership is not null)
            {
                try
                {
                    ownership.Dispose();
                }
                catch (Exception exception)
                {
                    failure = AddFailure(failure, ExitCodes.Internal,
                        $"Could not release game session ownership: {exception.Message}");
                }
            }
            workCts?.Dispose();
            logCts?.Dispose();
            gameCts?.Dispose();
        }

    FinishSession:
        Console.WriteLine("---");
        Console.WriteLine();
        return new GameSessionOutcome<T>(result, failure);
    }

    private async Task<GameSessionFailure?> RefuseIfOccupiedAsync(
        Uri endpoint,
        CancellationToken cancellationToken,
        bool checkProcess)
    {
        bool answers;
        try
        {
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(EndpointProbeTimeout);
            answers = await _endpointAnswers(endpoint, timeoutCts.Token)
                .WaitAsync(EndpointProbeTimeout, timeoutCts.Token);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (OperationCanceledException exception)
        {
            return new GameSessionFailure(ExitCodes.ReadinessFailed,
                $"Could not determine whether the runtime endpoint is free: {exception.Message}");
        }
        catch (TimeoutException exception)
        {
            return new GameSessionFailure(ExitCodes.ReadinessFailed,
                $"Could not determine whether the runtime endpoint is free: {exception.Message}");
        }
        catch (Exception exception)
        {
            return new GameSessionFailure(ExitCodes.CommandFailed,
                $"Could not determine whether the runtime endpoint is free: {exception.Message}");
        }

        if (answers)
            return new GameSessionFailure(
                ExitCodes.CommandFailed,
                $"Another game instance already answers the runtime endpoint at {endpoint}. "
                + "Quit that instance before launching this session.");

        if (checkProcess && _relevantProcessExists(_config.GamePath))
            return new GameSessionFailure(
                ExitCodes.ResourceConflict,
                $"A relevant game process is already running for installation {_config.GamePath}.");

        return null;
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
        catch (Exception exception)
        {
            Console.WriteLine($"Warning: Could not truncate log: {exception.Message}");
        }

        return logPath;
    }

    private static ProcessRequest AddSessionToken(ProcessRequest launch, string sessionToken)
    {
        var environment = launch.Environment is null
            ? new Dictionary<string, string?>()
            : new Dictionary<string, string?>(launch.Environment);
        environment["AK_VERIFICATION_SESSION"] = sessionToken;
        string[] arguments = [.. launch.Arguments, GameProcesses.SessionArgument(sessionToken)];
        return launch with { Environment = environment, Arguments = arguments };
    }

    private static GameSessionOutcome<T> Failed<T>(int exitCode, string message)
        => new(default, new GameSessionFailure(exitCode, message));

    private static GameSessionFailure AddFailure(
        GameSessionFailure? existing,
        int exitCode,
        string detail)
    {
        if (existing is null)
            return new GameSessionFailure(exitCode, detail);

        return existing with { Message = $"{existing.Message} Cleanup: {detail}" };
    }

    private async Task<(GameSessionFailure? Failure, bool Confirmed)> VerifyRuntimeReleaseAsync(
        Uri endpoint,
        GameSessionFailure? failure,
        string? ownedSessionToken)
    {
        try
        {
            if (await WaitForRuntimeReleaseAsync(endpoint, TimeSpan.FromSeconds(30)))
                return (failure, true);
            if (ownedSessionToken is not null)
            {
                GameProcesses.StopOwnedProcesses(ownedSessionToken);
                if (await WaitForRuntimeReleaseAsync(endpoint, TimeSpan.FromSeconds(5)))
                    return (failure, true);
            }
            return (AddFailure(failure, ExitCodes.Internal,
                $"The runtime endpoint or game process remained occupied after shutdown at {endpoint}."), false);
        }
        catch (Exception exception)
        {
            return (AddFailure(failure, ExitCodes.Internal,
                $"Could not verify runtime release at {endpoint}: {exception.Message}"), false);
        }
    }

    private async Task<bool> WaitForRuntimeReleaseAsync(Uri endpoint, TimeSpan timeout)
    {
        using var deadline = new CancellationTokenSource(timeout);
        try
        {
            while (true)
            {
                var answers = await _endpointAnswers(endpoint, deadline.Token).WaitAsync(deadline.Token);
                if (!answers && !_relevantProcessExists(_config.GamePath)) return true;
                await Task.Delay(TimeSpan.FromMilliseconds(100), deadline.Token);
            }
        }
        catch (OperationCanceledException) when (deadline.IsCancellationRequested)
        {
            return false;
        }
    }

    private static async Task<GameSessionFailure?> RunCleanupCallbackAsync(
        Func<Task> callback,
        string name,
        GameSessionFailure? failure)
    {
        try
        {
            await callback().WaitAsync(CleanupTimeout);
            return failure;
        }
        catch (TimeoutException)
        {
            return AddFailure(failure, ExitCodes.Internal,
                $"{name} did not complete before cleanup timed out.");
        }
        catch (Exception exception)
        {
            return AddFailure(failure, ExitCodes.Internal,
                $"{name} failed: {exception.GetType().Name}: {exception.Message}");
        }
    }

    private static async Task<GameSessionFailure?> ObserveCleanupTaskAsync(
        Task? task,
        string name,
        GameSessionFailure? failure,
        bool ignoreCancellation,
        TimeSpan? timeout = null)
    {
        if (task is null)
            return failure;

        try
        {
            await task.WaitAsync(timeout ?? CleanupTimeout);
            return failure;
        }
        catch (OperationCanceledException) when (ignoreCancellation)
        {
            return failure;
        }
        catch (TimeoutException)
        {
            return AddFailure(failure, ExitCodes.Internal,
                $"{name} did not stop before cleanup timed out.");
        }
        catch (Exception exception)
        {
            return AddFailure(failure, ExitCodes.Internal,
                $"{name} faulted during cleanup: {exception.GetType().Name}: {exception.Message}");
        }
    }

    private static async Task<(GameSessionFailure? Failure, bool Confirmed)> ObserveGameTaskAsync(
        Task<ProcessResult>? gameTask,
        bool launchAttempted,
        GameSessionFailure? failure)
    {
        if (gameTask is null)
        {
            return (
                launchAttempted
                    ? AddFailure(failure, ExitCodes.Internal,
                        "The owned game process task was not created after launch was attempted.")
                    : failure,
                !launchAttempted);
        }

        try
        {
            await gameTask.WaitAsync(CleanupTimeout);
            return (failure, true);
        }
        catch (OperationCanceledException)
        {
            return (failure, true);
        }
        catch (TimeoutException)
        {
            return (
                AddFailure(failure, ExitCodes.Internal,
                    "The owned game process did not stop before cleanup timed out."),
                false);
        }
        catch (Exception exception)
        {
            return (
                AddFailure(failure, ExitCodes.Internal,
                    $"The owned game process faulted during cleanup: {exception.GetType().Name}: {exception.Message}"),
                false);
        }
    }

    private static async Task<GameSessionFailure> ProcessExitFailureAsync(
        Task<ProcessResult> gameTask,
        string purpose)
    {
        try
        {
            var result = await gameTask;
            var detail = string.IsNullOrWhiteSpace(result.StandardError)
                ? string.Empty
                : $" Error: {result.StandardError.Trim()}";
            return new GameSessionFailure(
                ExitCodes.CommandFailed,
                $"The game process exited before {purpose} completed with code {result.ExitCode}.{detail}");
        }
        catch (OperationCanceledException exception)
        {
            return new GameSessionFailure(
                ExitCodes.CommandFailed,
                $"The game process stopped before {purpose} completed: {exception.Message}");
        }
        catch (Exception exception)
        {
            return new GameSessionFailure(
                ExitCodes.Internal,
                $"The game process faulted before {purpose} completed: {exception.GetType().Name}: {exception.Message}");
        }
    }

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
}
