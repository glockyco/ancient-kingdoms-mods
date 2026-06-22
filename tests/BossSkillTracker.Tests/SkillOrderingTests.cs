using BossSkillTracker.Model;
using Xunit;

public sealed class SkillOrderingTests
{
    [Fact]
    public void Orders_by_cooldown_descending()
        => Assert.Equal(new[] { 2, 5, 1, 0, 4, 3 }, SkillOrdering.ByCooldownDesc(new[] { 30f, 45f, 90f, 10f, 30f, 50f }));

    [Fact]
    public void Ties_keep_original_order()
        => Assert.Equal(new[] { 0, 1, 2 }, SkillOrdering.ByCooldownDesc(new[] { 20f, 20f, 20f }));
}
