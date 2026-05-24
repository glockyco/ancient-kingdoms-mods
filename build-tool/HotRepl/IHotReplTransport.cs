using System;
using System.Threading;
using System.Threading.Tasks;

namespace BuildTool.HotRepl;

/// <summary>
/// Minimal transport abstraction for the HotRepl WebSocket protocol.
/// Exactly one send and one receive may be in-flight at a time — matches
/// the ClientWebSocket concurrency constraint documented at
/// https://learn.microsoft.com/en-us/dotnet/api/system.net.websockets.clientwebsocket
/// </summary>
internal interface IHotReplTransport : IAsyncDisposable
{
    Task ConnectAsync(Uri uri, CancellationToken ct);
    Task SendAsync(string json, CancellationToken ct);
    /// <summary>
    /// Reads the next complete text message, reassembling multi-frame payloads.
    /// Always pass a CancellationToken; without it ReceiveAsync blocks indefinitely
    /// on a dead connection.
    /// </summary>
    Task<string> ReceiveMessageAsync(CancellationToken ct);
}
