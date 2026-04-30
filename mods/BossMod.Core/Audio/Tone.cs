using System;
using System.Collections.Generic;

namespace BossMod.Core.Audio;

public static class Tone
{
    private const int SampleRate = 44100;
    private const float Amplitude = 0.45f;
    private static readonly string[] Names = { "low", "medium", "high", "critical", "chime", "klaxon" };

    public static IReadOnlyList<string> BuiltInNames => Names;

    public static float[] Generate(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Tone name is required.", nameof(name));

        return name.Trim().ToLowerInvariant() switch
        {
            "low" => GenerateSine(durationMs: 180, frequencyHz: 440),
            "medium" => GenerateSine(durationMs: 220, frequencyHz: 660),
            "high" => GenerateSine(durationMs: 260, frequencyHz: 880),
            "critical" => GenerateCritical(),
            "chime" => GenerateChime(),
            "klaxon" => GenerateKlaxon(),
            _ => throw new ArgumentException($"Unknown built-in tone '{name}'.", nameof(name)),
        };
    }

    private static float[] GenerateSine(int durationMs, double frequencyHz)
    {
        return Generate(durationMs, (i, _) => Math.Sin(2.0 * Math.PI * frequencyHz * i / SampleRate));
    }

    private static float[] GenerateCritical()
    {
        const int durationMs = 650;
        const int onMs = 90;
        const int cycleMs = 170;
        const double frequencyHz = 1100;

        return Generate(durationMs, (i, _) =>
        {
            double ms = i * 1000.0 / SampleRate;
            double cyclePosition = ms % cycleMs;
            if (cyclePosition >= onMs) return 0.0;

            double pulseEnvelope = EdgeEnvelope(cyclePosition / 1000.0, onMs / 1000.0, attackSeconds: 0.005);
            return Math.Sin(2.0 * Math.PI * frequencyHz * i / SampleRate) * pulseEnvelope;
        });
    }

    private static float[] GenerateChime()
    {
        const int durationMs = 420;
        int count = SampleRate * durationMs / 1000;
        var samples = new float[count];
        double phase = 0;

        for (int i = 0; i < count; i++)
        {
            double t = count <= 1 ? 0.0 : (double)i / (count - 1);
            double frequency = 660.0 + (1320.0 - 660.0) * t;
            phase += 2.0 * Math.PI * frequency / SampleRate;
            samples[i] = ShapeSample(Math.Sin(phase), i, count);
        }

        return samples;
    }

    private static float[] GenerateKlaxon()
    {
        const int durationMs = 700;
        const int intervalMs = 120;

        return Generate(durationMs, (i, _) =>
        {
            double ms = i * 1000.0 / SampleRate;
            double frequency = ((int)(ms / intervalMs) & 1) == 0 ? 440.0 : 660.0;
            double sine = Math.Sin(2.0 * Math.PI * frequency * i / SampleRate);
            return sine >= 0 ? 0.85 : -0.85;
        });
    }

    private static float[] Generate(int durationMs, Func<int, int, double> oscillator)
    {
        int count = SampleRate * durationMs / 1000;
        var samples = new float[count];
        for (int i = 0; i < count; i++) samples[i] = ShapeSample(oscillator(i, count), i, count);
        return samples;
    }

    private static float ShapeSample(double raw, int index, int count)
    {
        double seconds = index / (double)SampleRate;
        double totalSeconds = (count - 1) / (double)SampleRate;
        double envelope = EdgeEnvelope(seconds, totalSeconds, attackSeconds: 0.008);
        double value = raw * Amplitude * envelope;
        return (float)Math.Clamp(value, -1.0, 1.0);
    }

    private static double EdgeEnvelope(double seconds, double totalSeconds, double attackSeconds)
    {
        if (totalSeconds <= 0) return 0.0;
        double fadeIn = Math.Clamp(seconds / attackSeconds, 0.0, 1.0);
        double fadeOut = Math.Clamp((totalSeconds - seconds) / attackSeconds, 0.0, 1.0);
        return Math.Min(fadeIn, fadeOut);
    }
}
