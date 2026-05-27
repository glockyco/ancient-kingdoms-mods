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

    private readonly IHotReplTransport _transport;
    private readonly HotReplRunnerOptions _options;
    private int _nextId = 1;

    internal HotReplExportRunner(IHotReplTransport transport, HotReplRunnerOptions options)
    {
        _transport = transport;
        _options = options;
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
        var handshakeError = await ConnectAndValidateHandshakeAsync(ct);
        if (handshakeError != null)
            return handshakeError;

        // 2. commands_list — retry until catalog contains required commands or timeout
        var readinessDeadline = DateTime.UtcNow + _options.ReadinessTimeout;
        while (true)
        {
            try
            {
                using var listDoc = await SendReceiveAsync(
                    $"{{\"type\":\"commands_list\",\"id\":\"{Id()}\"}}", ct);

                if (listDoc.RootElement.TryGetProperty("type", out var lt)
                    && lt.GetString() == "commands_list_result"
                    && listDoc.RootElement.TryGetProperty("commands", out var cmds))
                {
                    var missing = FindMissingCommands(cmds);
                    if (missing == null) break;   // catalog ready

                    if (DateTime.UtcNow >= readinessDeadline)
                        return new(false, ExitCodes.ReadinessFailed,
                            $"HotRepl command catalog not ready: {missing}");
                }
                else if (DateTime.UtcNow >= readinessDeadline)
                {
                    return new(false, ExitCodes.ReadinessFailed,
                        "Timed out waiting for commands_list_result.");
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                if (DateTime.UtcNow >= readinessDeadline)
                    return new(false, ExitCodes.ReadinessFailed,
                        $"HotRepl command catalog connection failed: {ex.Message}");

                handshakeError = await ConnectAndValidateHandshakeAsync(ct);
                if (handshakeError != null)
                    return handshakeError;
            }

            await Task.Delay(_options.PollInterval, ct);
        }

        // Use a fresh connection for the export after startup/catalog readiness.
        // HotRepl can accept an early socket before Unity finishes registering
        // game commands; that startup connection may be closed by the host before
        // the long-running export job begins.
        handshakeError = await ConnectAndValidateHandshakeAsync(ct);
        if (handshakeError != null)
            return handshakeError;

        // 3. compendium.preflight
        using var preflightDoc = await SendReceiveAsync(
            $"{{\"type\":\"command_call\",\"id\":\"{Id()}\",\"name\":\"compendium.preflight\",\"args\":{{}}}}",
            ct);
        var preflightStatus = preflightDoc.RootElement.TryGetProperty("status", out var ps)
            ? ps.GetString() : null;
        if (preflightStatus != "ok")
            return new(false, ExitCodes.ReadinessFailed, "compendium.preflight did not return ok.");

        // 4. compendium.export → job_accepted
        var exportArgs = _options.Screenshots
            ? "{\"screenshots\":true}"
            : "{\"screenshots\":false}";
        using var acceptedDoc = await SendReceiveAsync(
            $"{{\"type\":\"command_call\",\"id\":\"{Id()}\",\"name\":\"compendium.export\",\"args\":{exportArgs}}}",
            ct);
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

            using var pollDoc = await SendReceiveAsync(
                $"{{\"type\":\"job_status\",\"id\":\"{Id()}\",\"jobId\":\"{jobId}\"}}",
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
                await TryQuitAsync(ct);
                return new(false, ExitCodes.CommandFailed, verifyError, artifacts);
            }
        }

        // 7. game.quit (always attempt after terminal result)
        await TryQuitAsync(ct);

        return jobOk
            ? new(true, ExitCodes.Success, jobMessage, artifacts)
            : new(false, ExitCodes.CommandFailed, jobMessage, artifacts);
    }

    // ---- helpers ----

    private async Task<ExportRunnerResult?> ConnectAndValidateHandshakeAsync(CancellationToken ct)
    {
        using var hsDoc = await ConnectAndReadHandshakeWhenReadyAsync(ct);
        if (hsDoc.RootElement.TryGetProperty("protocolVersion", out var pvEl)
            && pvEl.GetInt32() == 2)
            return null;

        var pv = hsDoc.RootElement.TryGetProperty("protocolVersion", out var x)
            ? x.ToString() : "?";
        return new(false, ExitCodes.Internal,
            $"Unsupported HotRepl protocol version {pv}; expected 2.");
    }

    private async Task<JsonDocument> ConnectAndReadHandshakeWhenReadyAsync(CancellationToken ct)
    {
        var deadline = DateTime.UtcNow + _options.ReadinessTimeout;
        Exception? lastError = null;

        while (DateTime.UtcNow < deadline)
        {
            try
            {
                await _transport.ConnectAsync(_options.Endpoint, ct);
                return JsonDocument.Parse(await _transport.ReceiveMessageAsync(ct));
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                lastError = ex;
                await Task.Delay(_options.PollInterval, ct);
            }
        }

        throw new TimeoutException(
            $"Timed out connecting to HotRepl at {_options.Endpoint}: {lastError?.Message}");
    }

    private string Id() => (_nextId++).ToString();

    private async Task<JsonDocument> SendReceiveAsync(string json, CancellationToken ct)
    {
        await _transport.SendAsync(json, ct);
        return JsonDocument.Parse(await _transport.ReceiveMessageAsync(ct));
    }

    private async Task TryQuitAsync(CancellationToken ct)
    {
        try
        {
            using var doc = await SendReceiveAsync(
                $"{{\"type\":\"command_call\",\"id\":\"{Id()}\",\"name\":\"game.quit\",\"args\":{{}}}}",
                ct);
        }
        catch { /* game may have already exited */ }
    }

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

    private static string? FindMissingCommands(JsonElement commands)
    {
        var present = new HashSet<string>(StringComparer.Ordinal);
        foreach (var cmd in commands.EnumerateArray())
        {
            if (cmd.TryGetProperty("name", out var n))
                present.Add(n.GetString()!);
        }
        var missing = new List<string>();
        foreach (var req in RequiredCommands)
            if (!present.Contains(req)) missing.Add(req);
        return missing.Count == 0 ? null : string.Join(", ", missing);
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
