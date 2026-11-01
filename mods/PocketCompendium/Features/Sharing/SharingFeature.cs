using System;
using System.Collections.Generic;
using Il2Cpp;
using Il2CppInterop.Runtime;
using Il2CppMirror;
using Il2CppMirror.RemoteCalls;
using PocketCompendium.Core;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Features.Sharing;

/// <summary>
/// Sends a host's exact states to joining players who run Pocket Compendium. The host greets each
/// joining player, a modded client answers, and the host sends every state on the server clock,
/// then each change. A client sends nothing until a host greets it, so it stays silent on a host
/// without the mod. Two calls registered on the game's chat component carry the messages, which
/// players without the mod drop with one line in their own log.
/// </summary>
public sealed class SharingFeature : Feature
{
    private const string RpcName = "System.Void PlayerChat::PocketCompendiumRpc(System.String)";
    private const string CommandName = "System.Void PlayerChat::PocketCompendiumCmd(System.String)";
    private const float RosterSeconds = 1f;

    // Mirror keeps the registered delegates in Il2Cpp memory, so static fields keep their managed
    // halves alive for the whole session.
    private static RemoteCallDelegate _rpc;
    private static RemoteCallDelegate _command;
    private static ushort _rpcHash;
    private static ushort _commandHash;
    private static bool _registered;
    private static SharingFeature _instance;

    // The host's side.
    private readonly Dictionary<int, Player> _clients = new();
    private readonly HashSet<int> _subscribed = new();
    private readonly Dictionary<string, TrackedState> _sent = new(StringComparer.Ordinal);
    private readonly List<KeyValuePair<string, TrackedState>> _outgoing = new();
    private readonly HashSet<int> _present = new();
    private readonly List<int> _gone = new();
    private int _hostSession = -1;
    private int _sentVersion = -1;
    private float _nextRoster;

    // The client's side. A greeting holds until the client disconnects. States wait here until
    // the tracker has a world to take them.
    private readonly Dictionary<string, TrackedState> _received = new(StringComparer.Ordinal);
    private bool _greeted;
    private bool _subscribePending;
    private int _appliedSession = -1;
    private bool _receivedChanged;
    private bool _reportedVersion;

    public SharingFeature()
        : base("Sharing", "Sharing", "Shares exact boss times between players who run Pocket Compendium, in a world one of them hosts.")
    {
        Settings.Note("A host with the mod sends its exact times to joining players with the mod. Players without it notice nothing, and nothing goes through chat.");
    }

    public override Sprite Icon => Icons.Users;

    public override bool UsesTracker => true;

    protected internal override void Enable()
    {
        _instance = this;
        if (!Register())
            throw new InvalidOperationException(
                $"Its calls collide with calls the game or another mod registered, hashes {_rpcHash} and {_commandHash}.");
    }

    protected internal override void Disable()
    {
        ResetHost();
        ResetClient();
    }

    protected internal override void Update()
    {
        if (NetworkServer.active)
        {
            HostUpdate();
            return;
        }

        // A disconnect ends the greeting, so states from one world never reach the next.
        if (!NetworkClient.isConnected)
        {
            if (_greeted) ResetClient();
            return;
        }

        if (_subscribePending && Player.localPlayer != null)
        {
            _subscribePending = false;
            SendToHost(SharingProtocol.Subscribe());
        }

        var tracker = Tracker.Current;
        if (tracker == null || !tracker.Ready || tracker.Failed) return;
        if (_received.Count > 0 && (_receivedChanged || _appliedSession != tracker.Session))
        {
            tracker.ApplyShared(_received);
            _appliedSession = tracker.Session;
            _receivedChanged = false;
        }
    }

    private static bool Register()
    {
        if (_registered) return true;

        _rpcHash = (ushort)(Il2CppMirror.Extensions.GetStableHashCode(RpcName) & 0xFFFF);
        _commandHash = (ushort)(Il2CppMirror.Extensions.GetStableHashCode(CommandName) & 0xFFFF);
        if (RemoteProcedureCalls.GetDelegate(_rpcHash) != null || RemoteProcedureCalls.GetDelegate(_commandHash) != null) return false;

        _rpc = (Action<NetworkBehaviour, NetworkReader, NetworkConnectionToClient>)OnRpc;
        _command = (Action<NetworkBehaviour, NetworkReader, NetworkConnectionToClient>)OnCommand;
        RemoteProcedureCalls.RegisterRpc(Il2CppType.Of<PlayerChat>(), RpcName, _rpc);
        RemoteProcedureCalls.RegisterCommand(Il2CppType.Of<PlayerChat>(), CommandName, _command, true);
        _registered = true;
        return true;
    }

    // Mirror calls both handlers while it reads network messages. An exception there could break
    // the connection, so each one stops sharing instead.
    private static void OnRpc(NetworkBehaviour behaviour, NetworkReader reader, NetworkConnectionToClient sender)
    {
        var feature = _instance;
        try
        {
            string message = NetworkReaderExtensions.ReadString(reader);
            if (feature != null && feature.Running && !NetworkServer.active) feature.ReceiveOnClient(message);
        }
        catch (Exception exception)
        {
            feature?.Fail(exception);
        }
    }

    private static void OnCommand(NetworkBehaviour behaviour, NetworkReader reader, NetworkConnectionToClient sender)
    {
        var feature = _instance;
        try
        {
            string message = NetworkReaderExtensions.ReadString(reader);
            if (feature != null && feature.Running && NetworkServer.active && sender != null) feature.ReceiveOnHost(message, sender.connectionId);
        }
        catch (Exception exception)
        {
            feature?.Fail(exception);
        }
    }

    private void HostUpdate()
    {
        var tracker = Tracker.Current;
        if (tracker == null || !tracker.Ready || tracker.Failed) return;

        // A new tracker session means new states, so every present player is greeted again.
        if (tracker.Session != _hostSession)
        {
            ResetHost();
            _hostSession = tracker.Session;
        }

        float time = Time.unscaledTime;
        if (time >= _nextRoster)
        {
            _nextRoster = time + RosterSeconds;
            UpdateRoster();
        }

        if (tracker.Version == _sentVersion) return;
        _sentVersion = tracker.Version;

        _outgoing.Clear();
        foreach (var monster in tracker.Monsters)
        {
            if (_sent.TryGetValue(monster.Key, out var last) && SharingProtocol.Same(last, monster.State)) continue;
            _sent[monster.Key] = monster.State;
            _outgoing.Add(new KeyValuePair<string, TrackedState>(monster.Key, monster.State));
        }

        if (_outgoing.Count == 0) return;
        foreach (int id in _subscribed)
            if (_clients.TryGetValue(id, out var player))
                SendStates(player, _outgoing);
    }

    // Greets players who joined and forgets players who left.
    private void UpdateRoster()
    {
        _present.Clear();
        var local = Player.localPlayer;
        foreach (var player in Player.onlinePlayers.Values)
        {
            if (player == null || player == local || player.connectionToClient == null) continue;

            int id = player.connectionToClient.connectionId;
            _present.Add(id);
            if (_clients.ContainsKey(id)) continue;

            _clients[id] = player;
            SendToClient(player, SharingProtocol.Hello());
        }

        _gone.Clear();
        foreach (int id in _clients.Keys)
            if (!_present.Contains(id))
                _gone.Add(id);
        foreach (int id in _gone)
        {
            _clients.Remove(id);
            _subscribed.Remove(id);
        }
    }

    private void ReceiveOnHost(string message, int connection)
    {
        if (SharingProtocol.Kind(message, out int version) != MessageKind.Subscribe || version != SharingProtocol.Version) return;
        if (!_clients.TryGetValue(connection, out var player) || !_subscribed.Add(connection)) return;

        // A new subscriber gets every state now, then the changes every subscriber gets. Before
        // the tracker is ready, the first change list holds every state.
        var tracker = Tracker.Current;
        if (tracker == null || !tracker.Ready || tracker.Failed) return;
        var snapshot = new List<KeyValuePair<string, TrackedState>>(tracker.Monsters.Count);
        foreach (var monster in tracker.Monsters) snapshot.Add(new KeyValuePair<string, TrackedState>(monster.Key, monster.State));
        SendStates(player, snapshot);
    }

    private void ReceiveOnClient(string message)
    {
        var kind = SharingProtocol.Kind(message, out int version);
        if (kind == MessageKind.Unknown) return;
        if (version != SharingProtocol.Version)
        {
            if (!_reportedVersion) Log.Warning($"The host shares with protocol version {version}, and this Pocket Compendium reads version {SharingProtocol.Version}. Times stay this client's own estimates.");
            _reportedVersion = true;
            return;
        }

        switch (kind)
        {
            // The answer waits for the next update, which also covers a greeting that arrives
            // before the local player exists.
            case MessageKind.Hello:
                ResetClient();
                _greeted = true;
                _subscribePending = true;
                break;
            case MessageKind.State when _greeted:
                SharingProtocol.ReadStates(message, _received);
                _receivedChanged = true;
                break;
        }
    }

    private static void SendStates(Player player, IReadOnlyList<KeyValuePair<string, TrackedState>> states)
    {
        for (int start = 0; start < states.Count; start += SharingProtocol.EntriesPerMessage)
            SendToClient(player, SharingProtocol.State(states, start, SharingProtocol.EntriesPerMessage));
    }

    private static void SendToClient(Player player, string message)
    {
        var writer = NetworkWriterPool.Get();
        try
        {
            NetworkWriterExtensions.WriteString(writer, message);
            player.chat.SendTargetRPCInternal(player.connectionToClient, RpcName, _rpcHash, writer, 0);
        }
        finally
        {
            NetworkWriterPool.Return(writer);
        }
    }

    private static void SendToHost(string message)
    {
        var writer = NetworkWriterPool.Get();
        try
        {
            NetworkWriterExtensions.WriteString(writer, message);
            Player.localPlayer.chat.SendCommandInternal(CommandName, _commandHash, writer, 0, true);
        }
        finally
        {
            NetworkWriterPool.Return(writer);
        }
    }

    private void ResetHost()
    {
        _clients.Clear();
        _subscribed.Clear();
        _sent.Clear();
        _sentVersion = -1;
        _nextRoster = 0f;
    }

    private void ResetClient()
    {
        _received.Clear();
        _greeted = false;
        _subscribePending = false;
        _appliedSession = -1;
        _receivedChanged = false;
        Tracker.Current?.ClearShared();
    }
}
