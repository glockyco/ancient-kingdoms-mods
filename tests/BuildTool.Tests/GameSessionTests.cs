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
    private static int _nextEndpointPort = 20000;
    private readonly string _root = Directory.CreateTempSubdirectory().FullName;
    private readonly int _endpointPort = Interlocked.Increment(ref _nextEndpointPort);

    public void Dispose() => Directory.Delete(_root, recursive: true);

    [Fact]
    public void EndpointAliasesCannotOwnTheSamePortAcrossInstallations()
    {
        var first = Directory.CreateDirectory(Path.Combine(_root, "first")).FullName;
        var second = Directory.CreateDirectory(Path.Combine(_root, "second")).FullName;
        using var owner = SessionOwnership.Acquire(first, new Uri($"ws://127.0.0.1:{_endpointPort}"));

        Assert.Throws<SessionOwnership.SessionLockBusyException>(() =>
        {
            using var conflicting = SessionOwnership.Acquire(second,
                new Uri($"ws://localhost:{_endpointPort}/another-path"));
        });
    }

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
    public async Task RefusesAnotherBuildToolSessionBeforeCallback()
    {
        var firstRunner = new FakeProcessRunner();
        var firstReady = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        var firstCancellation = new CancellationTokenSource();
        var firstSession = Session(firstRunner, (_, _) => Task.FromResult(false));
        var firstRequest = Request() with
        {
            BeforeLaunch = async token =>
            {
                firstReady.SetResult(true);
                await Task.Delay(Timeout.InfiniteTimeSpan, token);
            },
            AfterShutdown = () => Task.CompletedTask,
        };
        var firstTask = firstSession.RunAsync(
            firstRequest,
            _ => Task.FromResult("not reached"),
            firstCancellation.Token);

        await firstReady.Task;
        var secondRunner = new FakeProcessRunner();
        var secondCallbackCalled = false;
        var secondSession = Session(secondRunner, (_, _) => Task.FromResult(false));
        var secondOutcome = await secondSession.RunAsync(
            Request() with
            {
                BeforeLaunch = _ =>
                {
                    secondCallbackCalled = true;
                    return Task.CompletedTask;
                },
            },
            _ => Task.FromResult("not reached"),
            CancellationToken.None);

        Assert.False(secondOutcome.Ok);
        Assert.Equal(ExitCodes.ResourceConflict, secondOutcome.Failure?.ExitCode);
        Assert.False(secondCallbackCalled);
        Assert.Empty(secondRunner.Calls);

        firstCancellation.Cancel();
        var firstOutcome = await firstTask;
        Assert.Equal(ExitCodes.Cancelled, firstOutcome.Failure?.ExitCode);
    }

    [Fact]
    public async Task RefusesStaleEndpointBeforeCallback()
    {
        var runner = new FakeProcessRunner();
        var callbackCalled = false;
        var session = Session(runner, (_, _) => Task.FromResult(true));

        var outcome = await session.RunAsync(
            Request() with
            {
                BeforeLaunch = _ =>
                {
                    callbackCalled = true;
                    return Task.CompletedTask;
                },
            },
            _ => Task.FromResult("not reached"),
            CancellationToken.None);

        Assert.False(outcome.Ok);
        Assert.False(callbackCalled);
        Assert.Empty(runner.Calls);
    }

    [Fact]
    public async Task CallsAfterShutdownWhenBeforeLaunchFails()
    {
        var runner = new FakeProcessRunner();
        var afterShutdownCalled = false;
        var session = Session(runner, (_, _) => Task.FromResult(false));

        var outcome = await session.RunAsync(
            Request() with
            {
                BeforeLaunch = _ => Task.FromException(
                    new InvalidOperationException("backup failed")),
                AfterShutdown = () =>
                {
                    afterShutdownCalled = true;
                    return Task.CompletedTask;
                },
            },
            _ => Task.FromResult("not reached"),
            CancellationToken.None);

        Assert.False(outcome.Ok);
        Assert.Contains("backup failed", outcome.Failure?.Message);
        Assert.True(afterShutdownCalled);
        Assert.Empty(runner.Calls);
    }

    [Fact]
    public async Task CallsAfterShutdownWhenBeforeLaunchIsCancelled()
    {
        var runner = new FakeProcessRunner();
        var callbackStarted = new TaskCompletionSource<bool>(
            TaskCreationOptions.RunContinuationsAsynchronously);
        var afterShutdownCalled = false;
        using var cancellation = new CancellationTokenSource();
        var session = Session(runner, (_, _) => Task.FromResult(false));
        var task = session.RunAsync(
            Request() with
            {
                BeforeLaunch = async token =>
                {
                    callbackStarted.SetResult(true);
                    await Task.Delay(Timeout.InfiniteTimeSpan, token);
                },
                AfterShutdown = () =>
                {
                    afterShutdownCalled = true;
                    return Task.CompletedTask;
                },
            },
            _ => Task.FromResult("not reached"),
            cancellation.Token);

        await callbackStarted.Task;
        cancellation.Cancel();
        var outcome = await task;

        Assert.False(outcome.Ok);
        Assert.Equal(ExitCodes.Cancelled, outcome.Failure?.ExitCode);
        Assert.True(afterShutdownCalled);
        Assert.Empty(runner.Calls);
    }

    [Fact]
    public async Task FailsWhenTheOwnedProcessExitsBeforeWork()
    {
        var runner = new FakeProcessRunner();
        runner.Enqueue(new ProcessResult(17, "", "crashed", TimeSpan.Zero));
        var workCalled = false;
        var session = Session(runner, (_, _) => Task.FromResult(false));

        var outcome = await session.RunAsync(
            Request(),
            _ =>
            {
                workCalled = true;
                return Task.FromResult("not reached");
            },
            CancellationToken.None);

        Assert.False(outcome.Ok);
        Assert.Equal(ExitCodes.CommandFailed, outcome.Failure?.ExitCode);
        Assert.Contains("exited before", outcome.Failure?.Message);
        Assert.False(workCalled);
    }

    [Fact]
    public async Task PreservesWorkFailureWhenEndpointReleaseFails()
    {
        var runner = BlockingRunner(out _);
        var endpointCalls = 0;
        var session = Session(
            runner,
            (_, _) => Task.FromResult(++endpointCalls >= 5));

        var scratch = Path.Combine(_root, "incomplete-scratch");
        File.WriteAllText(scratch, "retained evidence");
        var outcome = await session.RunAsync<string>(
            Request() with
            {
                BeforeLaunch = _ => Task.CompletedTask,
                AfterShutdown = () =>
                {
                    File.Delete(scratch);
                    return Task.CompletedTask;
                },
                AfterSession = () => Task.FromException(new IOException("player-save isolation failed")),
            },
            _ => Task.FromException<string>(new InvalidOperationException("probe failed")),
            CancellationToken.None);

        Assert.False(outcome.Ok);
        Assert.Equal(ExitCodes.Internal, outcome.Failure?.ExitCode);
        Assert.Contains("probe failed", outcome.Failure?.Message);
        Assert.Contains("endpoint", outcome.Failure?.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("player-save isolation failed", outcome.Failure?.Message);
        Assert.Equal("retained evidence", File.ReadAllText(scratch));
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
            HotReplEndpoint: $"ws://127.0.0.1:{_endpointPort}");
        return new GameSession(config, runner, endpointAnswers: endpointAnswers,
            relevantProcessExists: _ => false);
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
