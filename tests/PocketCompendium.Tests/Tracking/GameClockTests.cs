using PocketCompendium.Core.Tracking;
using Xunit;

namespace PocketCompendium.Tests.Tracking;

public sealed class GameClockTests
{
    // A server hour that starts a game day. Game hour h covers seconds h*150 to (h+1)*150 of it.
    private const double Day = 36000.0;

    [Theory]
    [InlineData(0.0, 0)]
    [InlineData(2999.0, 19)]
    [InlineData(3000.0, 20)]
    [InlineData(3599.0, 23)]
    public void Hour_follows_the_server_clock_at_150_seconds_a_game_hour(double secondsIntoDay, int hour)
    {
        Assert.Equal(hour, GameClock.Hour(Day + secondsIntoDay));
    }

    [Theory]
    [InlineData(19, false)]
    [InlineData(20, true)]
    [InlineData(23, true)]
    [InlineData(0, true)]
    [InlineData(7, true)]
    [InlineData(8, false)]
    public void A_night_window_wraps_past_midnight(int hour, bool open)
    {
        Assert.Equal(open, GameClock.InWindow(Day + hour * GameClock.HourSeconds, 20, 8));
    }

    [Fact]
    public void First_open_is_now_inside_the_window_and_the_next_opening_outside_it()
    {
        Assert.Equal(Day + 3100.0, GameClock.FirstOpen(Day + 3100.0, 20, 8));
        Assert.Equal(Day + 3000.0, GameClock.FirstOpen(Day + 2900.0, 20, 8));
        // Day window 8 to 22 at hour 23 opens at hour 8 of the next game day.
        Assert.Equal(Day + 3600.0 + 1200.0, GameClock.FirstOpen(Day + 3450.0, 8, 22));
    }

    [Fact]
    public void A_window_that_opens_and_closes_at_the_same_hour_never_opens()
    {
        Assert.Null(GameClock.FirstOpen(Day, 5, 5));
    }
}
