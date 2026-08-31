using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using BuildTool.Abstractions;
using BuildTool.Configuration;
using BuildTool.Game;
using BuildTool.Output;
using Xunit;

namespace BuildTool.Tests;

public sealed class GameSessionTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory().FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    [Fact]
    public async Task RefusesWhenAnotherInstanceAnswersTheEndpoint()
    {
        var runner = new FakeProcessRunner();
        var workCalled = false;
        var session = Session(
            runner,
            (_, _) => Task.FromResult(true));

        var outcome = await session.RunAsync(
            Request(),
            _ =>
            {
                workCalled = true;
                return Task.FromResult("unused");
            },
            CancellationToken.None);

        Assert.False(outcome.Ok);
        Assert.Equal(ExitCodes.CommandFailed, outcome.Failure?.ExitCode);
        Assert.Contains("already answers the runtime endpoint", outcome.Failure?.Message);
        Assert.False(workCalled);
        Assert.Empty(runner.Calls);
    }

    [Fact]
    public async Task StopsTheOwnedProcessAfterSuccessfulWork()
    {
        var runner = BlockingRunner(out var processCancelled);
        var session = Session(runner, (_, _) => Task.FromResult(false));

        var outcome = await session.RunAsync(
            Request(),
            _ => Task.FromResult("complete"),
            CancellationToken.None);

        Assert.True(outcome.Ok, outcome.Failure?.Message);
        Assert.True(processCancelled());
    }

    [Fact]
    public async Task StopsTheOwnedProcessAfterFailedWork()
    {
        var runner = BlockingRunner(out var processCancelled);
        var session = Session(runner, (_, _) => Task.FromResult(false));

        var outcome = await session.RunAsync<string>(
            Request(),
            _ => Task.FromException<string>(new InvalidOperationException("probe failed")),
            CancellationToken.None);

        Assert.False(outcome.Ok);
        Assert.Equal(ExitCodes.Internal, outcome.Failure?.ExitCode);
        Assert.Contains("probe failed", outcome.Failure?.Message);
        Assert.True(processCancelled());
    }

    private GameSession Session(
        FakeProcessRunner runner,
        Func<Uri, CancellationToken, Task<bool>> endpointAnswers)
    {
        var gamePath = Path.Combine(_root, "game");
        Directory.CreateDirectory(gamePath);
        File.WriteAllText(Path.Combine(gamePath, "ancientkingdoms.exe"), "test");

        var config = new LocalConfig(
            GamePath: gamePath,
            DataExportPath: Path.Combine(_root, "export"),
            WinePath: "/wine",
            WinePrefix: "/prefix",
            HotReplEndpoint: "ws://127.0.0.1:18590");
        return new GameSession(config, runner, endpointAnswers: endpointAnswers);
    }

    private static GameSessionRequest Request() => new()
    {
        Purpose = "test session",
        UnityVersionOverride = "6000.3.23f1",
    };

    private static FakeProcessRunner BlockingRunner(out Func<bool> wasCancelled)
    {
        var cancelled = false;
        var runner = new FakeProcessRunner();
        runner.Enqueue(async (_, cancellationToken) =>
        {
            try
            {
                await Task.Delay(Timeout.InfiniteTimeSpan, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                cancelled = true;
                throw;
            }

            return new ProcessResult(0, string.Empty, string.Empty, default);
        });
        wasCancelled = () => cancelled;
        return runner;
    }
}
