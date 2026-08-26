using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Output;

namespace BuildTool.HotRepl;

/// <summary>A reason a session could not reach a usable state.</summary>
internal sealed record HotReplFailure(int ExitCode, string Message);

/// <summary>
/// The protocol steps every flow needs: connect, confirm the protocol, wait until the
/// host has registered the commands the flow calls, call one, and quit.
/// </summary>
/// <remarks>
/// Flows differ in which commands they call and what they do with the results. They do not
/// differ in how they talk to the host, so that part lives here and each flow composes it.
/// </remarks>
internal sealed class HotReplSession
{
    /// <summary>Protocol this tooling speaks.</summary>
    private const int SupportedProtocolVersion = 2;

    private readonly IHotReplTransport _transport;
    private readonly HotReplRunnerOptions _options;
    private int _nextId = 1;

    internal HotReplSession(IHotReplTransport transport, HotReplRunnerOptions options)
    {
        _transport = transport;
        _options = options;
    }

    /// <summary>Connects and confirms the protocol version, or returns why it could not.</summary>
    public async Task<HotReplFailure?> ConnectAsync(CancellationToken ct)
    {
        using var handshake = await ConnectAndReadHandshakeWhenReadyAsync(ct);
        if (handshake.RootElement.TryGetProperty("protocolVersion", out var version)
            && version.GetInt32() == SupportedProtocolVersion)
            return null;

        var reported = handshake.RootElement.TryGetProperty("protocolVersion", out var raw)
            ? raw.ToString()
            : "?";
        return new HotReplFailure(ExitCodes.Internal,
            $"Unsupported HotRepl protocol version {reported}; "
            + $"expected {SupportedProtocolVersion}.");
    }

    /// <summary>
    /// Waits until the host reports every named command. The host accepts a socket before
    /// the game has registered its commands, so a flow waits for the ones it calls rather
    /// than assuming the catalog is complete.
    /// </summary>
    public async Task<HotReplFailure?> WaitForCommandsAsync(
        IReadOnlyCollection<string> required, CancellationToken ct)
    {
        var deadline = DateTime.UtcNow + _options.ReadinessTimeout;

        while (true)
        {
            try
            {
                using var listed = await SendReceiveAsync(
                    $"{{\"type\":\"commands_list\",\"id\":\"{Id()}\"}}", ct);

                if (listed.RootElement.TryGetProperty("type", out var type)
                    && type.GetString() == "commands_list_result"
                    && listed.RootElement.TryGetProperty("commands", out var commands))
                {
                    var missing = FindMissing(commands, required);
                    if (missing == null)
                        return null;

                    if (DateTime.UtcNow >= deadline)
                        return new HotReplFailure(ExitCodes.ReadinessFailed,
                            $"HotRepl command catalog not ready: {missing}");
                }
                else if (DateTime.UtcNow >= deadline)
                {
                    return new HotReplFailure(ExitCodes.ReadinessFailed,
                        "Timed out waiting for commands_list_result.");
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                if (DateTime.UtcNow >= deadline)
                    return new HotReplFailure(ExitCodes.ReadinessFailed,
                        $"HotRepl command catalog connection failed: {ex.Message}");

                var reconnect = await ConnectAsync(ct);
                if (reconnect != null)
                    return reconnect;
            }

            await Task.Delay(_options.PollInterval, ct);
        }
    }

    /// <summary>Calls one command and returns the host's reply.</summary>
    public Task<JsonDocument> CallAsync(string name, string argsJson, CancellationToken ct)
        => SendReceiveAsync(
            $"{{\"type\":\"command_call\",\"id\":\"{Id()}\",\"name\":\"{name}\",\"args\":{argsJson}}}",
            ct);

    /// <summary>Sends a raw message and returns the reply. Used for job polling.</summary>
    public Task<JsonDocument> SendReceiveAsync(string json, CancellationToken ct)
        => SendAndParseAsync(json, ct);

    /// <summary>Next message id, so a caller can build a raw message.</summary>
    public string Id() => (_nextId++).ToString();

    /// <summary>Asks the game to quit. Best effort: it may already have exited.</summary>
    public async Task TryQuitAsync(CancellationToken ct)
    {
        try
        {
            using var _ = await CallAsync("game.quit", "{}", ct);
        }
        catch
        {
            // The game exits as a result of this call, so a closed socket is expected.
        }
    }

    private async Task<JsonDocument> SendAndParseAsync(string json, CancellationToken ct)
    {
        await _transport.SendAsync(json, ct);
        return JsonDocument.Parse(await _transport.ReceiveMessageAsync(ct));
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

    private static string? FindMissing(JsonElement commands, IReadOnlyCollection<string> required)
    {
        var present = new HashSet<string>(StringComparer.Ordinal);
        foreach (var command in commands.EnumerateArray())
        {
            if (command.TryGetProperty("name", out var name))
                present.Add(name.GetString()!);
        }

        var missing = new List<string>();
        foreach (var one in required)
        {
            if (!present.Contains(one))
                missing.Add(one);
        }

        return missing.Count == 0 ? null : string.Join(", ", missing);
    }
}
