using System;
using System.Buffers.Binary;

namespace BossMod.Core.Audio;

public sealed class WavFormatException : Exception
{
    public WavFormatException(string message) : base(message) { }
}

public readonly record struct WavHeader(int Channels, int SampleRate, int BitsPerSample, int DataOffset, int DataLength)
{
    public static WavHeader Parse(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 12) throw new WavFormatException("WAV data is too short.");
        if (!FourCcEquals(bytes[0..4], "RIFF")) throw new WavFormatException("WAV data is missing RIFF signature.");
        if (!FourCcEquals(bytes[8..12], "WAVE")) throw new WavFormatException("WAV data is missing WAVE signature.");

        int? channels = null;
        int? sampleRate = null;
        int? bitsPerSample = null;
        int? dataOffset = null;
        int? dataLength = null;

        int offset = 12;
        while (offset + 8 <= bytes.Length)
        {
            var chunkId = bytes.Slice(offset, 4);
            uint rawChunkSize = BinaryPrimitives.ReadUInt32LittleEndian(bytes.Slice(offset + 4, 4));
            if (rawChunkSize > int.MaxValue) throw new WavFormatException("WAV chunk is too large.");

            int chunkSize = (int)rawChunkSize;
            long chunkDataStart = offset + 8L;
            long chunkDataEnd = chunkDataStart + chunkSize;
            if (chunkDataEnd > bytes.Length) throw new WavFormatException("WAV chunk extends beyond file length.");

            if (FourCcEquals(chunkId, "fmt "))
            {
                if (chunkSize < 16) throw new WavFormatException("WAV fmt chunk is shorter than 16 bytes.");
                var fmt = bytes.Slice((int)chunkDataStart, chunkSize);
                ushort formatCode = BinaryPrimitives.ReadUInt16LittleEndian(fmt.Slice(0, 2));
                ushort parsedChannels = BinaryPrimitives.ReadUInt16LittleEndian(fmt.Slice(2, 2));
                int parsedSampleRate = BinaryPrimitives.ReadInt32LittleEndian(fmt.Slice(4, 4));
                int parsedByteRate = BinaryPrimitives.ReadInt32LittleEndian(fmt.Slice(8, 4));
                ushort parsedBlockAlign = BinaryPrimitives.ReadUInt16LittleEndian(fmt.Slice(12, 2));
                ushort parsedBitsPerSample = BinaryPrimitives.ReadUInt16LittleEndian(fmt.Slice(14, 2));

                if (formatCode != 1) throw new WavFormatException("Only PCM WAV files are supported.");
                if (parsedChannels is not (1 or 2)) throw new WavFormatException("Only mono or stereo WAV files are supported.");
                if (parsedSampleRate <= 0) throw new WavFormatException("WAV sample rate must be positive.");
                if (parsedBitsPerSample != 16) throw new WavFormatException("Only 16-bit PCM WAV files are supported.");

                int expectedBlockAlign = parsedChannels * (parsedBitsPerSample / 8);
                int expectedByteRate = parsedSampleRate * expectedBlockAlign;
                if (parsedBlockAlign != expectedBlockAlign) throw new WavFormatException("WAV blockAlign does not match channel format.");
                if (parsedByteRate != expectedByteRate) throw new WavFormatException("WAV byteRate does not match sample rate and blockAlign.");

                channels = parsedChannels;
                sampleRate = parsedSampleRate;
                bitsPerSample = parsedBitsPerSample;
            }
            else if (FourCcEquals(chunkId, "data"))
            {
                dataOffset = (int)chunkDataStart;
                dataLength = chunkSize;
            }

            long nextOffset = chunkDataEnd + (chunkSize & 1);
            if (nextOffset > int.MaxValue) throw new WavFormatException("WAV chunk offset is too large.");
            offset = (int)nextOffset;
        }

        if (channels == null || sampleRate == null || bitsPerSample == null) throw new WavFormatException("WAV data is missing fmt chunk.");
        if (dataOffset == null || dataLength == null) throw new WavFormatException("WAV data is missing data chunk.");

        int frameSize = channels.Value * (bitsPerSample.Value / 8);
        if (dataLength.Value % frameSize != 0) throw new WavFormatException("WAV data length is not divisible by frame size.");

        return new WavHeader(channels.Value, sampleRate.Value, bitsPerSample.Value, dataOffset.Value, dataLength.Value);
    }

    public static float[] ToMonoFloatSamples(ReadOnlySpan<byte> bytes, WavHeader header)
    {
        if (header.Channels is not (1 or 2)) throw new WavFormatException("Only mono or stereo WAV files are supported.");
        if (header.BitsPerSample != 16) throw new WavFormatException("Only 16-bit PCM WAV files are supported.");
        if (header.DataOffset < 0 || header.DataLength < 0) throw new WavFormatException("WAV data bounds are invalid.");
        if ((long)header.DataOffset + header.DataLength > bytes.Length) throw new WavFormatException("WAV data extends beyond file length.");

        int frameSize = header.Channels * 2;
        if (header.DataLength % frameSize != 0) throw new WavFormatException("WAV data length is not divisible by frame size.");

        int sampleCount = header.DataLength / frameSize;
        var samples = new float[sampleCount];
        var data = bytes.Slice(header.DataOffset, header.DataLength);

        for (int i = 0; i < sampleCount; i++)
        {
            int frameOffset = i * frameSize;
            float left = Pcm16ToFloat(BinaryPrimitives.ReadInt16LittleEndian(data.Slice(frameOffset, 2)));
            if (header.Channels == 1)
            {
                samples[i] = left;
            }
            else
            {
                float right = Pcm16ToFloat(BinaryPrimitives.ReadInt16LittleEndian(data.Slice(frameOffset + 2, 2)));
                samples[i] = Math.Clamp((left + right) * 0.5f, -1f, 1f);
            }
        }

        return samples;
    }

    private static float Pcm16ToFloat(short sample)
    {
        float value = sample < 0 ? sample / 32768f : sample / 32767f;
        return Math.Clamp(value, -1f, 1f);
    }

    private static bool FourCcEquals(ReadOnlySpan<byte> bytes, string value) =>
        bytes.Length == 4 &&
        bytes[0] == value[0] &&
        bytes[1] == value[1] &&
        bytes[2] == value[2] &&
        bytes[3] == value[3];
}
