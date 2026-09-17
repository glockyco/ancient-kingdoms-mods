using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Commands;
using BuildTool.Configuration;
using BuildTool.Game;
using BuildTool.HotRepl;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

/// <summary>
/// The refusal gates. A live run cannot safely produce a build mismatch or an unbackupable
/// save, and those are exactly the paths that keep a run away from player data, so they are
/// exercised here.
/// </summary>
public sealed class VerifyCommandTests : IDisposable
{
    private static int _nextEndpointPort = 40000;
    private readonly int _endpointPort = Interlocked.Increment(ref _nextEndpointPort);
    private readonly string _root = Directory.CreateTempSubdirectory("ak-verify").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private string RepoRoot => Path.Combine(_root, "repo");
    private string GamePath => Path.Combine(_root, "game");

    private LocalConfig Config() => new(
        GamePath: GamePath,
        DataExportPath: Path.Combine(_root, "export"),
        WinePath: "/usr/bin/true",
        WinePrefix: Path.Combine(_root, "prefix"),
        HotReplEndpoint: $"ws://127.0.0.1:{_endpointPort}");

    /// <summary>An installation complete enough to reach the gates under test.</summary>
    private string WriteInstallation(string assemblyContents = "build A", bool withSave = true)
    {
        Directory.CreateDirectory(GamePath);
        File.WriteAllText(Path.Combine(GamePath, "ancientkingdoms.exe"), "exe");

        var assembly = GameBuildIdentities.ServerAssemblyPath(GamePath);
        Directory.CreateDirectory(Path.GetDirectoryName(assembly)!);
        File.WriteAllText(assembly, assemblyContents);

        if (withSave)
        {
            Directory.CreateDirectory(PlayerSave.DirectoryFor(GamePath));
            File.WriteAllText(PlayerSave.DatabasePath(GamePath), "player save");
        }

        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(assemblyContents)))
            .ToLowerInvariant();
    }

    private void WriteSnapshot(string assemblySha)
    {
        var dir = Path.Combine(RepoRoot, GameBuildIdentities.ServerScriptsLink);
        Directory.CreateDirectory(dir);
        File.WriteAllText(Path.Combine(dir, GameBuildIdentities.SnapshotFileName),
            $"""
            game_version = "0.9.31.0"
            assembly_sha256 = "{assemblySha}"
            steam_build_id = "24925347"
            """);
    }

    private void WriteFixture(string body, string fileName = "invalid.json")
    {
        var directory = BuildTool.CombatVerification.FixtureFiles.DirectoryFor(RepoRoot);
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, fileName), body);
    }

    /// <summary>A tier A fixture that passes the shape gate.</summary>
    private void WriteValidFixture(string name = "A-test", string coverage = "A.class.Warrior") =>
        WriteFixture($$"""
        {
          "schemaVersion": 3,
          "build": {
            "serializedSchemaVersion": 3,
            "modelVersion": "2",
            "gameData": {
              "gameVersion": "0.9.31.0",
              "steamBuildId": "24925347",
              "assemblySha256": "bd2521453b35dfb58c4fec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc0"
            }
          },
          "name": "{{name}}",
          "tier": "A",
          "coverage": "{{coverage}}",
          "buildData": {
            "schemaVersion": 1,
            "player": {
              "entityId": "player",
              "classId": "warrior",
              "raceId": "human",
              "level": 1,
              "veteranPoints": 0,
              "attributes": {
                "rawObserved": null,
                "baseProgression": { "strength": 0, "constitution": 0, "dexterity": 0, "intelligence": 0, "wisdom": 0, "charisma": 0 },
                "allocated": { "strength": 0, "constitution": 0, "dexterity": 0, "intelligence": 0, "wisdom": 0, "charisma": 0 },
                "derivedObserved": null
              },
              "skills": [],
              "equipment": []
            },
            "companions": [],
            "consumables": [],
            "ammunition": [],
            "learnedBookIds": [],
            "provenance": { "kind": "authored", "source": "test" }
          },
          "execution": {
            "durationSeconds": null,
            "repetitions": 1,
            "seed": 7,
            "target": { "spawn": "Snake", "level": 5 },
            "actions": null,
            "measurement": { "minimumSamples": 1 }
          }
        }
        """, name + ".json");

    private static VerificationRunnerResult Measured(string message = "measured") =>
        new(true, ExitCodes.Success, message,
            "C:/game/ancientkingdoms_Data/verification-scratch/game.dat", 0,
            Stage: "observe",
            Achieved: JsonDocument.Parse("""{"ok":true,"level":1}""").RootElement.Clone(),
            Observation: JsonDocument.Parse("""{"tier":"A","measurements":[]}""").RootElement.Clone());

    private string ObservationPath(string name = "A-test") =>
        Path.Combine(RepoRoot, "verification", "observations", name + ".json");

    private (int ExitCode, CommandResultStore Store, FakeProcessRunner Runner) Run(
        Func<HotReplRunnerOptions, CancellationToken, Task<VerificationRunnerResult>>? runner = null,
        VerifyCommand.Settings? settings = null,
        bool occupied = false)
    {
        var store = new CommandResultStore();
        var processRunner = new FakeProcessRunner();
        // Each fixture session launches its own game process, which stays alive until the
        // session finishes, as it does in practice.
        for (var session = 0; session < 4; session++)
        {
            processRunner.Enqueue(async (_, ct) =>
            {
                await Task.Delay(Timeout.Infinite, ct);
                return new BuildTool.Abstractions.ProcessResult(0, "", "", TimeSpan.Zero);
            });
        }
        var command = new VerifyCommand(
            RepoRoot,
            Config(),
            processRunner,
            store,
            hotReplReadinessTimeout: TimeSpan.FromMilliseconds(10),
            hotReplPollInterval: TimeSpan.FromMilliseconds(1),
            verificationRunner: runner ?? ((_, _) => Task.FromResult(Measured())),
            now: () => new DateTimeOffset(2026, 8, 26, 12, 0, 0, TimeSpan.Zero),
            endpointAnswers: (_, _) => Task.FromResult(occupied),
            relevantProcessExists: _ => false);

        var exit = command.RunAsync(settings ?? new VerifyCommand.Settings()).GetAwaiter().GetResult();
        return (exit, store, processRunner);
    }

    // --- fixture shape gate ---

    [Fact]
    public void RefusesMalformedFixtureBeforeLaunchingTheGame()
    {
        var assemblySha = WriteInstallation();
        WriteSnapshot(assemblySha);
        WriteFixture("""
        {
          "schemaVersion": 99,
          "build": {
            "serializedSchemaVersion": 99,
            "modelVersion": "1",
            "gameData": {
              "gameVersion": "0.9.31.1",
              "steamBuildId": "24986533",
              "assemblySha256": "bd2521453b35dfb58c4feec344d7fa5c8de5a8e73c58b5ff5aa5a4c12a9466fc"
            }
          },
          "name": "invalid",
          "buildData": {
            "schemaVersion": 1,
            "player": {
              "entityId": "player",
              "classId": "warrior",
              "raceId": "human",
              "level": -1,
              "veteranPoints": 0,
              "attributes": {
                "rawObserved": null,
                "baseProgression": { "strength": 0, "constitution": 0, "dexterity": 0, "intelligence": 0, "wisdom": 0, "charisma": 0 },
                "allocated": { "strength": 0, "constitution": 0, "dexterity": 0, "intelligence": 0, "wisdom": 0, "charisma": 0 },
                "derivedObserved": null
              },
              "skills": [],
              "equipment": []
            },
            "companions": [],
            "consumables": [],
            "ammunition": [],
            "learnedBookIds": [],
            "provenance": { "kind": "authored", "source": "test" }
          },
          "execution": { "seed": 7 }
        }
        """);

        var (exit, store, runner) = Run();

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Contains("Fixture shape validation failed before launch", store.ErrorDetails?.ToString());
        Assert.Contains("verification/fixtures/invalid.json", store.ErrorDetails?.ToString());
        Assert.Contains("buildData.player.level", store.ErrorDetails?.ToString());
        Assert.Empty(runner.Calls);
    }

    // --- build identity gate ---

    [Fact]
    public void RefusesWhenTheInstallationDoesNotMatchTheEvidence()
    {
        WriteInstallation("build A");
        WriteSnapshot("0000000000000000");   // evidence describes another build

        var (exit, store, runner) = Run();

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Contains("does not match the decompiled evidence", store.ErrorDetails?.ToString());
        // The game is never launched, so it cannot reach player data.
        Assert.Empty(runner.Calls);
    }

    [Fact]
    public void RefusesWhenNoEvidenceHasBeenRecorded()
    {
        WriteInstallation();

        var (exit, store, runner) = Run();

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Contains("update-server-scripts", store.ErrorDetails?.ToString());
        Assert.Empty(runner.Calls);
    }

    [Fact]
    public async Task AMismatchCanBeOverriddenDeliberately()
    {
        WriteInstallation("build A");
        WriteSnapshot("0000000000000000");
        WriteValidFixture();

        var store = new CommandResultStore();
        var mismatchRunner = new FakeProcessRunner();
        mismatchRunner.Enqueue(async (_, ct) =>
        {
            await Task.Delay(Timeout.Infinite, ct);
            return new BuildTool.Abstractions.ProcessResult(0, "", "", TimeSpan.Zero);
        });
        var command = new VerifyCommand(
            RepoRoot, Config(), mismatchRunner, store,
            hotReplReadinessTimeout: TimeSpan.FromMilliseconds(10),
            hotReplPollInterval: TimeSpan.FromMilliseconds(1),
            verificationRunner: (_, _) => Task.FromResult(Measured()),
            now: () => DateTimeOffset.UnixEpoch,
            endpointAnswers: (_, _) => Task.FromResult(false),
            relevantProcessExists: _ => false);

        var exit = await command.RunAsync(
            new VerifyCommand.Settings { AllowBuildMismatch = true });

        // It proceeds past the gate; the run itself is what decides the outcome.
        Assert.DoesNotContain("does not match the decompiled evidence",
            store.ErrorDetails?.ToString() ?? string.Empty);
        Assert.NotEqual(ExitCodes.Unreachable, exit);
    }

    // --- save gate ---

    [Fact]
    public void AnAbsentPlayerSaveRemainsAbsentAfterMeasurement()
    {
        var sha = WriteInstallation(withSave: false);
        WriteSnapshot(sha);
        WriteValidFixture();

        var (exit, _, _) = Run();

        Assert.Equal(ExitCodes.Success, exit);
        Assert.Null(PlayerSave.Read(GamePath));
        Assert.True(File.Exists(ObservationPath()));
    }

    [Fact]
    public void BacksUpTheSaveBesideItselfBeforeLaunching()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);
        WriteValidFixture();

        var (exit, _, _) = Run(runner: (_, _) =>
        {
            var backup = Assert.Single(Directory.GetDirectories(
                PlayerSave.DirectoryFor(GamePath), "game-dat-backup-*"));
            Assert.Equal("player save", File.ReadAllText(Path.Combine(backup, "game.dat")));
            return Task.FromResult(Measured());
        });

        Assert.Equal(ExitCodes.Success, exit);
    }

    [Fact]
    public void BacksUpTheSaveOnceAcrossSeveralFixtureSessions()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);
        WriteValidFixture("A-first", "A.test.first");
        WriteValidFixture("A-second", "A.test.second");
        var sessions = 0;

        var (exit, store, _) = Run(runner: (options, _) =>
        {
            sessions++;
            Assert.Contains("\"name\": \"A-" , options.FixtureJson);
            return Task.FromResult(Measured());
        });

        Assert.True(exit == ExitCodes.Success, store.ErrorDetails?.ToString());
        Assert.Equal(2, sessions);
        Assert.Single(Directory.GetDirectories(PlayerSave.DirectoryFor(GamePath), "game-dat-backup-*"));
        Assert.True(File.Exists(ObservationPath("A-first")));
        Assert.True(File.Exists(ObservationPath("A-second")));
        Assert.Contains("ok = True", store.Data?.ToString());
    }

    // --- isolation gate ---

    [Fact]
    public void ReportsFailureWhenTheSaveChangedDuringTheRun()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);
        WriteValidFixture();

        var (exit, store, _) = Run(runner: (_, _) =>
        {
            // Stand in for a run that reached player data.
            File.WriteAllText(PlayerSave.DatabasePath(GamePath), "modified");
            return Task.FromResult(Measured());
        });

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Contains("player save changed", store.ErrorDetails?.ToString());
        Assert.False(File.Exists(ObservationPath()));
    }

    [Fact]
    public void WritesAnObservationWithFixtureAndGameIdentities()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);
        WriteValidFixture();

        var (exit, _, _) = Run();

        Assert.Equal(ExitCodes.Success, exit);
        using var record = JsonDocument.Parse(File.ReadAllText(ObservationPath()));
        var root = record.RootElement;
        Assert.Equal("A-test", root.GetProperty("fixture").GetProperty("name").GetString());
        Assert.Equal("verification/fixtures/A-test.json", root.GetProperty("fixture").GetProperty("path").GetString());
        Assert.Equal(64, root.GetProperty("fixture").GetProperty("contentSha256").GetString()!.Length);
        Assert.Equal(sha, root.GetProperty("game").GetProperty("assemblySha256").GetString());
        Assert.Equal("0.9.31.0", root.GetProperty("game").GetProperty("gameVersion").GetString());
        Assert.True(root.GetProperty("achieved").GetProperty("ok").GetBoolean());
        Assert.Equal("A", root.GetProperty("observation").GetProperty("tier").GetString());
    }

    [Fact]
    public void EveryAttemptStartsFromAnEmptyScratchDirectory()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);
        WriteValidFixture();
        var scratch = Path.Combine(
            GamePath, "ancientkingdoms_Data", "verification-scratch");
        Directory.CreateDirectory(scratch);
        File.WriteAllText(Path.Combine(scratch, "game.dat"), "stale fixture state");
        var playerSave = PlayerSave.DatabasePath(GamePath);

        var (exit, _, _) = Run(runner: (_, _) =>
        {
            Assert.Empty(Directory.GetFiles(scratch));
            return Task.FromResult(Measured());
        });

        Assert.Equal(ExitCodes.Success, exit);
        Assert.True(Directory.Exists(scratch));
        Assert.Empty(Directory.GetFiles(scratch));
        Assert.Equal("player save", File.ReadAllText(playerSave));
    }

    [Fact]
    public void AFailedStageWritesNoObservationAndContinuesToTheNextFixture()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);
        WriteValidFixture("A-first", "A.test.first");
        WriteValidFixture("A-second", "A.test.second");

        var (exit, store, _) = Run(runner: (options, _) => Task.FromResult(
            options.FixtureJson!.Contains("A-first")
                ? new VerificationRunnerResult(false, ExitCodes.CommandFailed,
                    "readback mismatch on level", Stage: "build")
                : Measured()));

        Assert.Equal(ExitCodes.CommandFailed, exit);
        Assert.Contains("A-first: stage build: readback mismatch on level", store.ErrorDetails?.ToString());
        Assert.False(File.Exists(ObservationPath("A-first")));
        Assert.True(File.Exists(ObservationPath("A-second")));
    }

    [Fact]
    public void AnOccupiedEndpointPreservesScratchAndDoesNotBackUpOrLaunch()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);
        VerificationScratch.Prepare(GamePath);
        var scratch = VerificationScratch.DirectoryFor(GamePath);
        var database = Path.Combine(scratch, "game.dat");
        File.WriteAllText(database, "active fixture");

        WriteValidFixture();

        var (exit, _, runner) = Run(occupied: true);

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Empty(runner.Calls);
        Assert.Equal("active fixture", File.ReadAllText(database));
        Assert.Equal("player save", File.ReadAllText(PlayerSave.DatabasePath(GamePath)));
        Assert.Empty(Directory.GetDirectories(PlayerSave.DirectoryFor(GamePath), "game-dat-backup-*"));
    }

    [Fact]
    public void ARunnerFailureAndIsolationFailureAreBothReported()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);
        WriteValidFixture();
        var (exit, store, _) = Run(runner: (_, _) =>
        {
            File.WriteAllText(PlayerSave.DatabasePath(GamePath), "modified");
            return Task.FromResult(new VerificationRunnerResult(false, ExitCodes.CommandFailed, "fixture application refused"));
        });

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Contains("fixture application refused", store.ErrorDetails?.ToString());
        Assert.Contains("player save changed", store.ErrorDetails?.ToString());
    }
}
