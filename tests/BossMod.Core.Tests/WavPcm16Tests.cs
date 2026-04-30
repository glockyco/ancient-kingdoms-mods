using System;
using BossMod.Core.Audio;
using Xunit;

namespace BossMod.Core.Tests;

public class WavPcm16Tests
{
    [Fact]
    public void EncodeMono_WritesParseablePcm16Wav()
    {
        float[] samples = { -1f, -0.5f, 0f, 0.5f, 1f };

        var bytes = WavPcm16.EncodeMono(samples, sampleRate: 22050);
        var header = WavHeader.Parse(bytes);
        var decoded = WavHeader.ToMonoFloatSamples(bytes, header);

        Assert.Equal(1, header.Channels);
        Assert.Equal(22050, header.SampleRate);
        Assert.Equal(16, header.BitsPerSample);
        Assert.Equal(samples.Length * 2, header.DataLength);
        Assert.Equal(samples.Length, decoded.Length);
        Assert.InRange(decoded[0], -1.0f, -0.999f);
        Assert.InRange(decoded[1], -0.501f, -0.499f);
        Assert.Equal(0f, decoded[2]);
        Assert.InRange(decoded[3], 0.499f, 0.501f);
        Assert.InRange(decoded[4], 0.999f, 1.0f);
    }

    [Fact]
    public void EncodeMono_RejectsInvalidInputInsteadOfWritingLie()
    {
        Assert.Throws<ArgumentNullException>(() => WavPcm16.EncodeMono(null!, sampleRate: 44100));
        Assert.Throws<ArgumentException>(() => WavPcm16.EncodeMono(Array.Empty<float>(), sampleRate: 44100));
        Assert.Throws<ArgumentOutOfRangeException>(() => WavPcm16.EncodeMono(new[] { 0f }, sampleRate: 0));
        Assert.Throws<ArgumentException>(() => WavPcm16.EncodeMono(new[] { float.NaN }, sampleRate: 44100));
        Assert.Throws<ArgumentException>(() => WavPcm16.EncodeMono(new[] { float.PositiveInfinity }, sampleRate: 44100));
    }

    [Fact]
    public void EncodeMono_ClampsOutOfRangeSamples()
    {
        var bytes = WavPcm16.EncodeMono(new[] { -2f, 2f }, sampleRate: 44100);
        var header = WavHeader.Parse(bytes);
        var decoded = WavHeader.ToMonoFloatSamples(bytes, header);

        Assert.InRange(decoded[0], -1.0f, -0.999f);
        Assert.InRange(decoded[1], 0.999f, 1.0f);
    }
}
