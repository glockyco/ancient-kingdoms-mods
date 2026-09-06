using System;
using System.Net.Sockets;
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
        using var socket = new TcpClient();

        try
        {
            // A WebSocket handshake replaces HotRepl's active client. Occupancy checks
            // must not send an application handshake to a session they do not own.
            await socket.ConnectAsync(endpoint.Host, endpoint.Port, timeoutCts.Token);
            return true;
        }
        catch (SocketException exception) when (exception.SocketErrorCode == SocketError.ConnectionRefused)
        {
            return false;
        }
    }
}
