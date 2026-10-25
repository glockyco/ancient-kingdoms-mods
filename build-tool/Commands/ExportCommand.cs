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
    private readonly Func<Uri, CancellationToken, Task<bool>>? _endpointAnswers;
    private readonly Func<string, bool>? _relevantProcessExists;

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
        UnityDependenciesPreflight? unityDependenciesPreflight = null,
        Func<Uri, CancellationToken, Task<bool>>? endpointAnswers = null,
        Func<string, bool>? relevantProcessExists = null)
    {
        _repoRoot                   = repoRoot;
        _config                     = config;
        _runner                     = runner;
        _resultStore                = resultStore ?? new CommandResultStore();
        _unityDependenciesPreflight = unityDependenciesPreflight ?? new UnityDependenciesPreflight();
        _hotReplReadinessTimeout    = hotReplReadinessTimeout;
        _hotReplPollInterval        = hotReplPollInterval;
        _exportRunner               = exportRunner ?? RunHotReplExportAsync;
        _endpointAnswers            = endpointAnswers;
        _relevantProcessExists = relevantProcessExists;
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

    public override async Task<int> ExecuteAsync(
        CommandContext context,
        Settings settings,
        CancellationToken cancellationToken)
    {
        var runnerOptions = new HotReplRunnerOptions
        {
            Endpoint = new Uri(_config.HotReplEndpoint),
            Screenshots = settings.Screenshots,
            ReadinessTimeout = _hotReplReadinessTimeout ?? TimeSpan.FromMinutes(5),
            JobTimeout = TimeSpan.FromMinutes(60),
            PollInterval = _hotReplPollInterval ?? TimeSpan.FromSeconds(3),
        };

        var session = new GameSession(
            _config, _runner, _unityDependenciesPreflight, _endpointAnswers, _relevantProcessExists);
        var outcome = await session.RunAsync(
            new GameSessionRequest
            {
                RunSteamUpdate = settings.Update,
                UnityVersionOverride = settings.UnityVersion,
                Purpose = "HotRepl export",
            },
            ct => _exportRunner(runnerOptions, ct),
            cancellationToken);

        if (!outcome.Ok)
        {
            var failure = outcome.Failure!;
            Console.Error.WriteLine($"Error: {failure.Message}");
            _resultStore.SetErrorDetails(new { ok = false, message = failure.Message });
            return failure.ExitCode;
        }

        var runnerResult = outcome.Work!;

        if (runnerResult.Ok)
        {
            var sessionPath = GetSessionPath(runnerResult);
            if (sessionPath is null)
            {
                const string message = "Export session.manifest has no supported manifest path or file URI.";
                Console.Error.WriteLine($"Error: {message}");
                _resultStore.SetErrorDetails(new { ok = false, message });
                return ExitCodes.CommandFailed;
            }

            _resultStore.SetData(new { ok = true, message = runnerResult.Message, sessionPath });
            Console.WriteLine($"Export complete. Session: {sessionPath}");
            return ExitCodes.Success;
        }

        Console.Error.WriteLine($"Error: {runnerResult.Message}");
        _resultStore.SetErrorDetails(new { ok = false, message = runnerResult.Message });
        return runnerResult.ExitCode;
    }

    private string? GetSessionPath(ExportRunnerResult result)
    {
        if (result.Artifacts is null ||
            !result.Artifacts.TryGetValue("session.manifest", out var manifest))
            return null;

        string? manifestPath = null;
        if (manifest.TryGetProperty("path", out var path) &&
            path.ValueKind == System.Text.Json.JsonValueKind.String)
            manifestPath = WinePath.ToHost(path.GetString(), _config.WinePrefix);

        if (manifestPath is null &&
            manifest.TryGetProperty("uri", out var uriElement) &&
            uriElement.ValueKind == System.Text.Json.JsonValueKind.String &&
            Uri.TryCreate(uriElement.GetString(), UriKind.Absolute, out var uri) &&
            uri.IsFile)
        {
            var reportedPath = uri.LocalPath;
            if (reportedPath.Length > 3 && reportedPath[0] == '/' && reportedPath[2] == ':')
                reportedPath = reportedPath[1..];
            manifestPath = WinePath.ToHost(reportedPath, _config.WinePrefix);
        }

        return manifestPath is null ? null : Path.GetDirectoryName(manifestPath);
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
}
