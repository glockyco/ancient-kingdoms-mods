using System.Collections.Generic;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Features.Sharing;
using Xunit;

namespace PocketCompendium.Tests.Sharing;

public sealed class SharingProtocolTests
{
    [Fact]
    public void Greetings_carry_their_version_so_a_client_can_tell_a_newer_host()
    {
        Assert.Equal(MessageKind.Hello, SharingProtocol.Kind(SharingProtocol.Hello(), out int version));
        Assert.Equal(SharingProtocol.Version, version);

        Assert.Equal(MessageKind.Subscribe, SharingProtocol.Kind(SharingProtocol.Subscribe(), out version));
        Assert.Equal(SharingProtocol.Version, version);

        Assert.Equal(MessageKind.Hello, SharingProtocol.Kind("hello\t2\tfield a later version adds", out version));
        Assert.Equal(2, version);
    }

    [Fact]
    public void States_arrive_as_the_host_resolved_them_and_marked_as_shared()
    {
        var states = new List<KeyValuePair<string, TrackedState>>
        {
            new("Xylevis", new TrackedState { State = SpawnState.Respawns, At = 12100.04, ObservedAt = 10000.0, GuardsLeft = -1 }),
            new("Forsaken Skeleton", new TrackedState { State = SpawnState.Chance, At = 5000.0, LastRollFailed = true, GuardsLeft = -1 }),
            new("Seer Kzhal", new TrackedState { State = SpawnState.Due, WaitsForEntry = true, GuardsLeft = -1 }),
            new("The Archon", new TrackedState { State = SpawnState.Guards, GuardsLeft = 3, GuardsTotal = 8 }),
        };

        string message = SharingProtocol.State(states, 0, states.Count);
        Assert.Equal(MessageKind.State, SharingProtocol.Kind(message, out _));

        var read = new Dictionary<string, TrackedState>();
        SharingProtocol.ReadStates(message, read);

        Assert.Equal(4, read.Count);
        Assert.Equal(SpawnState.Respawns, read["Xylevis"].State);
        Assert.Equal(12100.0, read["Xylevis"].At);
        Assert.Equal(10000.0, read["Xylevis"].ObservedAt);
        Assert.Equal(StateSource.Shared, read["Xylevis"].Source);
        Assert.True(read["Forsaken Skeleton"].LastRollFailed);
        Assert.Null(read["Seer Kzhal"].At);
        Assert.True(read["Seer Kzhal"].WaitsForEntry);
        Assert.Equal(3, read["The Archon"].GuardsLeft);
        Assert.Equal(8, read["The Archon"].GuardsTotal);
    }

    [Fact]
    public void A_snapshot_of_every_monster_splits_into_messages_of_a_few_kilobytes()
    {
        var states = new List<KeyValuePair<string, TrackedState>>();
        for (int index = 0; index < 153; index++)
            states.Add(new("Fabled Monster Number " + index, new TrackedState { State = SpawnState.Respawns, At = 123456789.12, ObservedAt = 123450000.5, GuardsLeft = -1 }));

        var read = new Dictionary<string, TrackedState>();
        for (int start = 0; start < states.Count; start += SharingProtocol.EntriesPerMessage)
        {
            string message = SharingProtocol.State(states, start, SharingProtocol.EntriesPerMessage);
            Assert.True(message.Length < 4096, $"message of {message.Length} characters");
            SharingProtocol.ReadStates(message, read);
        }

        Assert.Equal(153, read.Count);
    }

    [Fact]
    public void Broken_entries_and_unknown_messages_are_ignored()
    {
        Assert.Equal(MessageKind.Unknown, SharingProtocol.Kind("chat line", out _));
        Assert.Equal(MessageKind.Unknown, SharingProtocol.Kind("", out _));

        var read = new Dictionary<string, TrackedState>();
        SharingProtocol.ReadStates("state\t1\nXylevis\t99\t\t\t-1\t0\t0\nPyroth\t0\t\t\t-1\t0\t0\nbroken", read);
        Assert.Single(read);
        Assert.Equal(SpawnState.Up, read["Pyroth"].State);
    }
}
