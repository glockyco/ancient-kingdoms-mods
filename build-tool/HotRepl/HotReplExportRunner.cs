using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Output;

namespace BuildTool.HotRepl;

public sealed class HotReplRunnerOptions
{
    public required Uri Endpoint { get; init; }
    public bool Screenshots { get; init; }
    public string? FixtureMatrixJson { get; init; }
    public TimeSpan ReadinessTimeout { get; init; } = TimeSpan.FromMinutes(3);
    public TimeSpan JobTimeout { get; init; } = TimeSpan.FromMinutes(60);
    public TimeSpan PollInterval { get; init; } = TimeSpan.FromSeconds(3);
}

public sealed record ExportRunnerResult(
    bool Ok,
    int ExitCode,
    string Message,
    IReadOnlyDictionary<string, JsonElement>? Artifacts = null);

/// <summary>
/// Narrow WebSocket orchestration client for the AK export path.
/// Sequence: connect → handshake (v2) → commands_list retry → preflight
///           → compendium.export job → job_status poll → artifact verify → game.quit.
///
/// Does NOT send: control_auth, lease_acquire, ping, profile, or client job_result.
/// </summary>
internal sealed class HotReplExportRunner
{
    private static readonly string[] RequiredCommands =
    {
        "compendium.preflight", "world.summary", "compendium.export", "game.quit",
    };

    private readonly HotReplRunnerOptions _options;
    private readonly HotReplSession _session;

    internal HotReplExportRunner(IHotReplTransport transport, HotReplRunnerOptions options)
    {
        _options = options;
        _session = new HotReplSession(transport, options);
    }

    public static HotReplExportRunner Create(HotReplRunnerOptions options)
        => new(new ClientWebSocketTransport(), options);

    public async Task<ExportRunnerResult> RunAsync(CancellationToken ct)
    {
        try
        {
            return await RunCoreAsync(ct);
        }
        catch (OperationCanceledException)
        {
            return new(false, ExitCodes.Cancelled, "Export cancelled.");
        }
        catch (Exception ex)
        {
            return new(false, ExitCodes.Internal,
                $"Runner error: {ex.GetType().Name}: {ex.Message}");
        }
    }

    private async Task<ExportRunnerResult> RunCoreAsync(CancellationToken ct)
    {
        var failure = await _session.ConnectAsync(ct);
        if (failure != null)
            return Failed(failure);

        failure = await _session.WaitForCommandsAsync(RequiredCommands, ct);
        if (failure != null)
            return Failed(failure);

        // Use a fresh connection for the export after startup/catalog readiness.
        // HotRepl can accept an early socket before Unity finishes registering
        // game commands; that startup connection may be closed by the host before
        // the long-running export job begins.
        failure = await _session.ConnectAsync(ct);
        if (failure != null)
            return Failed(failure);

        // 3. compendium.preflight
        using var preflightDoc = await _session.CallAsync("compendium.preflight", "{}", ct);
        var preflightStatus = preflightDoc.RootElement.TryGetProperty("status", out var ps)
            ? ps.GetString() : null;
        if (preflightStatus != "ok")
            return new(false, ExitCodes.ReadinessFailed, "compendium.preflight did not return ok.");

        // 4. compendium.export → job_accepted
        var exportArgs = _options.Screenshots
            ? "{\"screenshots\":true}"
            : "{\"screenshots\":false}";
        using var acceptedDoc = await _session.CallAsync("compendium.export", exportArgs, ct);
        var jobId = acceptedDoc.RootElement.TryGetProperty("jobId", out var jid)
            ? jid.GetString() ?? throw new InvalidOperationException("Missing jobId in job_accepted")
            : throw new InvalidOperationException("No jobId property in response");

        // 5. Poll job_status until terminal result
        var jobDeadline = DateTime.UtcNow + _options.JobTimeout;
        IReadOnlyDictionary<string, JsonElement>? artifacts = null;
        bool jobOk = false;
        string jobMessage = "Export job did not complete.";

        while (true)
        {
            ct.ThrowIfCancellationRequested();
            if (DateTime.UtcNow >= jobDeadline)
                return new(false, ExitCodes.ReadinessFailed,
                    "Timed out waiting for export job to complete.");

            await Task.Delay(_options.PollInterval, ct);

            using var pollDoc = await _session.SendReceiveAsync(
                $"{{\"type\":\"job_status\",\"id\":\"{_session.Id()}\",\"jobId\":\"{jobId}\"}}",
                ct);

            var msgType = pollDoc.RootElement.TryGetProperty("type", out var mt)
                ? mt.GetString() : null;
            var state = pollDoc.RootElement.TryGetProperty("state", out var st)
                ? st.GetString() : null;

            // Intermediate status — keep polling
            if (msgType == "job_status_result" && state == "running")
                continue;

            // Terminal: job_result or job_status_result with non-running state
            if (msgType is "job_result" or "job_status_result")
            {
                var status = pollDoc.RootElement.TryGetProperty("status", out var s)
                    ? s.GetString() : null;
                jobOk = status == "ok" && state == "done";
                jobMessage = jobOk ? "Export completed." :
                    DescribeJobFailure(state, status, pollDoc.RootElement);

                if (pollDoc.RootElement.TryGetProperty("artifacts", out var artsEl))
                    artifacts = ParseArtifacts(artsEl);

                break;
            }
            // Unknown message type mid-poll — discard and re-poll
        }

        // 6. Verify artifacts
        if (jobOk)
        {
            var verifyError = VerifyArtifacts(artifacts, _options.Screenshots);
            if (verifyError != null)
            {
                // Attempt game.quit before returning failure
                await _session.TryQuitAsync(ct);
                return new(false, ExitCodes.CommandFailed, verifyError, artifacts);
            }
        }

        // 7. game.quit (always attempt after terminal result)
        await _session.TryQuitAsync(ct);

        return jobOk
            ? new(true, ExitCodes.Success, jobMessage, artifacts)
            : new(false, ExitCodes.CommandFailed, jobMessage, artifacts);
    }

    // ---- helpers ----

    private static ExportRunnerResult Failed(HotReplFailure failure)
        => new(false, failure.ExitCode, failure.Message);


    private static string DescribeJobFailure(
        string? state,
        string? status,
        JsonElement root)
    {
        var message = $"Export job terminal: state={state} status={status}.";
        if (!root.TryGetProperty("error", out var error))
            return message;

        var code = error.TryGetProperty("code", out var codeEl)
            ? codeEl.GetString()
            : null;
        var detail = error.TryGetProperty("message", out var messageEl)
            ? messageEl.GetString()
            : null;
        if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(detail))
            return message;

        return $"{message} {code}: {detail}";
    }

    private static string? VerifyArtifacts(
        IReadOnlyDictionary<string, JsonElement>? artifacts,
        bool screenshotsRequested)
    {
        if (artifacts == null || artifacts.Count == 0)
            return "Export job returned no artifacts.";

        bool hasData = false;
        foreach (var key in artifacts.Keys)
            if (key.StartsWith("data.", StringComparison.Ordinal)) { hasData = true; break; }
        if (!hasData)
            return "Artifact map has no data.* keys.";

        if (!artifacts.ContainsKey("visual-assets.manifest"))
            return "Artifact map is missing visual-assets.manifest.";

        if (screenshotsRequested && !artifacts.ContainsKey("screenshots.metadata"))
            return "Screenshots were requested but screenshots.metadata is absent.";

        foreach (var (key, el) in artifacts)
        {
            if (el.TryGetProperty("finalized", out var fin) && !fin.GetBoolean())
                return $"Artifact '{key}' is not finalized.";
            if (el.TryGetProperty("byteSize", out var bs) && bs.GetInt64() == 0)
                return $"Artifact '{key}' has zero byte size.";
        }

        return null;
    }

    private static IReadOnlyDictionary<string, JsonElement> ParseArtifacts(JsonElement artsEl)
    {
        var dict = new Dictionary<string, JsonElement>(StringComparer.Ordinal);
        foreach (var prop in artsEl.EnumerateObject())
            dict[prop.Name] = prop.Value.Clone();
        return dict;
    }
}
