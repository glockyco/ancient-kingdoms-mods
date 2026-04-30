using System;
using BossMod.Core.Persistence;
using Xunit;

namespace BossMod.Core.Tests;

public class StateFlusherTests
{
    [Fact]
    public void MarkDirty_DoesNotWriteBeforeDebounceElapses()
    {
        var now = DateTimeOffset.UnixEpoch;
        int writes = 0;
        var flusher = new StateFlusher(() => writes++, () => now, TimeSpan.FromSeconds(1));

        flusher.MarkDirty();
        now = now.AddMilliseconds(999);
        flusher.Tick();

        Assert.True(flusher.IsDirty);
        Assert.Equal(0, writes);
    }

    [Fact]
    public void MarkDirty_RepeatedCallsDoNotResetDebounceWindow()
    {
        var now = DateTimeOffset.UnixEpoch;
        int writes = 0;
        var flusher = new StateFlusher(() => writes++, () => now, TimeSpan.FromSeconds(1));

        flusher.MarkDirty();
        now = now.AddMilliseconds(500);
        flusher.MarkDirty();
        now = now.AddMilliseconds(500);
        flusher.Tick();

        Assert.False(flusher.IsDirty);
        Assert.Equal(1, writes);
    }

    [Fact]
    public void Tick_WritesAfterDebounceElapses()
    {
        var now = DateTimeOffset.UnixEpoch;
        int writes = 0;
        var flusher = new StateFlusher(() => writes++, () => now, TimeSpan.FromMilliseconds(250));

        flusher.MarkDirty();
        now = now.AddMilliseconds(250);
        flusher.Tick();

        Assert.False(flusher.IsDirty);
        Assert.Equal(1, writes);
    }

    [Fact]
    public void Flush_WritesImmediatelyWhenDirtyAndNoopsWhenClean()
    {
        var now = DateTimeOffset.UnixEpoch;
        int writes = 0;
        var flusher = new StateFlusher(() => writes++, () => now, TimeSpan.FromSeconds(10));

        flusher.Flush();
        Assert.Equal(0, writes);

        flusher.MarkDirty();
        flusher.Flush();
        flusher.Flush();

        Assert.False(flusher.IsDirty);
        Assert.Equal(1, writes);
    }

    [Fact]
    public void Dispose_HardFlushesPendingDirtyState()
    {
        var now = DateTimeOffset.UnixEpoch;
        int writes = 0;
        var flusher = new StateFlusher(() => writes++, () => now, TimeSpan.FromSeconds(10));

        flusher.MarkDirty();
        flusher.Dispose();

        Assert.False(flusher.IsDirty);
        Assert.Equal(1, writes);
    }

    [Fact]
    public void WriterFailure_KeepsDirtyPendingAndReportsError()
    {
        var now = DateTimeOffset.UnixEpoch;
        var expected = new InvalidOperationException("disk full");
        Exception? observed = null;
        bool fail = true;
        int writes = 0;
        var flusher = new StateFlusher(() =>
        {
            writes++;
            if (fail) throw expected;
        }, () => now, TimeSpan.Zero)
        {
            OnFlushError = ex => observed = ex,
        };

        flusher.MarkDirty();
        flusher.Tick();

        Assert.True(flusher.IsDirty);
        Assert.Same(expected, observed);
        Assert.Equal(1, writes);

        fail = false;
        flusher.Flush();

        Assert.False(flusher.IsDirty);
        Assert.Equal(2, writes);
    }

    [Fact]
    public void Tick_DoesNotWriteAgainAfterSuccessfulFlushUntilNextMarkDirty()
    {
        var now = DateTimeOffset.UnixEpoch;
        int writes = 0;
        var flusher = new StateFlusher(() => writes++, () => now, TimeSpan.Zero);

        flusher.MarkDirty();
        flusher.Tick();
        flusher.Tick();
        flusher.MarkDirty();
        flusher.Tick();

        Assert.Equal(2, writes);
    }
}
