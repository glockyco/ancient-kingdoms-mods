using PocketCompendium.Core.Tracking;
using Xunit;

namespace PocketCompendium.Tests.Tracking;

public sealed class StateTextTests
{
    private static readonly SpawnRules Xylevis = new(SpawnOrigin.Placed, 1800, 300, 1f, 0, 0, summoned: false);

    [Theory]
    [InlineData(259.0, "4:19")]
    [InlineData(0.4, "0:01")]
    [InlineData(-3.0, "0:00")]
    [InlineData(3599.0, "59:59")]
    [InlineData(3600.0, "1h 00m")]
    [InlineData(3899.0, "1h 05m")]
    public void Countdowns_round_up_and_switch_to_hours_at_one_hour(double seconds, string text)
    {
        Assert.Equal(text, StateText.Countdown(seconds));
    }

    [Fact]
    public void Estimates_carry_a_tilde_and_windows_count_minutes()
    {
        var estimate = new TrackedState { State = SpawnState.Estimated, At = 3900.0, Estimate = true };
        Assert.Equal("~1h 05m", StateText.Value(estimate, 0.0));

        var window = new TrackedState { State = SpawnState.Window, At = 1680.0 };
        Assert.Equal("28 min", StateText.Value(window, 0.0));
        Assert.Equal("28m", StateText.Caption(window, 0.0));
    }

    [Fact]
    public void The_sweep_shows_the_share_of_the_wait_still_to_run()
    {
        // Killed with 12% of corpse time plus respawn time left.
        var killed = new TrackedState { State = SpawnState.Respawns, At = 100.0 + 0.12 * 2100.0, ObservedAt = 0.0 };
        Assert.Equal(0.12f, StateText.Remaining(killed, Xylevis, 100.0), 3);

        // After a failed roll the wait is one respawn time.
        var rolled = new TrackedState { State = SpawnState.Chance, At = 900.0, ObservedAt = 0.0, LastRollFailed = true };
        Assert.Equal(0.5f, StateText.Remaining(rolled, Xylevis, 0.0), 3);

        Assert.Equal(0f, StateText.Remaining(new TrackedState { State = SpawnState.Due }, Xylevis, 0.0));
    }

    [Theory]
    [InlineData(-11, LevelBand.Gray)]
    [InlineData(-10, LevelBand.Green)]
    [InlineData(-2, LevelBand.Green)]
    [InlineData(-1, LevelBand.White)]
    [InlineData(1, LevelBand.White)]
    [InlineData(2, LevelBand.Yellow)]
    [InlineData(4, LevelBand.Yellow)]
    [InlineData(5, LevelBand.Red)]
    [InlineData(10, LevelBand.Red)]
    [InlineData(11, LevelBand.Skull)]
    public void Level_bands_follow_the_game_at_each_boundary(int difference, LevelBand band)
    {
        Assert.Equal(band, LevelBands.Of(30 + difference, 30));
    }
}
