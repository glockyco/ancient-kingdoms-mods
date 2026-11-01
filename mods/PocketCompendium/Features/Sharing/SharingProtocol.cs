#nullable disable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using PocketCompendium.Core.Tracking;

namespace PocketCompendium.Features.Sharing;

/// <summary>A message between a host and a client, as the sharing calls carry it.</summary>
public enum MessageKind
{
    Unknown,

    /// <summary>The host's greeting to a joining player, which tells a modded client it may subscribe.</summary>
    Hello,

    /// <summary>A modded client's answer to the hello.</summary>
    Subscribe,

    /// <summary>Tracked states on the server clock: all of them after a subscribe, then the ones that change.</summary>
    State,
}

/// <summary>
/// The sharing calls' text format, version 1. Fields are separated by tabs and entries by line
/// breaks, which no monster name contains. No game references, so the test project compiles this
/// file directly.
/// </summary>
public static class SharingProtocol
{
    public const int Version = 1;

    /// <summary>Entries per state message, which keeps a message near 3 KB.</summary>
    public const int EntriesPerMessage = 64;

    private const char Field = '\t';
    private const char Entry = '\n';

    private const int EstimateFlag = 1;
    private const int RollFailedFlag = 2;
    private const int WaitsForEntryFlag = 4;

    public static string Hello() => "hello" + Field + Version;

    public static string Subscribe() => "subscribe" + Field + Version;

    /// <summary>Encodes <paramref name="count"/> states starting at <paramref name="start"/>.</summary>
    public static string State(IReadOnlyList<KeyValuePair<string, TrackedState>> states, int start, int count)
    {
        var text = new StringBuilder("state").Append(Field).Append(Version);
        for (int index = start; index < start + count && index < states.Count; index++)
        {
            var state = states[index].Value;
            int flags = (state.Estimate ? EstimateFlag : 0) | (state.LastRollFailed ? RollFailedFlag : 0) | (state.WaitsForEntry ? WaitsForEntryFlag : 0);
            text.Append(Entry).Append(states[index].Key)
                .Append(Field).Append((int)state.State)
                .Append(Field).Append(Time(state.At))
                .Append(Field).Append(Time(state.ObservedAt))
                .Append(Field).Append(state.GuardsLeft)
                .Append(Field).Append(state.GuardsTotal)
                .Append(Field).Append(flags);
        }

        return text.ToString();
    }

    /// <summary>Reads a message's kind and version. A message of another version reads as its kind with that version.</summary>
    public static MessageKind Kind(string message, out int version)
    {
        version = 0;
        if (string.IsNullOrEmpty(message)) return MessageKind.Unknown;

        int lineEnd = message.IndexOf(Entry);
        var head = (lineEnd < 0 ? message : message.Substring(0, lineEnd)).Split(Field);
        if (head.Length < 2 || !int.TryParse(head[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out version)) return MessageKind.Unknown;

        switch (head[0])
        {
            case "hello":
                return MessageKind.Hello;
            case "subscribe":
                return MessageKind.Subscribe;
            case "state":
                return MessageKind.State;
            default:
                return MessageKind.Unknown;
        }
    }

    /// <summary>Reads a state message's entries into <paramref name="states"/>. Entries it cannot read are skipped.</summary>
    public static void ReadStates(string message, Dictionary<string, TrackedState> states)
    {
        var lines = message.Split(Entry);
        for (int index = 1; index < lines.Length; index++)
        {
            var fields = lines[index].Split(Field);
            if (fields.Length != 7 || fields[0].Length == 0) continue;
            if (!int.TryParse(fields[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out int kind) || !Enum.IsDefined(typeof(SpawnState), kind)) continue;
            if (!int.TryParse(fields[4], NumberStyles.Integer, CultureInfo.InvariantCulture, out int guardsLeft)) continue;
            if (!int.TryParse(fields[5], NumberStyles.Integer, CultureInfo.InvariantCulture, out int guardsTotal)) continue;
            if (!int.TryParse(fields[6], NumberStyles.Integer, CultureInfo.InvariantCulture, out int flags)) continue;

            states[fields[0]] = new TrackedState
            {
                State = (SpawnState)kind,
                At = Time(fields[2]),
                ObservedAt = Time(fields[3]),
                GuardsLeft = guardsLeft,
                GuardsTotal = guardsTotal,
                Estimate = (flags & EstimateFlag) != 0,
                LastRollFailed = (flags & RollFailedFlag) != 0,
                WaitsForEntry = (flags & WaitsForEntryFlag) != 0,
                Source = StateSource.Shared,
            };
        }
    }

    /// <summary>Whether a client would show <paramref name="a"/> and <paramref name="b"/> alike.</summary>
    public static bool Same(in TrackedState a, in TrackedState b) =>
        a.State == b.State && a.Estimate == b.Estimate && a.LastRollFailed == b.LastRollFailed && a.WaitsForEntry == b.WaitsForEntry
        && a.GuardsLeft == b.GuardsLeft && a.GuardsTotal == b.GuardsTotal && Time(a.At) == Time(b.At) && Time(a.ObservedAt) == Time(b.ObservedAt);

    // A tenth of a second is finer than any surface shows.
    private static string Time(double? value) => value?.ToString("F1", CultureInfo.InvariantCulture) ?? "";

    private static double? Time(string field) =>
        double.TryParse(field, NumberStyles.Float, CultureInfo.InvariantCulture, out double value) ? value : null;
}
