using System.Collections.Generic;
using Il2Cpp;
using Il2CppInterop.Runtime;
using PocketCompendium.Core.Game;
using UnityEngine;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// Builds the tracked monsters from the Bestiary's list and the world scene. A client sees the
/// same scene and prefab data as a host, so both build the same catalogue.
/// </summary>
internal static class Catalogue
{
    private const string CloneSuffix = "(Clone)";

    public static List<TrackedMonster> Build()
    {
        var definitions = GameManager.singleton.elitesBosses;
        var keys = new HashSet<string>();
        for (int index = 0; index < definitions.Count; index++)
            if (definitions[index] != null) keys.Add(definitions[index].name);

        var zones = ZoneRoots();
        var placed = new Dictionary<string, Monster>();
        var placeholderSources = new Dictionary<string, Monster>();
        foreach (var found in Resources.FindObjectsOfTypeAll(Il2CppType.Of<Monster>()))
        {
            var monster = found.TryCast<Monster>();
            if (monster == null || !monster.gameObject.scene.IsValid() || !monster.respawn || monster.isForgotttenAltarEvent) continue;

            string name = monster.gameObject.name;
            if (keys.Contains(name) && !placed.ContainsKey(name)) placed[name] = monster;

            var spawns = monster.monsterPH;
            if (spawns != null && monster.probSpawnPH > 0f && keys.Contains(spawns.name)) placeholderSources[spawns.name] = monster;
        }

        var altars = new Dictionary<string, (Transform Altar, ScriptableItem Item)>();
        foreach (var found in Object.FindObjectsByType(Il2CppType.Of<EventAltar>(), FindObjectsInactive.Include, FindObjectsSortMode.None))
        {
            var altar = found.TryCast<EventAltar>();
            if (altar != null && altar.defaultEvent != null)
                AddAltarMonsters(altars, keys, altar.defaultEvent.listWavesMonsters, altar.transform, altar.requiredActivationItem);
        }

        foreach (var found in Object.FindObjectsByType(Il2CppType.Of<AvatarEventAltar>(), FindObjectsInactive.Include, FindObjectsSortMode.None))
        {
            var altar = found.TryCast<AvatarEventAltar>();
            if (altar != null && altar.avatarEvent != null)
                AddAltarMonsters(altars, keys, altar.avatarEvent.listWavesMonsters, altar.transform, altar.requiredActivationItem);
        }

        var guards = new Dictionary<string, Monster[]>();
        foreach (var found in Object.FindObjectsByType(Il2CppType.Of<SummonMonster>(), FindObjectsInactive.Include, FindObjectsSortMode.None))
        {
            var summon = found.TryCast<SummonMonster>();
            if (summon == null || summon.summonEntity == null || summon.placeHolders == null) continue;

            var list = new Monster[summon.placeHolders.Count];
            for (int index = 0; index < list.Length; index++) list[index] = summon.placeHolders[index];
            guards[summon.summonEntity.name] = list;
        }

        var monsters = new List<TrackedMonster>(definitions.Count);
        for (int index = 0; index < definitions.Count; index++)
        {
            var definition = definitions[index];
            if (definition == null) continue;

            var tier = GameAccess.TierOf(definition);
            if (tier == null) continue;

            string key = definition.name;
            if (placed.TryGetValue(key, out var placement))
            {
                var summonGuards = placement.isSummonable && guards.TryGetValue(key, out var list) ? list : System.Array.Empty<Monster>();
                monsters.Add(new TrackedMonster(index, definition, placement, tier.Value,
                    Rules(placement, SpawnOrigin.Placed, summoned: summonGuards.Length > 0),
                    ZoneOf(zones, placement.transform), SpawnPoint(placement), summonGuards, null));
            }
            else if (altars.TryGetValue(key, out var altar))
            {
                monsters.Add(new TrackedMonster(index, definition, null, tier.Value,
                    Rules(definition, SpawnOrigin.Altar, summoned: false),
                    ZoneOf(zones, altar.Altar), altar.Altar.position, System.Array.Empty<Monster>(), altar.Item));
            }
            else if (placeholderSources.TryGetValue(key, out var source))
            {
                monsters.Add(new TrackedMonster(index, definition, null, tier.Value,
                    Rules(definition, SpawnOrigin.Placeholder, summoned: false),
                    ZoneOf(zones, source.transform), SpawnPoint(source), new[] { source }, null));
            }
            else
            {
                Log.Warning($"Respawn tracking found no placement, altar or source for {key}.");
            }
        }

        return monsters;
    }

    /// <summary>The tracked key of a running monster, without the suffix a client's prefab instances carry.</summary>
    public static string KeyOf(Monster monster)
    {
        string name = monster.gameObject.name;
        return name.EndsWith(CloneSuffix, System.StringComparison.Ordinal) ? name.Substring(0, name.Length - CloneSuffix.Length) : name;
    }

    private static void AddAltarMonsters(Dictionary<string, (Transform, ScriptableItem)> altars, HashSet<string> keys,
        Il2CppSystem.Collections.Generic.List<WaveMonsterSpawnEvent> waves, Transform altar, ScriptableItem item)
    {
        if (waves == null) return;
        foreach (var wave in waves)
        {
            if (wave?.waveMonsters == null) continue;
            foreach (var spawn in wave.waveMonsters)
            {
                var monster = spawn?.monster;
                if (monster != null && keys.Contains(monster.name)) altars[monster.name] = (altar, item);
            }
        }
    }

    private static SpawnRules Rules(Monster monster, SpawnOrigin origin, bool summoned) =>
        new(origin, monster.respawnTime, monster.deathTime, monster.probabilityRespawn, monster.startSpawnTime, monster.endSpawnTime, summoned);

    // Awake stores the spawn point before anything moves the monster. A client's Mirror activates a
    // scene object before it applies the spawn position, so Awake sees the authored point there too.
    // A monster that never woke still stands at its authored point.
    private static Vector2 SpawnPoint(Monster monster)
    {
        var start = monster.startPosition;
        return start != Vector2.zero ? start : (Vector2)monster.transform.position;
    }

    // ZoneInfo.fullZones holds each zone's root object at the index of its zone id.
    internal static Dictionary<int, int> ZoneRoots()
    {
        var roots = new Dictionary<int, int>();
        var zones = ZoneInfo.singleton.fullZones;
        for (int zone = 0; zone < zones.Count; zone++)
            if (zones[zone] != null) roots[zones[zone].GetInstanceID()] = zone;
        return roots;
    }

    /// <summary>The zone whose root holds <paramref name="transform"/>, or -1.</summary>
    internal static int ZoneOf(Dictionary<int, int> roots, Transform transform) =>
        roots.TryGetValue(transform.root.gameObject.GetInstanceID(), out int zone) ? zone : -1;
}
