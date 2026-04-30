using System;
using System.IO;
using BossMod.Core.Audio;
using Xunit;

namespace BossMod.Core.Tests;

public class WavHeaderTests
{
    [Fact]
    public void Parse_ValidMonoPcm16_ReturnsHeaderAndSamples()
    {
        var bytes = BuildWav(channels: 1, sampleRate: 44100, samples: new short[] { 0, short.MaxValue, short.MinValue });

        var header = WavHeader.Parse(bytes);
        var samples = WavHeader.ToMonoFloatSamples(bytes, header);

        Assert.Equal(1, header.Channels);
        Assert.Equal(44100, header.SampleRate);
        Assert.Equal(16, header.BitsPerSample);
        Assert.Equal(44, header.DataOffset);
        Assert.Equal(6, header.DataLength);
        Assert.Equal(new[] { 0f, 1f, -1f }, samples, FloatComparer.Instance);
    }

    [Fact]
    public void Parse_ValidStereoPcm16_DownmixesToMonoFloatSamples()
    {
        var bytes = BuildWav(channels: 2, sampleRate: 48000, samples: new short[]
        {
            short.MaxValue, short.MaxValue,
            short.MaxValue, short.MinValue,
        });

        var header = WavHeader.Parse(bytes);
        var samples = WavHeader.ToMonoFloatSamples(bytes, header);

        Assert.Equal(2, header.Channels);
        Assert.Equal(48000, header.SampleRate);
        Assert.Equal(16, header.BitsPerSample);
        Assert.Equal(new[] { 1f, 0f }, samples, FloatComparer.Instance);
    }

    [Fact]
    public void Parse_MissingRiffOrWaveSignature_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(riff: "RAFF")));
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(wave: "WVAE")));
    }

    [Fact]
    public void Parse_MissingFmtChunk_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(includeFmt: false)));
    }

    [Fact]
    public void Parse_MissingDataChunk_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(includeData: false)));
    }

    [Fact]
    public void Parse_FmtChunkShorterThanSixteenBytes_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(fmtChunkSize: 15)));
    }

    [Fact]
    public void Parse_NonPcmFormatCode_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(formatCode: 3)));
    }

    [Fact]
    public void Parse_ChannelCountOtherThanMonoOrStereo_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(channels: 0)));
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(channels: 3)));
    }

    [Fact]
    public void Parse_NonPositiveSampleRate_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(sampleRate: 0)));
    }

    [Fact]
    public void Parse_InvalidBlockAlignOrByteRate_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(blockAlignOverride: 1)));
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(byteRateOverride: 123)));
    }

    [Fact]
    public void Parse_DeclaredDataChunkBeyondFileLength_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(declaredDataLengthOverride: 100, samples: new short[] { 1, 2 })));
    }

    [Fact]
    public void Parse_DataLengthNotDivisibleByFrameSize_Throws()
    {
        Assert.Throws<WavFormatException>(() => WavHeader.Parse(BuildWav(channels: 2, rawData: new byte[] { 1, 2, 3 })));
    }

    [Fact]
    public void Parse_DuplicateFmtChunk_Throws()
    {
        var bytes = AppendChunk(BuildWav(), "fmt ", new byte[16]);

        Assert.Throws<WavFormatException>(() => WavHeader.Parse(bytes));
    }

    [Fact]
    public void Parse_DuplicateDataChunk_Throws()
    {
        var bytes = AppendChunk(BuildWav(), "data", new byte[] { 0, 0 });

        Assert.Throws<WavFormatException>(() => WavHeader.Parse(bytes));
    }


    private static byte[] BuildWav(
        string riff = "RIFF",
        string wave = "WAVE",
        bool includeFmt = true,
        bool includeData = true,
        int fmtChunkSize = 16,
        short formatCode = 1,
        short channels = 1,
        int sampleRate = 44100,
        short bitsPerSample = 16,
        short? blockAlignOverride = null,
        int? byteRateOverride = null,
        int? declaredDataLengthOverride = null,
        short[]? samples = null,
        byte[]? rawData = null)
    {
        samples ??= new short[] { 0 };
        rawData ??= ShortsToBytes(samples);
        short blockAlign = blockAlignOverride ?? (short)(channels * bitsPerSample / 8);
        int byteRate = byteRateOverride ?? sampleRate * blockAlign;

        using var stream = new MemoryStream();
        using var writer = new BinaryWriter(stream);

        writer.Write(System.Text.Encoding.ASCII.GetBytes(riff));
        writer.Write(0); // patched below
        writer.Write(System.Text.Encoding.ASCII.GetBytes(wave));

        if (includeFmt)
        {
            writer.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
            writer.Write(fmtChunkSize);
            writer.Write(formatCode);
            writer.Write(channels);
            writer.Write(sampleRate);
            writer.Write(byteRate);
            writer.Write(blockAlign);
            if (fmtChunkSize >= 16)
            {
                writer.Write(bitsPerSample);
                for (int i = 16; i < fmtChunkSize; i++) writer.Write((byte)0);
            }
            else
            {
                for (int i = 0; i < fmtChunkSize - 14; i++) writer.Write((byte)0);
            }
        }

        if (includeData)
        {
            writer.Write(System.Text.Encoding.ASCII.GetBytes("data"));
            writer.Write(declaredDataLengthOverride ?? rawData.Length);
            writer.Write(rawData);
        }

        writer.Flush();
        var bytes = stream.ToArray();
        BitConverter.GetBytes(bytes.Length - 8).CopyTo(bytes, 4);
        return bytes;
    }

    private static byte[] ShortsToBytes(short[] samples)
    {
        var bytes = new byte[samples.Length * 2];
        Buffer.BlockCopy(samples, 0, bytes, 0, bytes.Length);
        return bytes;
    }


    private static byte[] AppendChunk(byte[] wav, string chunkId, byte[] data)
    {
        using var stream = new MemoryStream();
        stream.Write(wav, 0, wav.Length);
        using var writer = new BinaryWriter(stream);
        writer.Write(System.Text.Encoding.ASCII.GetBytes(chunkId));
        writer.Write(data.Length);
        writer.Write(data);
        writer.Flush();
        return stream.ToArray();
    }

    private sealed class FloatComparer : System.Collections.Generic.IEqualityComparer<float>
    {
        public static readonly FloatComparer Instance = new();
        public bool Equals(float x, float y) => Math.Abs(x - y) <= 0.0001f;
        public int GetHashCode(float obj) => 0;
    }
}
