using System;
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
public sealed class HotReplVerificationRunnerTests
{
    private const string Handshake = @"{""type"":""handshake"",""protocolVersion"":2}";

    private const string CommandsListResult =
        @"{""type"":""commands_list_result"",""id"":""1"",""commands"":[" +
        @"{""name"":""game.useScratchDatabase""},{""name"":""world.summary""},{""name"":""game.quit""}]}";

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

    private static HotReplRunnerOptions Options() => new()
    {
        Endpoint = new Uri("ws://127.0.0.1:18590"),
        ReadinessTimeout = TimeSpan.FromSeconds(5),
        PollInterval = TimeSpan.FromMilliseconds(1),
    };

    private static async Task<VerificationRunnerResult> RunAsync(FakeHotReplTransport transport)
        => await new HotReplVerificationRunner(transport, Options()).RunAsync(CancellationToken.None);

    private static FakeHotReplTransport Ready()
    {
        var transport = new FakeHotReplTransport();
        transport.EnqueueServerMessage(Handshake);
        transport.EnqueueServerMessage(CommandsListResult);
        transport.EnqueueServerMessage(Handshake);   // fresh connection after readiness
        return transport;
    }

    [Fact]
    public async Task ConfirmsTheRedirectAndReportsThePath()
    {
        var transport = Ready();
        transport.EnqueueServerMessage(RedirectOk());
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
        transport.EnqueueServerMessage(QuitOk);

        var result = await RunAsync(transport);

        Assert.False(result.Ok);
        Assert.Contains("databaseAlreadyOpen", result.Message);
        Assert.Contains("game.quit", string.Join("\n", transport.SentMessages));
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
        transport.EnqueueServerMessage(QuitOk);

        var result = await RunAsync(transport);

        Assert.False(result.Ok);
        Assert.Contains("did not confirm", result.Message);
    }
}
