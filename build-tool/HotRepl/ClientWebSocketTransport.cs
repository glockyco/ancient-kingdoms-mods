using System;
using System.IO;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace BuildTool.HotRepl;

/// <summary>
/// Production WebSocket transport using <see cref="ClientWebSocket"/>.
/// One send and one receive are serialized; the receive loop accumulates
/// buffers until EndOfMessage to correctly reassemble multi-frame messages.
/// </summary>
internal sealed class ClientWebSocketTransport : IHotReplTransport
{
    private readonly ClientWebSocket _ws = new();

    public async Task ConnectAsync(Uri uri, CancellationToken ct)
        => await _ws.ConnectAsync(uri, ct);

    public async Task SendAsync(string json, CancellationToken ct)
    {
        var bytes = Encoding.UTF8.GetBytes(json);
        await _ws.SendAsync(
            new ArraySegment<byte>(bytes),
            WebSocketMessageType.Text,
            endOfMessage: true,
            cancellationToken: ct);
    }

    /// <summary>
    /// Loops ReceiveAsync until EndOfMessage is true — a single call does
    /// not guarantee a complete message. Protocol messages with large artifact
    /// maps can span multiple frames.
    /// </summary>
    public async Task<string> ReceiveMessageAsync(CancellationToken ct)
    {
        using var ms = new MemoryStream();
        var buffer = new byte[8192];
        WebSocketReceiveResult result;
        do
        {
            result = await _ws.ReceiveAsync(new ArraySegment<byte>(buffer), ct);
            if (result.MessageType == WebSocketMessageType.Close)
                throw new WebSocketException("Server closed the WebSocket connection.");
            ms.Write(buffer, 0, result.Count);
        }
        while (!result.EndOfMessage);

        return Encoding.UTF8.GetString(ms.ToArray());
    }

    public async ValueTask DisposeAsync()
    {
        if (_ws.State == WebSocketState.Open)
        {
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3));
                await _ws.CloseAsync(WebSocketCloseStatus.NormalClosure, string.Empty, cts.Token);
            }
            catch { /* best-effort close */ }
        }
        _ws.Dispose();
    }
}
