using System;
using System.IO;
using BuildTool.Game;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.HotRepl;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

/// <summary>
/// The run stops unless the game confirms it opened a scratch database. Everything a run
/// does afterwards writes to whichever database the game actually opened, so the confirmation
/// is read from the reported value rather than inferred from the call succeeding.
/// </summary>
public sealed class HotReplVerificationRunnerTests : IDisposable
{
    private readonly string _prefix = Path.Combine(Path.GetTempPath(), "verification-runner-" + Guid.NewGuid().ToString("N"));
    private string GamePath => Path.Combine(_prefix, "drive_c", "game");

    public HotReplVerificationRunnerTests()
    {
        Directory.CreateDirectory(PlayerSave.DirectoryFor(GamePath));
        VerificationScratch.Prepare(GamePath);
    }
    public void Dispose() => Directory.Delete(_prefix, recursive: true);

    private const string IdentityOk = @"{""type"":""command_result"",""id"":""identity"",""status"":""ok"",""output"":{""verificationSession"":""owned-test-session""}}";

    private const string Handshake = @"{""type"":""handshake"",""protocolVersion"":2}";

    private const string CommandsListResult =
        @"{""type"":""commands_list_result"",""id"":""1"",""commands"":[" +
        @"{""name"":""game.useScratchDatabase""},{""name"":""world.summary""},{""name"":""game.quit""}]}";

    private const string FixtureCommandsListResult =
        @"{""type"":""commands_list_result"",""id"":""1"",""commands"":[" +
        @"{""name"":""game.useScratchDatabase""},{""name"":""world.summary""}," +
        @"{""name"":""world.enter""},{""name"":""fixture.createCharacter""}," +
        @"{""name"":""fixture.validate""},{""name"":""fixture.buildCharacter""}," +
        @"{""name"":""fixture.observe""}," +
        @"{""name"":""game.quit""}]}";

    private const string FixtureJson =
        @"{""schemaVersion"":3,""build"":{""modelVersion"":""2""},""name"":""A-test"",""tier"":""A""," +
        @"""buildData"":{""player"":{""classId"":""warrior"",""raceId"":""human""}}," +
        @"""execution"":{""seed"":7}}";

    private const string QuitOk =
        @"{""type"":""command_result"",""id"":""9"",""status"":""ok"",""output"":{""quitting"":true}}";

    private static string RedirectOk(
        string resolved = "C:/game/ancientkingdoms_Data/verification-scratch/game.dat",
        bool isScratch = true,
        int characters = 6)
        => $@"{{""type"":""command_result"",""id"":""2"",""status"":""ok"",""output"":{{" +
           $@"""previousPath"":""C:/game/ancientkingdoms_Data/game.dat""," +
           $@"""resolvedPath"":""{resolved}""," +
           $@"""isScratch"":{(isScratch ? "true" : "false")}," +
           $@"""characterCount"":{characters}}}}}";

    private HotReplRunnerOptions Options() => new()
    {
        Endpoint = new Uri("ws://127.0.0.1:18590"),
        VerificationSession = "owned-test-session",
        VerificationGamePath = GamePath,
        VerificationWinePrefix = _prefix,
        ReadinessTimeout = TimeSpan.FromSeconds(5),
        PollInterval = TimeSpan.FromMilliseconds(1),
    };

    private async Task<VerificationRunnerResult> RunAsync(FakeHotReplTransport transport)
        => await new HotReplVerificationRunner(transport, Options()).RunAsync(CancellationToken.None);

    private static FakeHotReplTransport Ready()
    {
        var transport = new FakeHotReplTransport();
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(CommandsListResult);
        transport.EnqueueServerMessage(Handshake);   // fresh connection after readiness
        transport.EnqueueServerMessage(IdentityOk);
        return transport;
    }

    [Fact]
    public async Task ConfirmsTheRedirectAndReportsThePath()
    {
        var transport = Ready();
        transport.EnqueueServerMessage(RedirectOk());
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(IdentityOk);
        transport.EnqueueServerMessage(QuitOk);

        var result = await RunAsync(transport);

        Assert.True(result.Ok, result.Message);
        Assert.Equal(ExitCodes.Success, result.ExitCode);
        Assert.Equal(
            "C:/game/ancientkingdoms_Data/verification-scratch/game.dat",
            result.ResolvedDatabasePath);
        Assert.Equal(6, result.CharacterCount);
    }

    [Fact]
    public async Task StopsWhenTheGameDoesNotConfirmAScratchDatabase()
    {
        var transport = Ready();
        transport.EnqueueServerMessage(
            RedirectOk(resolved: "C:/game/ancientkingdoms_Data/game.dat", isScratch: false));
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(IdentityOk);
        transport.EnqueueServerMessage(QuitOk);

        var result = await RunAsync(transport);

        Assert.False(result.Ok);
        Assert.Equal(ExitCodes.CommandFailed, result.ExitCode);
        Assert.Contains("did not confirm a scratch database", result.Message);
        // The path is reported so the operator can see what the game opened.
        Assert.Equal("C:/game/ancientkingdoms_Data/game.dat", result.ResolvedDatabasePath);
    }

    [Fact]
    public async Task QuitsTheGameEvenWhenItRefusesToRedirect()
    {
        var transport = Ready();
        transport.EnqueueServerMessage(
            @"{""type"":""command_result"",""id"":""2"",""status"":""error"",""error"":{" +
            @"""code"":""databaseAlreadyOpen"",""message"":""already open""}}");
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(IdentityOk);
        transport.EnqueueServerMessage(QuitOk);

        var result = await RunAsync(transport);

        Assert.False(result.Ok);
        Assert.Contains("databaseAlreadyOpen", result.Message);
        Assert.Contains("game.quit", string.Join("\n", transport.SentMessages));
    }

    private HotReplRunnerOptions FixtureOptions() => new()
    {
        Endpoint = new Uri("ws://127.0.0.1:18590"),
        VerificationSession = "owned-test-session",
        VerificationGamePath = GamePath,
        VerificationWinePrefix = _prefix,
        ReadinessTimeout = TimeSpan.FromSeconds(5),
        PollInterval = TimeSpan.FromMilliseconds(1),
        FixtureJson = FixtureJson,
    };

    private static FakeHotReplTransport ReadyForFixture(int characters = 0)
    {
        var transport = new FakeHotReplTransport();
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(FixtureCommandsListResult);
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(IdentityOk);
        transport.EnqueueServerMessage(RedirectOk(characters: characters));
        return transport;
    }

    private static void EnqueueJob(
        FakeHotReplTransport transport, string jobId, string output = "{}", bool ok = true, string artifacts = "{}")
    {
        transport.EnqueueServerMessage(
            $@"{{""type"":""job_accepted"",""id"":""3"",""jobId"":""{jobId}""}}");
        transport.EnqueueServerMessage(
            $@"{{""type"":""job_status_result"",""id"":""4"",""jobId"":""{jobId}"",""state"":""done"",""status"":""{(ok ? "ok" : "error")}"",""output"":{output},""artifacts"":{artifacts}}}");
    }

    /// <summary>Writes an observation beside the scratch database and describes it as the game would.</summary>
    private string WriteObservationArtifact(string json)
    {
        var path = Path.Combine(VerificationScratch.DirectoryFor(GamePath), "observation.json");
        File.WriteAllText(path, json);
        var sha = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(path))).ToLowerInvariant();
        return $@"{{""observation"":{{""logicalName"":""observation"",""path"":""{path}"",""sha256"":""{sha}""}}}}";
    }

    private static void EnqueueQuit(FakeHotReplTransport transport)
    {
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(IdentityOk);
        transport.EnqueueServerMessage(QuitOk);
    }

    [Fact]
    public async Task CreatesEntersValidatesBuildsAndObservesOneFixture()
    {
        var transport = ReadyForFixture();
        EnqueueJob(transport, "create-1");
        EnqueueJob(transport, "enter-1");
        transport.EnqueueServerMessage(
            @"{""type"":""command_result"",""id"":""5"",""status"":""ok"",""output"":{""ok"":true}}");
        EnqueueJob(transport, "build-1", @"{""ok"":true,""level"":50}");
        var artifacts = WriteObservationArtifact(@"{""tier"":""A"",""measurements"":[]}");
        EnqueueJob(transport, "observe-1", @"{""tier"":""A"",""artifact"":""observation""}", artifacts: artifacts);
        EnqueueQuit(transport);

        var result = await new HotReplVerificationRunner(transport, FixtureOptions())
            .RunAsync(CancellationToken.None);

        Assert.True(result.Ok, result.Message);
        Assert.Equal("observe", result.Stage);
        Assert.Equal(50, result.Achieved!.Value.GetProperty("level").GetInt32());
        Assert.Equal("A", result.Observation!.Value.GetProperty("tier").GetString());
        var sent = string.Join("\n", transport.SentMessages);
        foreach (var command in new[] { "fixture.createCharacter", "world.enter", "fixture.validate", "fixture.buildCharacter", "fixture.observe", "game.quit" })
            Assert.Contains(command, sent);
        Assert.Contains("\"characterName\":\"Verifier\"", sent);
        Assert.Contains("\"class\":\"warrior\"", sent);
        Assert.True(sent.IndexOf("fixture.validate\"", StringComparison.Ordinal) < sent.IndexOf("fixture.buildCharacter", StringComparison.Ordinal));
    }

    [Fact]
    public async Task RefusesAnObservationArtifactWhoseHashDoesNotMatch()
    {
        var transport = ReadyForFixture();
        EnqueueJob(transport, "create-1");
        EnqueueJob(transport, "enter-1");
        transport.EnqueueServerMessage(
            @"{""type"":""command_result"",""id"":""5"",""status"":""ok"",""output"":{""ok"":true}}");
        EnqueueJob(transport, "build-1", @"{""ok"":true}");
        var artifacts = WriteObservationArtifact(@"{""tier"":""A""}").Replace("\"sha256\":\"", "\"sha256\":\"00");
        EnqueueJob(transport, "observe-1", @"{""tier"":""A"",""artifact"":""observation""}", artifacts: artifacts);
        EnqueueQuit(transport);

        var result = await new HotReplVerificationRunner(transport, FixtureOptions())
            .RunAsync(CancellationToken.None);

        Assert.False(result.Ok);
        Assert.Equal("observe", result.Stage);
        Assert.Contains("hash", result.Message);
    }

    [Fact]
    public async Task NamesTheBuildStageWhenReadbackFailsAndKeepsTheAchievedState()
    {
        var transport = ReadyForFixture();
        EnqueueJob(transport, "create-1");
        EnqueueJob(transport, "enter-1");
        transport.EnqueueServerMessage(
            @"{""type"":""command_result"",""id"":""5"",""status"":""ok"",""output"":{""ok"":true}}");
        EnqueueJob(transport, "build-1", @"{""ok"":false,""steps"":[{""name"":""level"",""ok"":false}]}");
        EnqueueQuit(transport);

        var result = await new HotReplVerificationRunner(transport, FixtureOptions())
            .RunAsync(CancellationToken.None);

        Assert.False(result.Ok);
        Assert.Equal("build", result.Stage);
        Assert.False(result.Achieved!.Value.GetProperty("ok").GetBoolean());
        Assert.Null(result.Observation);
        Assert.DoesNotContain("fixture.observe", string.Join("\n", transport.SentMessages));
    }

    [Fact]
    public async Task RefusesAScratchDatabaseThatAlreadyHoldsCharacters()
    {
        var transport = ReadyForFixture(characters: 2);
        EnqueueQuit(transport);

        var result = await new HotReplVerificationRunner(transport, FixtureOptions())
            .RunAsync(CancellationToken.None);

        Assert.False(result.Ok);
        Assert.Equal("scratch", result.Stage);
        Assert.DoesNotContain("fixture.createCharacter", string.Join("\n", transport.SentMessages));
    }

    [Fact]
    public async Task RefusesAnUnsupportedProtocolVersion()
    {
        var transport = new FakeHotReplTransport();
        transport.EnqueueServerMessage(@"{""type"":""handshake"",""protocolVersion"":1}");

        var result = await RunAsync(transport);

        Assert.False(result.Ok);
        Assert.Equal(ExitCodes.Internal, result.ExitCode);
        Assert.Contains("protocol version 1", result.Message);
    }

    [Fact]
    public async Task WaitsForTheCommandsItCallsAndReportsWhatIsMissing()
    {
        var transport = new FakeHotReplTransport();
        transport.EnqueueServerMessage(Handshake);

        // The host is up but the game has not registered the redirect command. Keep
        // answering, so the run ends on its readiness deadline rather than on an empty
        // queue, which is a different failure.
        for (var i = 0; i < 100; i++)
        {
            transport.EnqueueServerMessage(
                @"{""type"":""commands_list_result"",""id"":""1"",""commands"":[{""name"":""game.quit""}]}");
        }

        var result = await new HotReplVerificationRunner(transport, new HotReplRunnerOptions
        {
            Endpoint = new Uri("ws://127.0.0.1:18590"),
            ReadinessTimeout = TimeSpan.FromMilliseconds(40),
            PollInterval = TimeSpan.FromMilliseconds(5),
        }).RunAsync(CancellationToken.None);

        Assert.False(result.Ok);
        Assert.Equal(ExitCodes.ReadinessFailed, result.ExitCode);
        Assert.Contains("game.useScratchDatabase", result.Message);
    }

    [Fact]
    public async Task TreatsAMissingOutputAsNoConfirmation()
    {
        var transport = Ready();
        transport.EnqueueServerMessage(
            @"{""type"":""command_result"",""id"":""2"",""status"":""ok""}");
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(IdentityOk);
        transport.EnqueueServerMessage(QuitOk);

        var result = await RunAsync(transport);

        Assert.False(result.Ok);
        Assert.Contains("did not confirm", result.Message);
    }

    [Fact]
    public async Task AForeignSessionReceivesNeitherMutationNorQuit()
    {
        var transport = new FakeHotReplTransport();
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(CommandsListResult);
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(IdentityOk.Replace("owned-test-session", "foreign-session"));

        var result = await RunAsync(transport);

        Assert.False(result.Ok);
        Assert.Contains("identity does not match", result.Message);
        var sent = string.Join("\n", transport.SentMessages);
        Assert.DoesNotContain("game.useScratchDatabase", sent);
        Assert.DoesNotContain("game.quit", sent);
    }

    [Fact]
    public async Task AClaimedScratchPathCannotAuthorizeAnotherInstallation()
    {
        var transport = Ready();
        transport.EnqueueServerMessage(RedirectOk("C:/another/ancientkingdoms_Data/verification-scratch/game.dat"));
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(IdentityOk);
        transport.EnqueueServerMessage(QuitOk);

        var result = await RunAsync(transport);

        Assert.False(result.Ok);
        var sent = string.Join("\n", transport.SentMessages);
        Assert.DoesNotContain("world.enter", sent);
        Assert.DoesNotContain("fixture.createCharacter", sent);
        Assert.Contains("game.quit", sent);
    }
}
