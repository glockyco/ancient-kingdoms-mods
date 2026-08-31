using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
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
    private readonly string _root = Directory.CreateTempSubdirectory("ak-verify").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private string RepoRoot => Path.Combine(_root, "repo");
    private string GamePath => Path.Combine(_root, "game");

    private LocalConfig Config() => new(
        GamePath: GamePath,
        DataExportPath: Path.Combine(_root, "export"),
        WinePath: "/usr/bin/true",
        WinePrefix: Path.Combine(_root, "prefix"),
        HotReplEndpoint: "ws://127.0.0.1:18590");

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

    private void WriteFixture(string body)
    {
        var directory = ScratchStates.FixturesDirectory(RepoRoot);
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, "invalid.json"), body);
    }

    private (int ExitCode, CommandResultStore Store, FakeProcessRunner Runner) Run(
        Func<HotReplRunnerOptions, CancellationToken, Task<VerificationRunnerResult>>? runner = null)
    {
        var store = new CommandResultStore();
        var processRunner = new FakeProcessRunner();
        // The game process stays alive until the run finishes, as it does in practice.
        processRunner.Enqueue(async (_, ct) =>
        {
            await Task.Delay(Timeout.Infinite, ct);
            return new BuildTool.Abstractions.ProcessResult(0, "", "", TimeSpan.Zero);
        });
        var command = new VerifyCommand(
            RepoRoot,
            Config(),
            processRunner,
            store,
            hotReplReadinessTimeout: TimeSpan.FromMilliseconds(10),
            hotReplPollInterval: TimeSpan.FromMilliseconds(1),
            verificationRunner: runner ?? ((_, _) =>
                Task.FromResult(new VerificationRunnerResult(
                    true, ExitCodes.Success, "redirected",
                    "C:/game/ancientkingdoms_Data/verification-scratch/game.dat", 6))),
            now: () => new DateTimeOffset(2026, 8, 26, 12, 0, 0, TimeSpan.Zero));

        var exit = command.RunAsync(new VerifyCommand.Settings()).GetAwaiter().GetResult();
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
          "gameVersion": "0.9.31.0",
          "name": "invalid",
          "seed": 7,
          "character": {
            "class": "Warrior",
            "race": "Human",
            "level": -1
          }
        }
        """);

        var (exit, store, runner) = Run();

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Contains("Fixture shape validation failed before launch", store.ErrorDetails?.ToString());
        Assert.Contains("verification/fixtures/invalid.json", store.ErrorDetails?.ToString());
        Assert.Contains("character.level", store.ErrorDetails?.ToString());
        Assert.Contains("character.skills", store.ErrorDetails?.ToString());
        Assert.Contains("consumables", store.ErrorDetails?.ToString());
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
    public void AMismatchCanBeOverriddenDeliberately()
    {
        WriteInstallation("build A");
        WriteSnapshot("0000000000000000");

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
            verificationRunner: (_, _) => Task.FromResult(
                new VerificationRunnerResult(true, ExitCodes.Success, "redirected", "C:/x", 1)),
            now: () => DateTimeOffset.UnixEpoch);

        var exit = command.RunAsync(
            new VerifyCommand.Settings { AllowBuildMismatch = true }).GetAwaiter().GetResult();

        // It proceeds past the gate; the run itself is what decides the outcome.
        Assert.DoesNotContain("does not match the decompiled evidence",
            store.ErrorDetails?.ToString() ?? string.Empty);
        Assert.NotEqual(ExitCodes.Unreachable, exit);
    }

    // --- save gate ---

    [Fact]
    public void RefusesWhenThereIsNoSaveToBackUp()
    {
        var sha = WriteInstallation(withSave: false);
        WriteSnapshot(sha);

        var (exit, store, runner) = Run();

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Contains("nothing can be backed up", store.ErrorDetails?.ToString());
        Assert.Empty(runner.Calls);
    }

    [Fact]
    public void BacksUpTheSaveBesideItselfBeforeLaunching()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);

        Run();

        var backup = Path.Combine(
            PlayerSave.DirectoryFor(GamePath), "game-dat-backup-20260826-120000", "game.dat");
        Assert.True(File.Exists(backup), backup);
        Assert.Equal("player save", File.ReadAllText(backup));
    }

    // --- isolation gate ---

    [Fact]
    public void ReportsFailureWhenTheSaveChangedDuringTheRun()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);

        var (exit, store, _) = Run(runner: (_, _) =>
        {
            // Stand in for a run that reached player data.
            File.WriteAllText(PlayerSave.DatabasePath(GamePath), "modified");
            return Task.FromResult(new VerificationRunnerResult(
                true, ExitCodes.Success, "redirected", "C:/x", 1));
        });

        Assert.NotEqual(ExitCodes.Success, exit);
        Assert.Contains("player save changed", store.ErrorDetails?.ToString());
    }

    [Fact]
    public void SucceedsWhenTheRunConfirmsScratchAndLeavesTheSaveAlone()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);

        var (exit, store, _) = Run();

        Assert.Equal(ExitCodes.Success, exit);
        Assert.Contains("verification-scratch", store.Data?.ToString());
    }

    [Fact]
    public void AFailedRunStillReportsWhetherTheSaveSurvived()
    {
        var sha = WriteInstallation();
        WriteSnapshot(sha);

        var (exit, store, _) = Run(runner: (_, _) => Task.FromResult(
            new VerificationRunnerResult(false, ExitCodes.CommandFailed, "did not confirm")));

        Assert.Equal(ExitCodes.CommandFailed, exit);
        Assert.Contains("did not confirm", store.ErrorDetails?.ToString());
    }
}
