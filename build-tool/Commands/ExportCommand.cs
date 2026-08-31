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
        Func<Uri, CancellationToken, Task<bool>>? endpointAnswers = null)
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
        var runnerOptions = new HotReplRunnerOptions
        {
            Endpoint = new Uri(_config.HotReplEndpoint),
            Screenshots = settings.Screenshots,
            ReadinessTimeout = _hotReplReadinessTimeout ?? TimeSpan.FromMinutes(5),
            JobTimeout = TimeSpan.FromMinutes(60),
            PollInterval = _hotReplPollInterval ?? TimeSpan.FromSeconds(3),
        };

        var session = new GameSession(
            _config, _runner, _unityDependenciesPreflight, _endpointAnswers);
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
}
