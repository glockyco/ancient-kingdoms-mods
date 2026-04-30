using System;
using System.Buffers.Binary;

namespace BossMod.Core.Audio;

public static class WavPcm16
{
    public static byte[] EncodeMono(float[] samples, int sampleRate)
    {
        if (samples == null) throw new ArgumentNullException(nameof(samples));
        if (samples.Length == 0) throw new ArgumentException("At least one sample is required.", nameof(samples));
        if (sampleRate <= 0) throw new ArgumentOutOfRangeException(nameof(sampleRate), "Sample rate must be positive.");

        const short channels = 1;
        const short bitsPerSample = 16;
        const short bytesPerSample = bitsPerSample / 8;
        int dataLength = checked(samples.Length * bytesPerSample);
        int riffChunkSize = checked(36 + dataLength);
        var bytes = new byte[44 + dataLength];

        WriteAscii(bytes.AsSpan(0, 4), "RIFF");
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(4, 4), riffChunkSize);
        WriteAscii(bytes.AsSpan(8, 4), "WAVE");
        WriteAscii(bytes.AsSpan(12, 4), "fmt ");
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(16, 4), 16);
        BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(20, 2), 1); // PCM
        BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(22, 2), channels);
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(24, 4), sampleRate);
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(28, 4), sampleRate * channels * bytesPerSample);
        BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(32, 2), channels * bytesPerSample);
        BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(34, 2), bitsPerSample);
        WriteAscii(bytes.AsSpan(36, 4), "data");
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(40, 4), dataLength);

        for (int i = 0; i < samples.Length; i++)
        {
            float sample = samples[i];
            if (!float.IsFinite(sample)) throw new ArgumentException("Samples must be finite.", nameof(samples));

            sample = Math.Clamp(sample, -1f, 1f);
            short pcm = sample < 0f
                ? (short)Math.Round(sample * 32768f)
                : (short)Math.Round(sample * 32767f);
            BinaryPrimitives.WriteInt16LittleEndian(bytes.AsSpan(44 + (i * 2), 2), pcm);
        }

        return bytes;
    }

    private static void WriteAscii(Span<byte> target, string value)
    {
        for (int i = 0; i < value.Length; i++) target[i] = (byte)value[i];
    }
}
