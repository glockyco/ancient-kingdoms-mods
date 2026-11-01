#nullable disable
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace PocketCompendium.Core.Tracking;

/// <summary>What a client remembers of one tracked monster on one server, in server time.</summary>
public sealed class MonsterMemory
{
    public double? DeathAt;
    public StateSource DeathSource;
    public double? SeenUpAt;

    /// <summary>Whether the last news is a death, not a later sighting.</summary>
    public bool KnowsDeath => DeathAt != null && (SeenUpAt == null || DeathAt.Value >= SeenUpAt.Value);
}

/// <summary>
/// A client's memory of one server: deaths it saw, kill notices and sightings. No game references,
/// so the test project compiles this file directly.
/// </summary>
public sealed class WorldMemory
{
    private const string Header = "# Pocket Compendium world memory 1";

    // A corpse seen within this time of a sighting is a death the player saw happen.
    private const double SawItDieSeconds = 3.0;

    private readonly Dictionary<string, MonsterMemory> _monsters = new(StringComparer.Ordinal);

    public int Count => _monsters.Count;

    public MonsterMemory Find(string key) => _monsters.TryGetValue(key, out var memory) ? memory : null;

    /// <summary>Records what the client sees of a monster now. Returns whether the memory changed.</summary>
    public bool Observe(string key, SpawnRules rules, in ClientReading reading, double now)
    {
        if (!reading.Spawned) return false;

        if (reading.Alive)
        {
            if (!SpawnResolver.CountsAsUp(rules, reading.Engaged, now)) return false;
            Get(key).SeenUpAt = now;
            return true;
        }

        var memory = Get(key);

        // A corpse. Keep a known death until its respawn time has passed, because a corpse after
        // that belongs to a later death.
        if (memory.KnowsDeath && memory.DeathAt.Value + rules.KillToRespawnSeconds > now) return false;

        bool sawItDie = memory.SeenUpAt != null && now - memory.SeenUpAt.Value <= SawItDieSeconds;
        // A corpse that lasts its full corpse time died up to that long ago. The earliest death
        // gives the earliest possible respawn.
        memory.DeathAt = sawItDie ? now : now - rules.CorpseSeconds;
        memory.DeathSource = sawItDie ? StateSource.SeenDeath : StateSource.SeenCorpse;
        return true;
    }

    /// <summary>Records a dedicated server's kill notice. Returns whether the memory changed.</summary>
    public bool KillNotice(string key, SpawnRules rules, double now)
    {
        var memory = Get(key);
        if (memory.KnowsDeath && now - memory.DeathAt.Value <= rules.CorpseSeconds) return false;

        memory.DeathAt = now;
        memory.DeathSource = StateSource.KillNotice;
        return true;
    }

    /// <summary>
    /// Records that the player renewed the monster's dungeon, which ends every respawn timer there
    /// (<c>Player.UserCode_CmdResetDungeon</c>), so a remembered death counts as due from now.
    /// Returns whether the memory changed.
    /// </summary>
    public bool Renewal(string key, SpawnRules rules, double now)
    {
        var memory = Find(key);
        if (memory == null || !memory.KnowsDeath) return false;

        double due = now - rules.KillToRespawnSeconds;
        if (memory.DeathAt.Value <= due) return false;

        memory.DeathAt = due;
        memory.DeathSource = StateSource.Renewal;
        return true;
    }

    public string Serialize()
    {
        var text = new StringBuilder(Header).Append('\n');
        foreach (var entry in _monsters)
        {
            var memory = entry.Value;
            text.Append(entry.Key).Append('\t')
                .Append(Number(memory.DeathAt)).Append('\t')
                .Append(memory.DeathAt != null ? memory.DeathSource.ToString() : "").Append('\t')
                .Append(Number(memory.SeenUpAt)).Append('\n');
        }

        return text.ToString();
    }

    /// <summary>Reads <see cref="Serialize"/>'s output. Lines it cannot read are skipped.</summary>
    public static WorldMemory Parse(string text)
    {
        var world = new WorldMemory();
        var lines = text.Split('\n');
        if (lines.Length == 0 || lines[0].TrimEnd('\r') != Header) return world;

        for (int index = 1; index < lines.Length; index++)
        {
            var fields = lines[index].TrimEnd('\r').Split('\t');
            if (fields.Length != 4 || fields[0].Length == 0) continue;

            var memory = new MonsterMemory
            {
                DeathAt = Number(fields[1]),
                SeenUpAt = Number(fields[3]),
            };
            if (memory.DeathAt != null)
            {
                if (!Enum.TryParse(fields[2], out StateSource source)) continue;
                memory.DeathSource = source;
            }

            world._monsters[fields[0]] = memory;
        }

        return world;
    }

    private MonsterMemory Get(string key)
    {
        if (!_monsters.TryGetValue(key, out var memory))
        {
            memory = new MonsterMemory();
            _monsters[key] = memory;
        }

        return memory;
    }

    private static string Number(double? value) =>
        value?.ToString("R", CultureInfo.InvariantCulture) ?? "";

    private static double? Number(string field) =>
        double.TryParse(field, NumberStyles.Float, CultureInfo.InvariantCulture, out double value) ? value : null;
}
