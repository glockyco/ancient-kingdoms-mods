using System;
using BossMod.Core.Audio;
using Xunit;

namespace BossMod.Core.Tests;

public class SoundRateLimiterTests
{
    [Fact]
    public void CanPlay_FirstPlayForName_IsAllowed()
    {
        var limiter = new SoundRateLimiter(TimeSpan.FromSeconds(1));

        Assert.True(limiter.CanPlay("high", DateTimeOffset.UnixEpoch));
    }

    [Fact]
    public void TryAcquire_RepeatedPlayBeforeWindowElapses_IsDenied()
    {
        var limiter = new SoundRateLimiter(TimeSpan.FromSeconds(1));
        var now = DateTimeOffset.UnixEpoch;

        Assert.True(limiter.TryAcquire("high", now));
        Assert.False(limiter.TryAcquire("high", now.AddMilliseconds(999)));
    }

    [Fact]
    public void TryAcquire_SameNameAfterWindowElapses_IsAllowed()
    {
        var limiter = new SoundRateLimiter(TimeSpan.FromSeconds(1));
        var now = DateTimeOffset.UnixEpoch;

        Assert.True(limiter.TryAcquire("high", now));
        Assert.True(limiter.TryAcquire("high", now.AddSeconds(1)));
    }

    [Fact]
    public void TryAcquire_DifferentNamesAreRateLimitedIndependently()
    {
        var limiter = new SoundRateLimiter(TimeSpan.FromSeconds(1));
        var now = DateTimeOffset.UnixEpoch;

        Assert.True(limiter.TryAcquire("high", now));
        Assert.True(limiter.TryAcquire("critical", now.AddMilliseconds(100)));
    }

    [Fact]
    public void CanPlay_DoesNotPoisonLimiterWhenMissingClipIsCheckedBeforeRecordPlay()
    {
        var limiter = new SoundRateLimiter(TimeSpan.FromSeconds(1));
        var now = DateTimeOffset.UnixEpoch;

        Assert.True(limiter.CanPlay("missing", now));
        Assert.True(limiter.CanPlay("missing", now.AddMilliseconds(100)));
    }

    [Fact]
    public void NamesAreCaseInsensitive()
    {
        var limiter = new SoundRateLimiter(TimeSpan.FromSeconds(1));
        var now = DateTimeOffset.UnixEpoch;

        limiter.RecordPlay("High", now);

        Assert.False(limiter.CanPlay("high", now.AddMilliseconds(100)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void EmptyOrWhitespaceNamesAreRejected(string name)
    {
        var limiter = new SoundRateLimiter(TimeSpan.FromSeconds(1));

        Assert.Throws<ArgumentException>(() => limiter.CanPlay(name, DateTimeOffset.UnixEpoch));
        Assert.Throws<ArgumentException>(() => limiter.RecordPlay(name, DateTimeOffset.UnixEpoch));
        Assert.Throws<ArgumentException>(() => limiter.TryAcquire(name, DateTimeOffset.UnixEpoch));
    }

    [Fact]
    public void Clear_RemovesAllRecordedPlays()
    {
        var limiter = new SoundRateLimiter(TimeSpan.FromSeconds(1));
        var now = DateTimeOffset.UnixEpoch;
        limiter.RecordPlay("high", now);

        limiter.Clear();

        Assert.True(limiter.CanPlay("high", now.AddMilliseconds(100)));
    }
}
