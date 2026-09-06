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
using Newtonsoft.Json;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

/// <summary>
/// Runs an isolated fixture-validation session: confirms the installation matches the evidence,
/// backs up the player save, launches the game pointed at a scratch database, and confirms
/// the save is untouched afterwards.
/// </summary>
/// <remarks>
/// The isolation is confirmed at three points rather than trusted once: the game reports
/// which database it opened, the run requires the exact owned canonical path, and the
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
    private readonly Func<string, bool>? _relevantProcessExists;
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
        Func<Uri, CancellationToken, Task<bool>>? endpointAnswers = null,
        Func<string, bool>? relevantProcessExists = null)
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
        _relevantProcessExists = relevantProcessExists;
    }

    public sealed class Settings : BaseSettings
    {
        [CommandOption("--unity-version <VERSION>")]
        [Description("Override the Unity version used for MelonLoader reference assemblies.")]
        public string? UnityVersion { get; set; }

        [CommandOption("--allow-build-mismatch")]
        [Description("Measure even when the installation does not match the decompiled evidence.")]
        public bool AllowBuildMismatch { get; set; }

        [CommandOption("--fresh-scratch")]
        [Description("Delete verification-owned scratch state and rebuild it before the run.")]
        public bool FreshScratch { get; set; }
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

        SaveSnapshot? before = null;
        string? backupDirectory = null;
        var scratchPrepared = false;
        var sessionToken = Guid.NewGuid().ToString("N");
        var runnerOptions = new HotReplRunnerOptions
        {
            Endpoint = new Uri(_config.HotReplEndpoint),
            ReadinessTimeout = _hotReplReadinessTimeout ?? TimeSpan.FromMinutes(5),
            PollInterval = _hotReplPollInterval ?? TimeSpan.FromSeconds(3),
            FixtureMatrixJson = JsonConvert.SerializeObject(FixtureFiles.ReadMatrix(_repoRoot)),
            VerificationSession = sessionToken,
            VerificationGamePath = _config.GamePath,
            VerificationWinePrefix = _config.WinePrefix,
        };

        VerificationRunnerResult? completedRun = null;
        var session = new GameSession(
            _config, _runner, _unityDependenciesPreflight, _endpointAnswers, _relevantProcessExists);
        var outcome = await session.RunAsync(
            new GameSessionRequest
            {
                UnityVersionOverride = settings.UnityVersion,
                Purpose = "combat fixture validation",
                SessionToken = sessionToken,
                BeforeLaunch = ct =>
                {
                    ct.ThrowIfCancellationRequested();
                    VerificationScratch.Validate(_config.GamePath);
                    before = PlayerSave.Read(_config.GamePath)
                        ?? new SaveSnapshot(Array.Empty<SaveFileHash>());
                    if (before.Files.Count == 0)
                    {
                        Console.WriteLine("Save: absent before the run; no backup is required.");
                    }
                    else
                    {
                        var backup = PlayerSave.Create(_config.GamePath,
                            PlayerSave.DirectoryFor(_config.GamePath), _now());
                        Console.WriteLine($"Save: {backup.Detail}");
                        if (!backup.Ok)
                            throw new IOException(backup.Detail);
                        if (!before.Matches(backup.Snapshot!))
                            throw new IOException("The player save changed while creating its backup.");
                        backupDirectory = backup.Directory;
                    }

                    ct.ThrowIfCancellationRequested();
                    // Validation does not produce a per-fixture materialization record.
                    // Neither a legacy marker nor a prior validation can qualify reuse.
                    scratchPrepared = true;
                    VerificationScratch.Prepare(_config.GamePath, reset: true);
                    Console.WriteLine(settings.FreshScratch
                        ? "Scratch: fresh validation state requested."
                        : "Scratch: no qualified materialization; preparing fresh validation state.");
                    return Task.CompletedTask;
                },
                AfterShutdown = () =>
                {
                    if (scratchPrepared)
                        VerificationScratch.Prepare(_config.GamePath, reset: true);
                    return Task.CompletedTask;
                },
                AfterSession = () =>
                {
                    if (before is not null)
                    {
                        var after = PlayerSave.Read(_config.GamePath)
                            ?? new SaveSnapshot(Array.Empty<SaveFileHash>());
                        if (!before.Matches(after))
                            throw new IOException("The player save changed during the run. Changed: "
                                + string.Join(", ", before.Differences(after)) + ".");
                        Console.WriteLine("Isolation: the player save and sidecars are unchanged.");
                    }
                    return Task.CompletedTask;
                },
            },
            async ct =>
            {
                completedRun = await _verificationRunner(runnerOptions, ct);
                Console.WriteLine(completedRun.Ok
                    ? $"Run: {completedRun.Message}" : $"Run failed: {completedRun.Message}");
                if (completedRun.ResolvedDatabasePath is not null)
                    Console.WriteLine($"Runtime database: {completedRun.ResolvedDatabasePath}");
                return completedRun;
            },
            cancellationToken);

        if (!outcome.Ok)
        {
            var primary = completedRun is { Ok: false } ? completedRun.Message + "\n" : "";
            return Fail(primary + outcome.Failure!.Message, outcome.Failure.ExitCode);
        }

        var run = outcome.Work!;
        if (!run.Ok)
            return Fail(run.Message, run.ExitCode);

        _resultStore.SetData(new
        {
            ok = true,
            verified = false,
            status = "validation-only",
            build = build.Recorded?.ShortName,
            gameVersion = build.Recorded?.GameVersion,
            resolvedDatabasePath = run.ResolvedDatabasePath,
            characterCount = run.CharacterCount,
            scratch = "fresh-validation",
            backupDirectory,
        });

        Console.WriteLine("Fixture validation complete. Combat parity and baseline verification were not run.");
        return ExitCodes.Success;
    }

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
