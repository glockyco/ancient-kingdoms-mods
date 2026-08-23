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

    /// <summary>
    /// How long to wait for the client to start working after the request. When nothing starts,
    /// the installation was already current.
    /// </summary>
    private static readonly TimeSpan DefaultWorkStartTimeout = TimeSpan.FromMinutes(2);

    /// <summary>How long the client has to bring the installation back to a settled state.</summary>
    private static readonly TimeSpan DefaultSettleTimeout = TimeSpan.FromMinutes(60);

    private static readonly TimeSpan DefaultPollInterval = TimeSpan.FromSeconds(2);

    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly CommandResultStore _resultStore;
    private readonly TimeSpan _clientReadyTimeout;
    private readonly TimeSpan _workStartTimeout;
    private readonly TimeSpan _settleTimeout;
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
        TimeSpan? workStartTimeout = null,
        TimeSpan? settleTimeout = null,
        TimeSpan? pollInterval = null)
    {
        _config = config;
        _runner = runner;
        _resultStore = resultStore ?? new CommandResultStore();
        _clientReadyTimeout = clientReadyTimeout ?? DefaultClientReadyTimeout;
        _workStartTimeout = workStartTimeout ?? DefaultWorkStartTimeout;
        _settleTimeout = settleTimeout ?? DefaultSettleTimeout;
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

        var logPath = SteamBottle.ConnectionLogPath(_config.WinePrefix);
        var logOffset = FileLength(logPath);

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
            if (!await WaitForClientAsync(clientTask, logPath, logOffset, cancellationToken))
            {
                Console.Error.WriteLine(
                    $"Error: the Steam client did not log on within {Describe(_clientReadyTimeout)}.");
                Console.Error.WriteLine($"  Connection log: {logPath}");
                _resultStore.SetErrorDetails(new { bottle = bottleName, connectionLog = logPath });
                return ExitCodes.CommandFailed;
            }

            Console.WriteLine("  Steam client ready. Requesting validation...");

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

            var started = await WaitAsync(
                manifestPath, _workStartTimeout, m => !m.IsFullyInstalled, cancellationToken);

            if (started is null)
            {
                var current = SteamAppManifests.Read(manifestPath) ?? before;
                Console.WriteLine($"Already current at build {current.BuildId}. Nothing to download.");
                _resultStore.SetData(new
                {
                    appId,
                    installDir = current.InstallDir,
                    buildId = current.BuildId,
                    stateFlags = current.StateFlags,
                    updated = false,
                });
                return ExitCodes.Success;
            }

            Console.WriteLine($"  Steam is working (StateFlags {started.StateFlags})...");

            var settled = await WaitAsync(
                manifestPath, _settleTimeout, m => m.IsFullyInstalled, cancellationToken);

            if (settled is null)
            {
                var observed = SteamAppManifests.Read(manifestPath);
                Console.Error.WriteLine(
                    $"Error: the installation did not settle within {Describe(_settleTimeout)}.");
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
                    : $"Already current at build {settled.BuildId}. Files were verified.");

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
            // Release only the client this command started. When Steam was already running, the
            // launcher forwarded the request and exited, so there is nothing left to cancel.
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

        while (DateTimeOffset.UtcNow < deadline)
        {
            if (LoggedOnSince(logPath, logOffset))
                return true;

            if (clientTask.IsCompleted)
                return true;

            await Task.Delay(_pollInterval, cancellationToken);
        }

        return LoggedOnSince(logPath, logOffset) || clientTask.IsCompleted;
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

    private static bool LoggedOnSince(string logPath, long offset)
    {
        try
        {
            if (!File.Exists(logPath))
                return false;

            using var stream = new FileStream(
                logPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            if (stream.Length <= offset)
                return false;

            stream.Seek(offset, SeekOrigin.Begin);
            using var reader = new StreamReader(stream);
            return reader.ReadToEnd().Contains(SteamBottle.LoggedOnMarker, StringComparison.Ordinal);
        }
        catch (IOException)
        {
            return false;
        }
    }

    private static long FileLength(string path)
    {
        try
        {
            return File.Exists(path) ? new FileInfo(path).Length : 0;
        }
        catch (IOException)
        {
            return 0;
        }
    }

    private static string Describe(TimeSpan span) =>
        span.TotalMinutes >= 1
            ? $"{span.TotalMinutes:0.#} minutes"
            : $"{span.TotalSeconds:0.#} seconds";
}
