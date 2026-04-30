using System;
using System.Collections.Generic;
using System.Linq;
using BossMod.Core.Audio;
using Xunit;

namespace BossMod.Core.Tests;

public class ToneTests
{
    private static readonly IReadOnlyDictionary<string, int> ExpectedSamples = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
    {
        ["low"] = 44100 * 180 / 1000,
        ["medium"] = 44100 * 220 / 1000,
        ["high"] = 44100 * 260 / 1000,
        ["critical"] = 44100 * 650 / 1000,
        ["chime"] = 44100 * 420 / 1000,
        ["klaxon"] = 44100 * 700 / 1000,
    };

    [Fact]
    public void BuiltInNames_MatchDocumentedTable()
    {
        Assert.Equal(ExpectedSamples.Keys, Tone.BuiltInNames);
    }

    [Theory]
    [InlineData("low")]
    [InlineData("medium")]
    [InlineData("high")]
    [InlineData("critical")]
    [InlineData("chime")]
    [InlineData("klaxon")]
    public void Generate_BuiltInTone_ReturnsFiniteBoundedSamplesWithClickSafeEdges(string name)
    {
        var samples = Tone.Generate(name);

        Assert.Equal(ExpectedSamples[name], samples.Length);
        Assert.All(samples, sample =>
        {
            Assert.True(float.IsFinite(sample), $"{name} contains a non-finite sample");
            Assert.InRange(sample, -1f, 1f);
        });
        Assert.True(Math.Abs(samples[0]) <= 0.02f, $"{name} starts with a click-prone sample");
        Assert.True(Math.Abs(samples[^1]) <= 0.02f, $"{name} ends with a click-prone sample");
    }

    [Fact]
    public void Generate_UnknownToneName_ThrowsInsteadOfPretendingSilenceIsSuccess()
    {
        Assert.Throws<ArgumentException>(() => Tone.Generate("missing"));
    }
}
