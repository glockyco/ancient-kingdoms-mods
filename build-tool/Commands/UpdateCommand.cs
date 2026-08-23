using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using BuildTool.Output;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

/// <summary>
/// Brings the game current by asking the Steam client inside the bottle to do it, and proves
/// the outcome from the application manifest rather than from an exit status.
/// </summary>
public sealed class UpdateCommand : AsyncCommand<UpdateCommand.Settings>
{
    /// <summary>How long the client has to log on before the command gives up.</summary>
    private static readonly TimeSpan DefaultClientReadyTimeout = TimeSpan.FromMinutes(3);

    /// <summary>How long the client has to finish with the application after the request.</summary>
    private static readonly TimeSpan DefaultCompletionTimeout = TimeSpan.FromMinutes(60);

    /// <summary>
    /// How long the manifest has to catch up once the client reports it has finished. Steam
    /// writes the log entry and rewrites the manifest separately.
    /// </summary>
    private static readonly TimeSpan DefaultManifestFlushTimeout = TimeSpan.FromSeconds(30);

    private static readonly TimeSpan DefaultPollInterval = TimeSpan.FromSeconds(2);

    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly CommandResultStore _resultStore;
    private readonly TimeSpan _clientReadyTimeout;
    private readonly TimeSpan _completionTimeout;
    private readonly TimeSpan _manifestFlushTimeout;
    private readonly TimeSpan _pollInterval;

    public UpdateCommand()
        : this(
            LocalConfigLoader.Load(Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner(),
            new CommandResultStore())
    {
    }

    public UpdateCommand(
        LocalConfig config,
        IProcessRunner runner,
        CommandResultStore? resultStore = null,
        TimeSpan? clientReadyTimeout = null,
        TimeSpan? completionTimeout = null,
        TimeSpan? manifestFlushTimeout = null,
        TimeSpan? pollInterval = null)
    {
        _config = config;
        _runner = runner;
        _resultStore = resultStore ?? new CommandResultStore();
        _clientReadyTimeout = clientReadyTimeout ?? DefaultClientReadyTimeout;
        _completionTimeout = completionTimeout ?? DefaultCompletionTimeout;
        _manifestFlushTimeout = manifestFlushTimeout ?? DefaultManifestFlushTimeout;
        _pollInterval = pollInterval ?? DefaultPollInterval;
    }

    public sealed class Settings : BaseSettings { }

    internal Task<int> RunAsync(Settings settings, CancellationToken cancellationToken = default) =>
        ExecuteAsync(null!, settings, cancellationToken);

    protected override Task<int> ExecuteAsync(
        CommandContext context,
        Settings settings,
        CancellationToken cancellationToken) =>
        RunSteamUpdateAsync(cancellationToken);

    /// <summary>Runs the update with the shared defaults, for callers such as <c>export --update</c>.</summary>
    internal static Task<int> RunSteamUpdateAsync(
        LocalConfig config,
        IProcessRunner runner,
        CancellationToken cancellationToken) =>
        new UpdateCommand(config, runner).RunSteamUpdateAsync(cancellationToken);

    private async Task<int> RunSteamUpdateAsync(CancellationToken cancellationToken)
    {
        var appId = SteamAppManifests.AncientKingdomsAppId;

        var launcherPath = SteamBottle.LauncherPath(_config.WinePath);
        if (!File.Exists(launcherPath))
        {
            Console.Error.WriteLine(
                $"Error: CrossOver launcher '{SteamBottle.LauncherFileName}' not found at: {launcherPath}");
            Console.Error.WriteLine("It is installed beside the wine binary named by WINE_PATH in Local.props.");
            _resultStore.SetErrorDetails(new { program = SteamBottle.LauncherFileName, path = launcherPath });
            return ExitCodes.Unreachable;
        }

        var bottleName = SteamBottle.BottleName(_config.WinePrefix);
        var manifestPath = SteamBottle.ManifestPath(_config.WinePrefix, appId);

        var before = SteamAppManifests.Read(manifestPath);
        if (before is null)
        {
            Console.Error.WriteLine($"Error: Steam application manifest not found or unreadable: {manifestPath}");
            _resultStore.SetErrorDetails(new { appId, manifestPath });
            return ExitCodes.Unreachable;
        }

        Console.WriteLine("Asking Steam to bring Ancient Kingdoms current...");
        Console.WriteLine($"  Bottle: {bottleName}");
        Console.WriteLine($"  App id: {appId}");
        Console.WriteLine($"  Installed build: {before.BuildId}");
        Console.WriteLine();

        var connectionLogPath = SteamLogs.ConnectionLogPath(_config.WinePrefix);
        var connectionLogOffset = SteamLogs.Length(connectionLogPath);

        using var clientCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        Task<ProcessResult> clientTask;
        try
        {
            clientTask = _runner.RunAsync(
                SteamBottle.StartClientRequest(launcherPath, bottleName), clientCts.Token);
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: failed to start the Steam client: {ex.Message}");
            _resultStore.SetErrorDetails(new { program = launcherPath, message = ex.Message });
            return ExitCodes.Unreachable;
        }

        try
        {
            if (!await WaitForClientAsync(clientTask, connectionLogPath, connectionLogOffset, cancellationToken))
            {
                Console.Error.WriteLine(
                    $"Error: the Steam client did not log on within {Describe(_clientReadyTimeout)}.");
                Console.Error.WriteLine($"  Connection log: {connectionLogPath}");
                _resultStore.SetErrorDetails(new { bottle = bottleName, connectionLog = connectionLogPath });
                return ExitCodes.CommandFailed;
            }

            Console.WriteLine("  Steam client ready. Requesting validation...");

            // Read the content log only from here on, so scheduler activity the client performed
            // while starting up cannot be mistaken for a response to this request.
            var contentLogPath = SteamLogs.ContentLogPath(_config.WinePrefix);
            var contentLogOffset = SteamLogs.Length(contentLogPath);

            try
            {
                // The exit status only reports that the client accepted the URL. The manifest,
                // read below, is what says whether the installation changed.
                await _runner.RunAsync(
                    SteamBottle.ValidateRequest(launcherPath, bottleName, appId), cancellationToken);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error: failed to hand the request to Steam: {ex.Message}");
                _resultStore.SetErrorDetails(new { program = launcherPath, message = ex.Message });
                return ExitCodes.Unreachable;
            }

            // Steam says when it has finished with the application; the manifest says what the
            // result was. The manifest cannot serve as the completion signal, because a
            // validation that changes nothing never causes Steam to rewrite it.
            var schedulerResult = await WaitForSchedulerAsync(
                contentLogPath, contentLogOffset, appId, cancellationToken);

            if (schedulerResult is null)
            {
                var observed = SteamAppManifests.Read(manifestPath);
                Console.Error.WriteLine(
                    $"Error: Steam did not finish with app {appId} within {Describe(_completionTimeout)}.");
                Console.Error.WriteLine(
                    observed is null
                        ? $"  The manifest became unreadable: {manifestPath}"
                        : $"  Observed StateFlags {observed.StateFlags}, build {observed.BuildId}.");
                Console.Error.WriteLine($"  Content log: {contentLogPath}");
                _resultStore.SetErrorDetails(new
                {
                    appId,
                    manifestPath,
                    contentLog = contentLogPath,
                    stateFlags = observed?.StateFlags,
                    buildId = observed?.BuildId,
                });
                return ExitCodes.CommandFailed;
            }

            if (schedulerResult != SteamLogs.NoErrorResult)
            {
                var observed = SteamAppManifests.Read(manifestPath);
                Console.Error.WriteLine($"Error: Steam finished with app {appId} reporting '{schedulerResult}'.");
                if (observed is not null)
                    Console.Error.WriteLine($"  Observed StateFlags {observed.StateFlags}, build {observed.BuildId}.");
                Console.Error.WriteLine($"  Content log: {contentLogPath}");
                _resultStore.SetErrorDetails(new
                {
                    appId,
                    result = schedulerResult,
                    contentLog = contentLogPath,
                    stateFlags = observed?.StateFlags,
                    buildId = observed?.BuildId,
                });
                return ExitCodes.CommandFailed;
            }

            // Steam writes the log entry and rewrites the manifest separately, so give the
            // manifest a bounded moment to agree before reading the result from it.
            var settled = await WaitAsync(
                manifestPath, _manifestFlushTimeout, m => m.IsFullyInstalled, cancellationToken);

            if (settled is null)
            {
                var observed = SteamAppManifests.Read(manifestPath);
                Console.Error.WriteLine(
                    "Error: Steam reported it finished, but the installation is not fully installed.");
                Console.Error.WriteLine(
                    observed is null
                        ? $"  The manifest became unreadable: {manifestPath}"
                        : $"  Observed StateFlags {observed.StateFlags}, build {observed.BuildId}.");
                _resultStore.SetErrorDetails(new
                {
                    appId,
                    manifestPath,
                    stateFlags = observed?.StateFlags,
                    buildId = observed?.BuildId,
                });
                return ExitCodes.CommandFailed;
            }

            var updated = settled.BuildId != before.BuildId;
            Console.WriteLine();
            Console.WriteLine(
                updated
                    ? $"Updated from build {before.BuildId} to {settled.BuildId}."
                    : $"Already current at build {settled.BuildId}. Steam verified the installed files.");

            _resultStore.SetData(new
            {
                appId,
                installDir = settled.InstallDir,
                buildId = settled.BuildId,
                previousBuildId = before.BuildId,
                stateFlags = settled.StateFlags,
                updated,
            });
            return ExitCodes.Success;
        }
        finally
        {
            // Stop waiting on the launcher. The client keeps running in the bottle, which is
            // where the operator's Steam belongs and what lets a second run reuse it, so this
            // releases the wait rather than the client.
            clientCts.Cancel();
        }
    }

    /// <summary>
    /// Waits until the client reports a logon, or until the launcher exits because Steam was
    /// already running and it forwarded the request.
    /// </summary>
    private async Task<bool> WaitForClientAsync(
        Task<ProcessResult> clientTask,
        string logPath,
        long logOffset,
        CancellationToken cancellationToken)
    {
        var deadline = DateTimeOffset.UtcNow + _clientReadyTimeout;

        while (true)
        {
            if (SteamLogs.ShowsLogon(SteamLogs.ReadFrom(logPath, logOffset)))
                return true;

            // The launcher exits when Steam was already running and it forwarded the request.
            if (clientTask.IsCompleted)
                return true;

            if (DateTimeOffset.UtcNow >= deadline)
                return false;

            await Task.Delay(_pollInterval, cancellationToken);
        }
    }

    /// <summary>
    /// Waits for Steam to record that it has finished with the application, and returns the
    /// result it recorded, or null if it never finished within the time allowed.
    /// </summary>
    private async Task<string?> WaitForSchedulerAsync(
        string contentLogPath,
        long contentLogOffset,
        string appId,
        CancellationToken cancellationToken)
    {
        var deadline = DateTimeOffset.UtcNow + _completionTimeout;

        while (true)
        {
            var appended = SteamLogs.ReadFrom(contentLogPath, contentLogOffset);
            var result = SteamLogs.FindSchedulerResult(appended, appId);
            if (result is not null)
                return result;

            if (DateTimeOffset.UtcNow >= deadline)
                return null;

            await Task.Delay(_pollInterval, cancellationToken);
        }
    }

    /// <summary>Polls the manifest until it satisfies <paramref name="predicate"/>, or times out.</summary>
    private async Task<SteamAppManifest?> WaitAsync(
        string manifestPath,
        TimeSpan timeout,
        Func<SteamAppManifest, bool> predicate,
        CancellationToken cancellationToken)
    {
        var deadline = DateTimeOffset.UtcNow + timeout;

        while (true)
        {
            var manifest = SteamAppManifests.Read(manifestPath);
            if (manifest is not null && predicate(manifest))
                return manifest;

            if (DateTimeOffset.UtcNow >= deadline)
                return null;

            await Task.Delay(_pollInterval, cancellationToken);
        }
    }

    private static string Describe(TimeSpan span) =>
        span.TotalMinutes >= 1
            ? $"{span.TotalMinutes:0.#} minutes"
            : $"{span.TotalSeconds:0.#} seconds";
}
