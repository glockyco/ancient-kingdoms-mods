using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Il2Cpp;
using Il2CppInterop.Runtime;
using Il2CppMirror;
using MelonLoader.Utils;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using UnityEngine;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// Tracks every boss, elite and fabled monster of the current world. A host reads each monster's
/// state, whether or not its zone is active. A client estimates from what it sees and from a
/// dedicated server's kill notices, and remembers that per server. The tracker only reads: it
/// never changes a deadline, roll, window or spawn.
/// </summary>
public sealed class Tracker
{
    private const float RefreshSeconds = 0.5f;
    private const float SaveSeconds = 10f;

    // A client learns the server's clock offset shortly after its player spawns. A server whose
    // offset is zero never sends another, so the clock is trusted after this grace time.
    private const float ClockGraceSeconds = 10f;

    private const string HostWorld = "host";

    private readonly List<TrackedMonster> _monsters = new();
    private readonly Dictionary<string, TrackedMonster> _byKey = new(StringComparer.Ordinal);
    private readonly Dictionary<string, TrackedState> _shared = new(StringComparer.Ordinal);

    private string _world;
    private bool _host;
    private WorldMemory _memory;
    private bool _memoryChanged;
    private float _sessionStart;
    private float _nextRefresh;
    private float _nextSave;
    private bool _patched;

    public Tracker() => Current = this;

    public static Tracker Current { get; private set; }

    /// <summary>Every tracked monster in Bestiary order. Empty outside a world.</summary>
    public IReadOnlyList<TrackedMonster> Monsters => _monsters;

    /// <summary>Whether the tracker has a world and a trusted clock.</summary>
    public bool Ready { get; private set; }

    /// <summary>Whether the states are exact, because this process hosts the world or its host shares.</summary>
    public bool Exact => _host || _shared.Count > 0;

    /// <summary>The server time of the last refresh.</summary>
    public double Now { get; private set; }

    /// <summary>Increments after every refresh, so a surface can skip unchanged frames.</summary>
    public int Version { get; private set; }

    /// <summary>Increments with every new world, so a surface can drop what it kept from the last one.</summary>
    public int Session { get; private set; }

    /// <summary>Set after tracking threw. It stays off until the game restarts, and other features keep running.</summary>
    public bool Failed { get; private set; }

    public TrackedMonster Find(string key) => key != null && _byKey.TryGetValue(key, out var monster) ? monster : null;

    /// <summary>Runs every frame. Tracking stops, and the memory is saved, while no feature wants it.</summary>
    public void Update(bool wanted)
    {
        if (Failed) return;

        try
        {
            Run(wanted);
        }
        catch (Exception exception)
        {
            Failed = true;
            Forget();
            Log.Error("Respawn tracking stopped after an error", exception);
        }
    }

    /// <summary>Saves the client's memory and forgets the world.</summary>
    public void EndSession()
    {
        if (_world == null) return;

        if (_memoryChanged) Save();
        Forget();
    }

    private void Run(bool wanted)
    {
        if (!wanted || !GameAccess.InWorld || GameAccess.LocalPlayer == null || GameManager.singleton == null)
        {
            EndSession();
            return;
        }

        string world = WorldKey();
        if (world != _world)
        {
            EndSession();
            StartSession(world);
        }

        float time = Time.unscaledTime;
        if (time < _nextRefresh) return;
        _nextRefresh = time + RefreshSeconds;
        Refresh(time);

        if (_memoryChanged && time >= _nextSave)
        {
            _nextSave = time + SaveSeconds;
            Save();
        }
    }

    /// <summary>Takes states a host shared. They replace this client's own estimates until the world changes.</summary>
    internal void ApplyShared(Dictionary<string, TrackedState> states)
    {
        if (_world == null || _host) return;
        foreach (var state in states) _shared[state.Key] = state.Value;
        _nextRefresh = 0f;
    }

    internal void ClearShared() => _shared.Clear();

    private void Forget()
    {
        _monsters.Clear();
        _byKey.Clear();
        _memory = null;
        _memoryChanged = false;
        _world = null;
        _shared.Clear();
        Ready = false;
    }

    /// <summary>Notes an altar or placeholder spawn that the game started.</summary>
    internal void OnMonsterStarted(Monster monster)
    {
        if (_world == null) return;
        var tracked = Find(Catalogue.KeyOf(monster));
        if (tracked != null && tracked.Placed == null) tracked.AddSpawn(monster);
    }

    /// <summary>Records a dedicated server's info message if it is a kill notice.</summary>
    internal void OnInfoMessage(string message)
    {
        if (!Ready || _host) return;

        var monster = Find(KillNotice.SlainName(message));
        if (monster != null && monster.Placed != null && _memory.KillNotice(monster.Key, monster.Rules, Now))
            _memoryChanged = true;
    }

    /// <summary>Counts a renewed dungeon's remembered deaths as due, from the game's confirmation to the payer.</summary>
    internal void OnImportantMessage(string message)
    {
        if (!Ready || _host) return;

        var zoneName = RenewalNotice.ZoneName(message);
        if (zoneName == null) return;
        var zone = ZoneNames.Match(zoneName, GameText.Zones());
        if (zone == null) return;

        foreach (var monster in _monsters)
        {
            if (monster.Zone == zone.Value && monster.Rules.Origin == SpawnOrigin.Placed &&
                _memory.Renewal(monster.Key, monster.Rules, Now))
                _memoryChanged = true;
        }
    }

    private void StartSession(string world)
    {
        if (!_patched)
        {
            Patching.Apply(typeof(KillNoticePatch));
            Patching.Apply(typeof(RenewalNoticePatch));
            Patching.Apply(typeof(MonsterStartPatch));
            _patched = true;
        }

        _world = world;
        Session++;
        _host = world == HostWorld;
        _memory = _host ? null : Load(world);
        _memoryChanged = false;
        _sessionStart = Time.unscaledTime;
        _nextRefresh = 0f;
        _nextSave = Time.unscaledTime + SaveSeconds;

        _monsters.AddRange(Catalogue.Build());
        foreach (var monster in _monsters) _byKey[monster.Key] = monster;
        FindRunningSpawns();
    }

    private void Refresh(float time)
    {
        var network = GameAccess.NetworkManagerMmo;
        if (network == null) return;

        if (!_host && network.offsetNetworkTime <= 0.0 && time - _sessionStart < ClockGraceSeconds) return;

        Now = GameAccess.ServerTime(network);
        Ready = true;

        foreach (var monster in _monsters)
        {
            if (monster.Placed == null) monster.PickLive();
            monster.State = _host ? ResolveHost(monster, Now) : ResolveClient(monster, Now);
        }

        Version++;
    }

    private static TrackedState ResolveHost(TrackedMonster monster, double now)
    {
        var reading = new HostReading();
        CountGuards(monster.Guards, out reading.GuardsAlive, out reading.GuardsTotal);

        var placed = monster.Placed;
        if (placed == null)
        {
            ReadLive(monster.Live, out reading.Present, out reading.Alive, out reading.Engaged);
            return SpawnResolver.Host(monster.Rules, reading, now);
        }

        bool dead = placed.state == "DEAD";
        int health = placed.health.current;
        bool hidden = placed.IsHidden();
        reading.Present = true;
        // Start fills the hover text outside batch mode, and applies the saved deadline.
        reading.Started = placed.basicInfo != null;
        reading.Alive = !dead && health > 0 && !hidden;
        reading.Engaged = placed.aggroList.Count > 0;
        reading.Deadline = reading.Started ? placed.respawnTimeEnd : SavedDeadline(monster.Key);
        reading.SummonReady = placed.respawnSummonableReady;

        NoteHostChanges(monster, reading, dead, health, hidden, now);
        reading.LastRollFailed = monster.RollFailed;
        reading.KilledAt = monster.KilledAt;
        return SpawnResolver.Host(monster.Rules, reading, now);
    }

    // A kill sets health to 0 and leaves a corpse. When a player first enters the zone, the game
    // hides a monster whose saved deadline is still ahead, and puts off a chance spawn by one
    // respawn time. Both set health to 0 without a corpse, so neither is a kill. A window despawn
    // keeps the health. A deadline that moves on while the monster stays dead is a failed roll. A
    // renewal moves the deadline back to 0.
    private static void NoteHostChanges(TrackedMonster monster, in HostReading reading, bool dead, int health, bool hidden, double now)
    {
        if (reading.Alive)
        {
            monster.RollFailed = false;
            monster.KilledAt = null;
        }
        else if (dead && health == 0 && monster.WasAlive && !hidden)
        {
            monster.KilledAt = now;
        }
        else if (dead && monster.WasDead && monster.LastDeadline > 0.0 && now >= monster.LastDeadline && reading.Deadline > monster.LastDeadline)
        {
            monster.RollFailed = true;
        }

        if (reading.Deadline < monster.LastDeadline) monster.RollFailed = false;

        // The state turns DEAD a frame after health reaches 0, so a dying monster still counts as
        // alive until a refresh sees it dead.
        monster.WasAlive = reading.Alive || (monster.WasAlive && !dead);
        monster.WasDead = dead;
        monster.LastDeadline = reading.Deadline;
    }

    // A host that shares knows every state exactly, so its states replace the client's own.
    // The client keeps observing, so its memory is current when it plays without sharing again.
    private TrackedState ResolveClient(TrackedMonster monster, double now)
    {
        var reading = new ClientReading();
        var placed = monster.Placed;
        if (placed == null)
        {
            ReadLive(monster.Live, out reading.Spawned, out reading.Alive, out reading.Engaged);
            return _shared.TryGetValue(monster.Key, out var sharedSpawn)
                ? sharedSpawn
                : SpawnResolver.Client(monster.Rules, reading, null, now);
        }

        // Mirror gives a scene object its net id when the server spawns it for this client, and
        // resets the id to 0, leaving the object active, when the monster leaves range or hides.
        // An object that never spawned never woke, so it has no identity to read yet.
        reading.Spawned = placed.gameObject.activeInHierarchy && placed.netId != 0;
        if (reading.Spawned)
        {
            reading.Alive = placed.state != "DEAD" && placed.health.current > 0;
            reading.Engaged = placed.aggroList.Count > 0;
        }

        if (_memory.Observe(monster.Key, monster.Rules, reading, now)) _memoryChanged = true;
        return _shared.TryGetValue(monster.Key, out var shared)
            ? shared
            : SpawnResolver.Client(monster.Rules, reading, _memory.Find(monster.Key), now);
    }

    private static void ReadLive(Monster live, out bool present, out bool alive, out bool engaged)
    {
        present = live != null && live.gameObject.activeInHierarchy;
        alive = present && live.state != "DEAD" && live.health.current > 0;
        engaged = alive && live.aggroList.Count > 0;
    }

    // SummonMonster counts a guard as down only in state DEAD.
    private static void CountGuards(Monster[] guards, out int alive, out int total)
    {
        total = guards.Length;
        alive = 0;
        foreach (var guard in guards)
            if (guard != null && guard.state != "DEAD")
                alive++;
    }

    // Spawns that the game started before this session, such as a living altar boss on a server the
    // player joins, are searched for once. Later ones arrive through MonsterStartPatch, because the
    // search stalls the game for a frame.
    private void FindRunningSpawns()
    {
        foreach (var found in UnityEngine.Object.FindObjectsByType(Il2CppType.Of<Monster>(), FindObjectsInactive.Include, FindObjectsSortMode.None))
        {
            var monster = found.TryCast<Monster>();
            if (monster != null) OnMonsterStarted(monster);
        }
    }

    // SetRespawnBosses applies this saved deadline when the monster's zone first becomes active.
    private static double SavedDeadline(string key) =>
        GameManager.BossesRespawnDictionary.TryGetValue(key, out double deadline) ? deadline : 0.0;

    // A host needs no memory, because the game holds every state. A client keys its memory on the
    // address it joined: an EOS product user id for listed worlds and servers, an IP for LAN.
    private static string WorldKey() =>
        NetworkServer.active ? HostWorld : "server " + NetworkManager.singleton.networkAddress;

    private static string MemoryPath(string world)
    {
        var name = new StringBuilder(world.Length);
        foreach (char c in world) name.Append(char.IsLetterOrDigit(c) || c is '.' or '-' ? c : '_');
        return Path.Combine(MelonEnvironment.UserDataDirectory, "PocketCompendium", "Worlds", name + ".tsv");
    }

    private static WorldMemory Load(string world)
    {
        string path = MemoryPath(world);
        try
        {
            return File.Exists(path) ? WorldMemory.Parse(File.ReadAllText(path)) : new WorldMemory();
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            Log.Warning($"Respawn tracking could not read {path}: {exception.Message}");
            return new WorldMemory();
        }
    }

    private void Save()
    {
        if (_memory == null) return;

        string path = MemoryPath(_world);
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            File.WriteAllText(path, _memory.Serialize());
            _memoryChanged = false;
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            Log.Warning($"Respawn tracking could not save {path}: {exception.Message}");
        }
    }
}
