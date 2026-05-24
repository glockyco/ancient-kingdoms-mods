using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.HotRepl;

namespace BuildTool.Tests;

/// <summary>
/// Scripted in-memory transport. Enqueue server messages; inspect what the client sent.
/// </summary>
internal sealed class FakeHotReplTransport : IHotReplTransport
{
    private readonly Queue<string> _serverMessages = new();

    public List<string> SentMessages { get; } = new();
    public bool Connected { get; private set; }

    public void EnqueueServerMessage(string json) => _serverMessages.Enqueue(json);

    public Task ConnectAsync(Uri uri, CancellationToken ct)
    {
        Connected = true;
        return Task.CompletedTask;
    }

    public Task SendAsync(string json, CancellationToken ct)
    {
        SentMessages.Add(json);
        return Task.CompletedTask;
    }

    public Task<string> ReceiveMessageAsync(CancellationToken ct)
    {
        if (_serverMessages.Count == 0)
            throw new InvalidOperationException(
                $"No server message queued. Client sent {SentMessages.Count} message(s): " +
                string.Join(", ", SentMessages));
        return Task.FromResult(_serverMessages.Dequeue());
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
