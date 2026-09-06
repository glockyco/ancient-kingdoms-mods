using System;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public sealed class HotReplEndpointProbeTests
{
    [Fact]
    public async Task DetectsAListenerWithoutSendingAnApplicationHandshake()
    {
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var endpoint = new Uri($"ws://127.0.0.1:{((IPEndPoint)listener.LocalEndpoint).Port}");

        var probe = HotReplEndpointProbe.AnswersAsync(endpoint, TimeSpan.FromSeconds(2), deadline.Token);
        using var accepted = await listener.AcceptTcpClientAsync(deadline.Token);
        var received = await accepted.GetStream().ReadAsync(new byte[1], deadline.Token);
        accepted.Close();

        Assert.True(await probe);
        Assert.Equal(0, received);
    }
}
