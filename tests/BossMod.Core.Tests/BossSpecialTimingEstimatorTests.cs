using BossMod.Core.Tracking;
using Xunit;

namespace BossMod.Core.Tests;

public class BossSpecialTimingEstimatorTests
{
    [Fact]
    public void Estimate_FirstSpecialUsesFiveSecondMinimumAfterEngagement()
    {
        var state = BossSpecialTimingEstimator.Estimate(
            serverTime: 12.0,
            engagementStartServerTime: 10.0,
            lastNonDefaultAbilityServerTime: null,
            anySpecialIndividuallyReady: true,
            nextIndividualReadyInSeconds: null);

        Assert.Equal(SpecialTimingPhase.Locked, state.Phase);
        Assert.Equal("First special: locked, earliest in 3.0s", state.DisplayText);
    }

    [Fact]
    public void Estimate_PostSpecialRampsAcrossFiveToNineSecondWindow()
    {
        var state = BossSpecialTimingEstimator.Estimate(
            serverTime: 17.0,
            engagementStartServerTime: 0.0,
            lastNonDefaultAbilityServerTime: 10.0,
            anySpecialIndividuallyReady: true,
            nextIndividualReadyInSeconds: null);

        Assert.Equal(SpecialTimingPhase.OpeningEstimate, state.Phase);
        Assert.Equal(0.5f, state.WindowOpenEstimate);
        Assert.Equal("Next special: opening 50% (estimate)", state.DisplayText);
    }

    [Fact]
    public void Estimate_UnengagedBossDoesNotStartMisleadingCountdown()
    {
        var state = BossSpecialTimingEstimator.Estimate(
            serverTime: 20.0,
            engagementStartServerTime: null,
            lastNonDefaultAbilityServerTime: null,
            anySpecialIndividuallyReady: true,
            nextIndividualReadyInSeconds: null);

        Assert.Equal(SpecialTimingPhase.Unknown, state.Phase);
        Assert.Equal("Special timing starts on engagement", state.DisplayText);
    }

    [Fact]
    public void Estimate_EngagedWithoutEligibleSpecialDoesNotReportOpenWindow()
    {
        var state = BossSpecialTimingEstimator.Estimate(
            serverTime: 20.0,
            engagementStartServerTime: 10.0,
            lastNonDefaultAbilityServerTime: null,
            anySpecialIndividuallyReady: false,
            nextIndividualReadyInSeconds: null);

        Assert.Equal(SpecialTimingPhase.Unknown, state.Phase);
        Assert.Equal("Next special: waiting for eligible special", state.DisplayText);
    }
}
