using System;
using System.ComponentModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.CombatVerification;
using BuildTool.Game;
using BuildTool.HotRepl;
using BuildTool.Output;
using BuildTool.UnityDependencies;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

/// <summary>
/// Runs a verification session: confirms the installation matches the decompiled evidence,
/// backs up the player save, launches the game pointed at a scratch database, and confirms
/// the save is untouched afterwards.
/// </summary>
/// <remarks>
/// The isolation is confirmed at three points rather than trusted once: the game reports
/// which database it opened, the run refuses unless that path is a scratch one, and the
/// save's content hash is compared before and after.
/// </remarks>
public sealed class VerifyCommand : AsyncCommand<VerifyCommand.Settings>
{
    private readonly string _repoRoot;
    private readonly LocalConfig _config;
    private readonly IProcessRunner _runner;
    private readonly CommandResultStore _resultStore;
    private readonly UnityDependenciesPreflight _unityDependenciesPreflight;
    private readonly Func<HotReplRunnerOptions, CancellationToken, Task<VerificationRunnerResult>>
        _verificationRunner;
    private readonly Func<Uri, CancellationToken, Task<bool>>? _endpointAnswers;
    private readonly TimeSpan? _hotReplReadinessTimeout;
    private readonly TimeSpan? _hotReplPollInterval;
    private readonly Func<DateTimeOffset> _now;

    public VerifyCommand()
        : this(
            Directory.GetCurrentDirectory(),
            LocalConfigLoader.Load(
                Path.Combine(Directory.GetCurrentDirectory(), "Local.props")),
            new CliWrapProcessRunner(),
            new CommandResultStore())
    {
    }

    internal VerifyCommand(
        string repoRoot,
        LocalConfig config,
        IProcessRunner runner,
        CommandResultStore? resultStore = null,
        TimeSpan? hotReplReadinessTimeout = null,
        TimeSpan? hotReplPollInterval = null,
        Func<HotReplRunnerOptions, CancellationToken, Task<VerificationRunnerResult>>?
            verificationRunner = null,
        UnityDependenciesPreflight? unityDependenciesPreflight = null,
        Func<DateTimeOffset>? now = null,
        Func<Uri, CancellationToken, Task<bool>>? endpointAnswers = null)
    {
        _repoRoot = repoRoot;
        _config = config;
        _runner = runner;
        _resultStore = resultStore ?? new CommandResultStore();
        _unityDependenciesPreflight = unityDependenciesPreflight ?? new UnityDependenciesPreflight();
        _hotReplReadinessTimeout = hotReplReadinessTimeout;
        _hotReplPollInterval = hotReplPollInterval;
        _verificationRunner = verificationRunner ?? RunVerificationAsync;
        _now = now ?? (() => DateTimeOffset.UtcNow);
        _endpointAnswers = endpointAnswers;
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--unity-version <VERSION>")]
        [Description("Override the Unity version used for MelonLoader reference assemblies.")]
        public string? UnityVersion { get; set; }

        [CommandOption("--allow-build-mismatch")]
        [Description("Measure even when the installation does not match the decompiled evidence.")]
        public bool AllowBuildMismatch { get; set; }
    }

    internal Task<int> RunAsync(Settings settings, CancellationToken cancellationToken = default) =>
        ExecuteAsync(null!, settings, cancellationToken);

    protected override async Task<int> ExecuteAsync(
        CommandContext context,
        Settings settings,
        CancellationToken cancellationToken)
    {
        var fixtureProblems = FixtureFiles.ValidateShapes(_repoRoot);
        if (fixtureProblems.Count > 0)
            return Fail("Fixture shape validation failed before launch:\n- "
                + string.Join("\n- ", fixtureProblems));

        var build = GameBuildIdentities.Check(_repoRoot, _config.GamePath);
        Console.WriteLine($"Build: {build.Detail}");

        if (build.Agreement != GameBuildAgreement.Agrees && !settings.AllowBuildMismatch)
            return Fail(build.Detail
                + " Pass --allow-build-mismatch to measure anyway, accepting that results and "
                + "citations describe different builds.");

        // The recorded path is the one the game reported, in its own terms, so it is
        // translated before it is looked for.
        var scratch = ScratchStates.Plan(
            MarkerDirectory(),
            CurrentMarker(build, databasePath: null),
            path => WinePath.ExistsOnHost(path, _config.WinePrefix));
        Console.WriteLine($"Scratch: {scratch.Detail}");

        var backup = PlayerSave.Create(_config.GamePath, BackupRoot(), _now());
        Console.WriteLine($"Save: {backup.Detail}");
        if (!backup.Ok)
            return Fail(backup.Detail);

        var before = backup.Snapshot!;
        Console.WriteLine();

        var runnerOptions = new HotReplRunnerOptions
        {
            Endpoint = new Uri(_config.HotReplEndpoint),
            ReadinessTimeout = _hotReplReadinessTimeout ?? TimeSpan.FromMinutes(5),
            PollInterval = _hotReplPollInterval ?? TimeSpan.FromSeconds(3),
        };

        var session = new GameSession(
            _config, _runner, _unityDependenciesPreflight, _endpointAnswers);
        var outcome = await session.RunAsync(
            new GameSessionRequest
            {
                UnityVersionOverride = settings.UnityVersion,
                Purpose = "combat verification",
            },
            ct => _verificationRunner(runnerOptions, ct),
            cancellationToken);

        if (!outcome.Ok)
        {
            var failure = outcome.Failure!;
            // Isolation still has to be proven: the game ran, however it ended.
            ReportIsolation(before);
            return Fail(failure.Message, failure.ExitCode);
        }

        var run = outcome.Work!;
        Console.WriteLine(run.Ok ? $"Run: {run.Message}" : $"Run failed: {run.Message}");

        var isolation = ReportIsolation(before);

        if (!run.Ok)
            return Fail(run.Message, run.ExitCode);

        if (isolation is not null)
            return Fail(isolation);

        // Record what was measured, including the database the game actually opened, so a
        // later run can tell whether it may reuse this state.
        ScratchStates.WriteMarker(
            MarkerDirectory(), CurrentMarker(build, run.ResolvedDatabasePath));

        _resultStore.SetData(new
        {
            ok = true,
            build = build.Recorded?.ShortName,
            gameVersion = build.Recorded?.GameVersion,
            resolvedDatabasePath = run.ResolvedDatabasePath,
            characterCount = run.CharacterCount,
            scratch = scratch.Decision.ToString(),
            backupDirectory = backup.Directory,
        });

        Console.WriteLine("Verification run complete.");
        return ExitCodes.Success;
    }

    /// <summary>
    /// Compares the save against the snapshot taken before the run. Returns null when it is
    /// unchanged, or a message naming what moved.
    /// </summary>
    private string? ReportIsolation(SaveSnapshot before)
    {
        var after = PlayerSave.Read(_config.GamePath);
        if (after is null)
            return "The player save is absent after the run, so isolation cannot be confirmed.";

        if (before.Matches(after))
        {
            Console.WriteLine("Isolation: the player save is unchanged.");
            return null;
        }

        return "The player save changed during the run, which the redirect exists to prevent. "
            + $"Changed: {string.Join(", ", before.Differences(after))}.";
    }

    /// <summary>
    /// Where the record of the retained scratch state lives. Beside the save rather than in
    /// the repository, because it describes the installation and is not a committed artifact.
    /// </summary>
    private string MarkerDirectory() => PlayerSave.DirectoryFor(_config.GamePath);

    private ScratchMarker CurrentMarker(GameBuildCheck build, string? databasePath) =>
        new(build.InstalledAssemblySha256 ?? build.Recorded?.AssemblySha256 ?? "unknown",
            ScratchStates.HashFixtures(_repoRoot),
            databasePath);

    /// <summary>
    /// A backup belongs beside the save it copies, so that finding one never depends on
    /// knowing where the tooling was run from.
    /// </summary>
    private string BackupRoot() => PlayerSave.DirectoryFor(_config.GamePath);

    private int Fail(string message, int exitCode = ExitCodes.CommandFailed)
    {
        Console.Error.WriteLine($"Error: {message}");
        _resultStore.SetErrorDetails(new { ok = false, message });
        return exitCode;
    }

    private static async Task<VerificationRunnerResult> RunVerificationAsync(
        HotReplRunnerOptions runnerOptions,
        CancellationToken cancellationToken)
    {
        try
        {
            return await HotReplVerificationRunner.Create(runnerOptions)
                .RunAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            return new VerificationRunnerResult(false, ExitCodes.Internal,
                $"Runner threw: {ex.Message}");
        }
    }
}
