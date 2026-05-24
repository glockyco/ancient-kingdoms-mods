using System;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.HotRepl;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

public class HotReplExportRunnerTests
{
    // ---------- canned protocol messages ----------

    private const string Handshake =
        @"{""type"":""handshake"",""protocolVersion"":2,""serverVersion"":""3.0.0""}";

    private const string CommandsListResult =
        @"{""type"":""commands_list_result"",""id"":""1"",""commands"":[" +
        @"{""name"":""compendium.preflight"",""version"":1,""kind"":""sync""}," +
        @"{""name"":""world.summary"",""version"":1,""kind"":""sync""}," +
        @"{""name"":""compendium.export"",""version"":1,""kind"":""job""}," +
        @"{""name"":""game.quit"",""version"":1,""kind"":""sync""}]}";

    private const string PreflightOk =
        @"{""type"":""command_result"",""id"":""2"",""status"":""ok""," +
        @"""output"":{""ready"":true,""localPlayerReady"":true}}";

    private const string JobAccepted =
        @"{""type"":""job_accepted"",""id"":""3"",""jobId"":""j-001"",""state"":""running""}";

    private const string JobRunning =
        @"{""type"":""job_status_result"",""id"":""4"",""jobId"":""j-001"",""state"":""running""}";

    private const string ArtifactsBase =
        @"""data.monsters"":{""logicalName"":""data.monsters"",""uri"":""file:///a"",""path"":""/a/m.json"",""contentType"":""application/json"",""byteSize"":10,""sha256"":""abc"",""finalized"":true}," +
        @"""visual-assets.manifest"":{""logicalName"":""visual-assets.manifest"",""uri"":""file:///b"",""path"":""/b/v.json"",""contentType"":""application/json"",""byteSize"":5,""sha256"":""def"",""finalized"":true}";

    private const string ArtifactsWithScreenshots =
        ArtifactsBase +
        @",""screenshots.metadata"":{""logicalName"":""screenshots.metadata"",""uri"":""file:///c"",""path"":""/c/m.json"",""contentType"":""application/json"",""byteSize"":4,""sha256"":""ghi"",""finalized"":true}";

    private static string JobResultMsg(string state, string status, string artifacts)
        => $@"{{""type"":""job_result"",""id"":""4"",""jobId"":""j-001"",""state"":""{state}"",""status"":""{status}"",""artifacts"":{{{artifacts}}},""output"":{{""ok"":true,""durationMs"":5000,""exporterCount"":27,""errors"":[]}}}}";

    private const string QuitOk =
        @"{""type"":""command_result"",""id"":""5"",""status"":""ok"",""output"":{""quitting"":true}}";

    // ---------- helpers ----------

    private static FakeHotReplTransport BuildTransport(
        bool withScreenshots = false,
        string jobState = "done",
        string jobStatus = "ok",
        bool emptyArtifacts = false)
    {
        var t = new FakeHotReplTransport();
        t.EnqueueServerMessage(Handshake);
        t.EnqueueServerMessage(CommandsListResult);
        t.EnqueueServerMessage(PreflightOk);
        t.EnqueueServerMessage(JobAccepted);
        t.EnqueueServerMessage(JobRunning);
        var arts = emptyArtifacts ? string.Empty :
            withScreenshots ? ArtifactsWithScreenshots : ArtifactsBase;
        t.EnqueueServerMessage(JobResultMsg(jobState, jobStatus, arts));
        t.EnqueueServerMessage(QuitOk);
        return t;
    }

    private static HotReplExportRunner BuildRunner(
        FakeHotReplTransport transport, bool screenshots = false)
        => new(transport, new HotReplRunnerOptions
        {
            Endpoint = new Uri("ws://127.0.0.1:18590"),
            Screenshots = screenshots,
            ReadinessTimeout = TimeSpan.FromSeconds(5),
            JobTimeout = TimeSpan.FromMinutes(2),
            PollInterval = TimeSpan.Zero,
        });

    // ---------- tests ----------

    [Fact]
    public async Task Runner_SendsCommandsList()
    {
        var t = BuildTransport();
        await BuildRunner(t).RunAsync(CancellationToken.None);
        Assert.Contains(t.SentMessages, m => m.Contains("commands_list"));
    }

    [Fact]
    public async Task Runner_DoesNotSendAuthOrLeaseOrPingOrClientJobResult()
    {
        var t = BuildTransport();
        await BuildRunner(t).RunAsync(CancellationToken.None);
        Assert.DoesNotContain(t.SentMessages, m =>
            m.Contains("control_auth")
            || m.Contains("lease_acquire")
            || m.Contains("\"ping\"")
            || m.Contains("\"job_result\"")); // client must NOT send job_result
    }

    [Fact]
    public async Task Runner_LaunchesPreflightBeforeExportJob()
    {
        var t = BuildTransport();
        await BuildRunner(t).RunAsync(CancellationToken.None);
        var preIdx = t.SentMessages.FindIndex(m => m.Contains("compendium.preflight"));
        var expIdx = t.SentMessages.FindIndex(m => m.Contains("compendium.export"));
        Assert.True(preIdx >= 0 && expIdx >= 0 && preIdx < expIdx,
            "preflight must be sent before compendium.export");
    }

    [Fact]
    public async Task Runner_SendsGameQuitAfterTerminalResult()
    {
        var t = BuildTransport();
        await BuildRunner(t).RunAsync(CancellationToken.None);
        var quitIdx = t.SentMessages.FindIndex(m => m.Contains("game.quit"));
        var expIdx  = t.SentMessages.FindIndex(m => m.Contains("compendium.export"));
        Assert.True(quitIdx > expIdx, "game.quit must be sent after compendium.export");
    }

    [Fact]
    public async Task Runner_ReturnsSuccess_WhenJobOk()
    {
        var t = BuildTransport();
        var result = await BuildRunner(t).RunAsync(CancellationToken.None);
        Assert.True(result.Ok);
        Assert.Equal(ExitCodes.Success, result.ExitCode);
    }

    [Fact]
    public async Task Runner_ReturnsFailed_WhenJobFails()
    {
        var t = BuildTransport(jobState: "failed", jobStatus: "failed");
        var result = await BuildRunner(t).RunAsync(CancellationToken.None);
        Assert.False(result.Ok);
        Assert.NotEqual(ExitCodes.Success, result.ExitCode);
    }

    [Fact]
    public async Task Runner_RejectsProtocolVersionNotTwo()
    {
        var t = new FakeHotReplTransport();
        t.EnqueueServerMessage(
            @"{""type"":""handshake"",""protocolVersion"":99,""serverVersion"":""99.0""}");
        var runner = new HotReplExportRunner(t, new HotReplRunnerOptions
        {
            Endpoint = new Uri("ws://127.0.0.1:18590"),
            Screenshots = false,
            ReadinessTimeout = TimeSpan.FromSeconds(1),
            JobTimeout = TimeSpan.FromSeconds(1),
            PollInterval = TimeSpan.Zero,
        });
        var result = await runner.RunAsync(CancellationToken.None);
        Assert.False(result.Ok);
        Assert.Contains("protocol", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Runner_RejectsMissingRequiredArtifacts()
    {
        var t = BuildTransport(emptyArtifacts: true);
        var result = await BuildRunner(t).RunAsync(CancellationToken.None);
        Assert.False(result.Ok);
        Assert.Contains("artifact", result.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Runner_IncludesScreenshotsTrueArg_WhenRequested()
    {
        var t = BuildTransport(withScreenshots: true);
        await BuildRunner(t, screenshots: true).RunAsync(CancellationToken.None);
        var exportMsg = t.SentMessages.Find(m => m.Contains("compendium.export"));
        Assert.NotNull(exportMsg);
        Assert.Contains("\"screenshots\":true", exportMsg);
    }
}
