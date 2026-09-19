using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.CombatVerification;
using BuildTool.Game;
using BuildTool.HotRepl;
using BuildTool.Output;
using BuildTool.UnityDependencies;
using CombatVerification.Fixtures;
using Spectre.Console.Cli;

namespace BuildTool.Commands;

/// <summary>
/// Measures every committed fixture, one isolated game session each: confirms the installation
/// matches the evidence, backs up the player save, launches the game pointed at a fresh scratch
/// database, builds and measures the fixture, writes its observation, and confirms the save is
/// untouched afterwards.
/// </summary>
/// <remarks>
/// The isolation is confirmed at three points rather than trusted once: the game reports
/// which database it opened, the run requires the exact owned canonical path, and the
/// save's content hash is compared before and after every session.
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

        [CommandOption("--fixture <NAME>")]
        [Description("Measure only the named fixture. Repeat the option for several.")]
        public string[]? Fixtures { get; set; }
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
        if (build.Recorded is null)
            return Fail("No recorded build identity is available to stamp observations with.");

        var fixtures = FixtureFiles.ReadAll(_repoRoot);
        if (settings.Fixtures is { Length: > 0 })
        {
            var requested = new HashSet<string>(settings.Fixtures, StringComparer.Ordinal);
            var unknown = requested.Except(fixtures.Select(entry => entry.Fixture.Name)).ToList();
            if (unknown.Count > 0)
                return Fail("Unknown fixture name(s): " + string.Join(", ", unknown));
            fixtures = fixtures.Where(entry => requested.Contains(entry.Fixture.Name)).ToList();
        }
        if (fixtures.Count == 0)
            return Fail("No fixtures to measure.");

        VerificationScratch.Validate(_config.GamePath);
        var save = new SaveGuard(_config.GamePath, _now);

        var written = new List<string>();
        var failures = new List<string>();
        foreach (var (path, fixture) in fixtures)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Console.WriteLine();
            Console.WriteLine($"Fixture: {fixture.Name} ({fixture.Tier}, {fixture.Coverage})");
            var attempt = await MeasureAsync(settings, path, fixture, save, cancellationToken);
            if (attempt.Failure is not null)
            {
                failures.Add($"{fixture.Name}: {attempt.Failure}");
                Console.Error.WriteLine($"Failed: {attempt.Failure}");
                continue;
            }
            try
            {
                var record = ObservationFiles.Build(
                    _repoRoot, path, fixture, build.Recorded, attempt.Achieved!.Value,
                    attempt.Observation!.Value, _now());
                var observationPath = ObservationFiles.Write(_repoRoot, record);
                written.Add(observationPath);
                Console.WriteLine($"Observation: {Path.GetRelativePath(_repoRoot, observationPath)}");
            }
            catch (InvalidDataException exception)
            {
                failures.Add($"{fixture.Name}: observation normalization failed: {exception.Message}");
                Console.Error.WriteLine($"Failed: observation normalization failed: {exception.Message}");
            }
        }

        _resultStore.SetData(new
        {
            ok = failures.Count == 0,
            build = build.Recorded.ShortName,
            gameVersion = build.Recorded.GameVersion,
            observations = written.Select(path => Path.GetRelativePath(_repoRoot, path)).ToList(),
            failures,
            backupDirectory = save.BackupDirectory,
        });

        Console.WriteLine();
        Console.WriteLine($"Measured {written.Count} of {fixtures.Count} fixture(s).");
        return failures.Count == 0
            ? ExitCodes.Success
            : Fail("Fixture(s) failed:\n- " + string.Join("\n- ", failures));
    }

    private sealed record FixtureAttempt(string? Failure, JsonElement? Achieved, JsonElement? Observation);

    /// <summary>
    /// Backs the player save up once, after the first session owns the installation, and
    /// compares it after every session.
    /// </summary>
    private sealed class SaveGuard(string gamePath, Func<DateTimeOffset> now)
    {
        private SaveSnapshot? _before;

        public string? BackupDirectory { get; private set; }

        public void BackUpOnce()
        {
            if (_before is not null) return;
            _before = PlayerSave.Read(gamePath) ?? new SaveSnapshot(Array.Empty<SaveFileHash>());
            if (_before.Files.Count == 0)
            {
                Console.WriteLine("Save: absent before the run; no backup is required.");
                return;
            }
            var backup = PlayerSave.Create(gamePath, PlayerSave.DirectoryFor(gamePath), now());
            Console.WriteLine($"Save: {backup.Detail}");
            if (!backup.Ok)
                throw new IOException(backup.Detail);
            if (!_before.Matches(backup.Snapshot!))
                throw new IOException("The player save changed while creating its backup.");
            BackupDirectory = backup.Directory;
        }

        public void RequireUnchanged()
        {
            if (_before is null) return;
            var after = PlayerSave.Read(gamePath) ?? new SaveSnapshot(Array.Empty<SaveFileHash>());
            if (!_before.Matches(after))
                throw new IOException("The player save changed during the run. Changed: "
                    + string.Join(", ", _before.Differences(after)) + ".");
            Console.WriteLine("Isolation: the player save and sidecars are unchanged.");
        }
    }

    private async Task<FixtureAttempt> MeasureAsync(
        Settings settings,
        string fixturePath,
        FixtureDescriptor fixture,
        SaveGuard save,
        CancellationToken cancellationToken)
    {
        var sessionToken = Guid.NewGuid().ToString("N");
        var runnerOptions = new HotReplRunnerOptions
        {
            Endpoint = new Uri(_config.HotReplEndpoint),
            ReadinessTimeout = _hotReplReadinessTimeout ?? TimeSpan.FromMinutes(5),
            PollInterval = _hotReplPollInterval ?? TimeSpan.FromSeconds(3),
            FixtureJson = FixtureFiles.ReadJson(fixturePath),
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
                Purpose = $"combat fixture {fixture.Name}",
                SessionToken = sessionToken,
                BeforeLaunch = ct =>
                {
                    ct.ThrowIfCancellationRequested();
                    save.BackUpOnce();
                    ct.ThrowIfCancellationRequested();
                    // Every attempt starts from an empty database; nothing from an earlier
                    // attempt qualifies for reuse.
                    VerificationScratch.Prepare(_config.GamePath);
                    Console.WriteLine("Scratch: fresh database prepared.");
                    return Task.CompletedTask;
                },
                AfterShutdown = () =>
                {
                    VerificationScratch.Prepare(_config.GamePath);
                    return Task.CompletedTask;
                },
                AfterSession = () =>
                {
                    save.RequireUnchanged();
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
            var primary = completedRun is { Ok: false } ? completedRun.Message + " " : "";
            return new(primary + outcome.Failure!.Message, completedRun?.Achieved, null);
        }

        var run = outcome.Work!;
        if (!run.Ok)
            return new($"stage {run.Stage ?? "session"}: {run.Message}", run.Achieved, null);
        if (run.Achieved is null || run.Observation is null)
            return new("the run completed without an achieved state and a measurement", run.Achieved, null);
        return new(null, run.Achieved, run.Observation);
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
