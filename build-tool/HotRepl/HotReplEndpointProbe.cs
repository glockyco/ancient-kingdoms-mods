using System;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;

namespace BuildTool.HotRepl;

/// <summary>Checks whether a process already owns the configured HotRepl endpoint.</summary>
internal static class HotReplEndpointProbe
{
    internal static async Task<bool> AnswersAsync(
        Uri endpoint,
        TimeSpan timeout,
        CancellationToken cancellationToken)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(timeout);
        using var socket = new ClientWebSocket();

        try
        {
            await socket.ConnectAsync(endpoint, timeoutCts.Token);
            return socket.State == WebSocketState.Open;
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return false;
        }
        catch (WebSocketException)
        {
            return false;
        }
    }
}
