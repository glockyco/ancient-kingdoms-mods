using BetterBestiary.Data;
using Xunit;

namespace BetterBestiary.Tests;

public class SkillSummaryStoreTests
{
    [Fact]
    public void Get_ReturnsSummaryForKnownId()
    {
        var store = SkillSummaryStore.Parse("{\"seismic_slam\":\"300 dmg, stun 2s\"}");
        Assert.Equal("300 dmg, stun 2s", store.Get("seismic_slam"));
        Assert.Equal(1, store.Count);
    }

    [Fact]
    public void Get_ReturnsNullForMissingId()
    {
        var store = SkillSummaryStore.Parse("{}");
        Assert.Null(store.Get("nope"));
    }

    [Fact]
    public void Get_ReturnsNullForNullId()
    {
        var store = SkillSummaryStore.Parse("{\"a\":\"b\"}");
        Assert.Null(store.Get(null));
    }
}
