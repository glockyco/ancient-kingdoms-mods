using System;
using System.IO;
using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

/// <summary>
/// Materializing a fixture matrix costs real time, so scratch state is retained. A game
/// update can change a class's abilities and an edited fixture describes a different build,
/// so these tests pin when reuse is refused.
/// </summary>
public sealed class ScratchStateTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory("ak-scratch").FullName;

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private string RepoRoot => Path.Combine(_root, "repo");
    private string ScratchDir => Path.Combine(_root, "scratch");

    private void WriteFixture(string name, string body)
    {
        var dir = ScratchStates.FixturesDirectory(RepoRoot);
        Directory.CreateDirectory(dir);
        File.WriteAllText(Path.Combine(dir, name), body);
    }

    // --- fixture digest ---

    [Fact]
    public void NoFixturesStillHashesToAStableValue()
    {
        var first = ScratchStates.HashFixtures(RepoRoot);
        var second = ScratchStates.HashFixtures(RepoRoot);

        Assert.False(string.IsNullOrWhiteSpace(first));
        Assert.Equal(first, second);
    }

    [Fact]
    public void AddingTheFirstFixtureChangesTheDigest()
    {
        var empty = ScratchStates.HashFixtures(RepoRoot);
        WriteFixture("warrior.json", "{}");

        Assert.NotEqual(empty, ScratchStates.HashFixtures(RepoRoot));
    }

    [Fact]
    public void EditingAFixtureChangesTheDigest()
    {
        WriteFixture("warrior.json", "{\"level\":50}");
        var before = ScratchStates.HashFixtures(RepoRoot);

        WriteFixture("warrior.json", "{\"level\":40}");

        Assert.NotEqual(before, ScratchStates.HashFixtures(RepoRoot));
    }

    [Fact]
    public void RenamingAFixtureChangesTheDigest()
    {
        // A baseline is keyed on the fixture name, so a rename is a change.
        WriteFixture("warrior.json", "{}");
        var before = ScratchStates.HashFixtures(RepoRoot);

        File.Move(
            Path.Combine(ScratchStates.FixturesDirectory(RepoRoot), "warrior.json"),
            Path.Combine(ScratchStates.FixturesDirectory(RepoRoot), "warrior-cap.json"));

        Assert.NotEqual(before, ScratchStates.HashFixtures(RepoRoot));
    }

    [Fact]
    public void TheDigestDoesNotDependOnDirectoryOrder()
    {
        WriteFixture("b.json", "{\"b\":1}");
        WriteFixture("a.json", "{\"a\":1}");
        var first = ScratchStates.HashFixtures(RepoRoot);

        // Rewriting in the other order must not change the digest.
        File.Delete(Path.Combine(ScratchStates.FixturesDirectory(RepoRoot), "a.json"));
        File.Delete(Path.Combine(ScratchStates.FixturesDirectory(RepoRoot), "b.json"));
        WriteFixture("a.json", "{\"a\":1}");
        WriteFixture("b.json", "{\"b\":1}");

        Assert.Equal(first, ScratchStates.HashFixtures(RepoRoot));
    }

    // --- marker ---

    [Fact]
    public void AMarkerRoundTrips()
    {
        var marker = new ScratchMarker("aaa111", "bbb222");
        ScratchStates.WriteMarker(ScratchDir, marker);

        Assert.Equal(marker, ScratchStates.ReadMarker(ScratchDir));
    }

    [Fact]
    public void AnAbsentMarkerReadsAsNothing()
        => Assert.Null(ScratchStates.ReadMarker(ScratchDir));

    [Fact]
    public void AnIncompleteMarkerReadsAsNothing()
    {
        Directory.CreateDirectory(ScratchDir);
        File.WriteAllText(ScratchStates.MarkerPath(ScratchDir), "assembly_sha256 = \"aaa\"\n");

        Assert.Null(ScratchStates.ReadMarker(ScratchDir));
    }

    // --- decisions ---

    [Fact]
    public void WithoutRetainedStateItIsBuilt()
    {
        var plan = ScratchStates.Plan(ScratchDir, new ScratchMarker("aaa", "bbb"));

        Assert.Equal(ScratchDecision.Build, plan.Decision);
        Assert.False(plan.CanReuse);
    }

    [Fact]
    public void MatchingStateIsReused()
    {
        var marker = new ScratchMarker("aaa", "bbb");
        ScratchStates.WriteMarker(ScratchDir, marker);

        var plan = ScratchStates.Plan(ScratchDir, marker);

        Assert.Equal(ScratchDecision.Reuse, plan.Decision);
        Assert.True(plan.CanReuse);
    }

    [Fact]
    public void ADifferentGameBuildForcesARebuild()
    {
        ScratchStates.WriteMarker(ScratchDir, new ScratchMarker("aaa", "bbb"));

        var plan = ScratchStates.Plan(ScratchDir, new ScratchMarker("zzz", "bbb"));

        Assert.Equal(ScratchDecision.RebuildGameChanged, plan.Decision);
        Assert.False(plan.CanReuse);
        Assert.Contains("abilities", plan.Detail);
    }

    [Fact]
    public void ChangedFixturesForceARebuild()
    {
        ScratchStates.WriteMarker(ScratchDir, new ScratchMarker("aaa", "bbb"));

        var plan = ScratchStates.Plan(ScratchDir, new ScratchMarker("aaa", "zzz"));

        Assert.Equal(ScratchDecision.RebuildFixturesChanged, plan.Decision);
        Assert.False(plan.CanReuse);
    }

    [Fact]
    public void AGameChangeIsReportedAheadOfAFixtureChange()
    {
        // Both moved. The game is the more fundamental difference, so it is named.
        ScratchStates.WriteMarker(ScratchDir, new ScratchMarker("aaa", "bbb"));

        var plan = ScratchStates.Plan(ScratchDir, new ScratchMarker("zzz", "zzz"));

        Assert.Equal(ScratchDecision.RebuildGameChanged, plan.Decision);
    }

    [Fact]
    public void MarkerComparisonIgnoresHashLetterCase()
    {
        ScratchStates.WriteMarker(ScratchDir, new ScratchMarker("AAA", "BBB"));

        Assert.Equal(ScratchDecision.Reuse,
            ScratchStates.Plan(ScratchDir, new ScratchMarker("aaa", "bbb")).Decision);
    }
}
