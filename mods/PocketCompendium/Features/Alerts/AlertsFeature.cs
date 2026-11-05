using System;
using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using UnityEngine;

namespace PocketCompendium.Features.Alerts;

/// <summary>
/// Announces a watched monster when it spawns, with the game's own important message and chat
/// line, so the alert reads like the game's summon messages.
/// </summary>
public sealed class AlertsFeature : Feature
{
    private readonly Dictionary<string, SpawnState> _previous = new(StringComparer.Ordinal);
    private int _session = -1;
    private int _version = -1;

    public AlertsFeature()
        : base("Alerts", "Alerts", "Tells you on screen and in chat when a monster you watch spawns.")
    {
    }

    public override bool UsesTracker => true;

    protected internal override void Enable() => _previous.Clear();

    protected internal override void Disable() => _previous.Clear();

    protected internal override void Update()
    {
        var tracker = Tracker.Current;
        var watchlist = Watchlist.Current;
        var player = GameAccess.LocalPlayer;
        if (tracker == null || !tracker.Ready || tracker.Failed || player == null) return;

        // A new world starts without history, so its first states raise nothing.
        if (tracker.Session != _session)
        {
            _previous.Clear();
            _session = tracker.Session;
        }

        if (tracker.Version == _version) return;
        _version = tracker.Version;

        foreach (var monster in tracker.Monsters)
        {
            var now = monster.State.State;
            if (_previous.TryGetValue(monster.Key, out var before) && Spawned(before, now) && watchlist.Contains(monster.Key))
                Announce(player, monster, tracker.Exact);
            _previous[monster.Key] = now;
        }
    }

    // Only a change from a state that says the monster is gone counts. A first sighting of a
    // monster never seen before is no spawn.
    private static bool Spawned(SpawnState before, SpawnState now) =>
        now is SpawnState.Up or SpawnState.InCombat
        && before is SpawnState.Respawns or SpawnState.Estimated or SpawnState.Chance or SpawnState.Due
            or SpawnState.Window or SpawnState.Guards or SpawnState.Altar;

    // The game adds the chat line's full stop. A host saw the spawn happen, a client saw it up.
    // While Undiscovered monsters is off, a watched monster the player has not discovered stays
    // ??? here too.
    private static void Announce(Player player, TrackedMonster monster, bool exact)
    {
        string name = Discovery.Shown(monster.Key) ? GameText.EntityName(monster.Key) : "???";
        string zone = GameText.ZoneName("", monster.Zone);
        string where = string.IsNullOrEmpty(zone) ? "" : " in " + zone;
        player.ShowImportantMessage(name + (exact ? " has spawned" : " is up") + where, Il2Cpp.Utils.colorImportantGolden, showChat: true);
    }
}
