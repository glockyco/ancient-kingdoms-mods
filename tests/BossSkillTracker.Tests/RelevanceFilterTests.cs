using BossSkillTracker.Model;
using Xunit;

public sealed class RelevanceFilterTests
{
    [Theory]
    [InlineData(true,  false, false, true,  true,  3, true)]
    [InlineData(false, true,  false, true,  true,  1, true)]
    [InlineData(false, false, true,  true,  true,  2, true)]
    [InlineData(false, false, false, true,  true,  3, false)]
    [InlineData(true,  false, false, false, true,  3, false)]
    [InlineData(true,  false, false, true,  false, 3, false)]
    [InlineData(true,  false, false, true,  true,  0, false)]
    public void ShouldTrack(bool boss, bool elite, bool fabled, bool alive, bool engaged, int skills, bool expected)
        => Assert.Equal(expected, RelevanceFilter.ShouldTrack(boss, elite, fabled, alive, engaged, skills));

    [Theory]
    [InlineData(true,  false, false, true,  3, true)]
    [InlineData(false, true,  false, true,  1, true)]
    [InlineData(false, false, true,  true,  2, true)]
    [InlineData(false, false, false, true,  3, false)]
    [InlineData(true,  false, false, false, 3, false)]
    [InlineData(true,  false, false, true,  0, false)]
    public void ShouldPreviewTarget(bool boss, bool elite, bool fabled, bool alive, int skills, bool expected)
        => Assert.Equal(expected, RelevanceFilter.ShouldPreviewTarget(boss, elite, fabled, alive, skills));
}
