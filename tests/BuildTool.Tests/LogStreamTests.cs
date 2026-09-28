using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public class LogStreamTests
{
    [Fact]
    public async Task ReadsIncrementalAppendsAndStopsOnCancellation()
    {
        var temp = Path.GetTempFileName();
        await File.WriteAllTextAsync(temp, "line one\n", TestContext.Current.CancellationToken);

        using var cts = new CancellationTokenSource();
        var stream = new LogStream(temp, TimeSpan.FromMilliseconds(20));

        var received = new List<string>();
        var task = Task.Run(async () =>
        {
            await foreach (var chunk in stream.ReadAsync(cts.Token))
                received.Add(chunk);
        }, TestContext.Current.CancellationToken);

        await Task.Delay(50, TestContext.Current.CancellationToken);
        await File.AppendAllTextAsync(temp, "line two\n", TestContext.Current.CancellationToken);
        await Task.Delay(100, TestContext.Current.CancellationToken);
        cts.Cancel();
        try { await task; } catch (OperationCanceledException) { }

        var joined = string.Concat(received);
        Assert.Contains("line one", joined);
        Assert.Contains("line two", joined);
    }

    [Fact]
    public async Task TolerantOfMissingFileAtStart()
    {
        var temp = Path.Combine(Path.GetTempPath(), Path.GetRandomFileName());

        using var cts = new CancellationTokenSource();
        var stream = new LogStream(temp, TimeSpan.FromMilliseconds(20));

        var task = Task.Run(async () =>
        {
            await foreach (var _ in stream.ReadAsync(cts.Token)) { }
        }, TestContext.Current.CancellationToken);

        await Task.Delay(50, TestContext.Current.CancellationToken);
        await File.WriteAllTextAsync(temp, "appeared late\n", TestContext.Current.CancellationToken);
        await Task.Delay(100, TestContext.Current.CancellationToken);
        cts.Cancel();
        try { await task; } catch (OperationCanceledException) { }
    }
}
