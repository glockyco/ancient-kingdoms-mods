using System.Text;
using Il2Cpp;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Ui;
using UnityEngine;

namespace PocketCompendium.Core.Tracking;

/// <summary>
/// The game-tooltip text for a tracked monster: who it is, the rule behind its state, when it
/// spawns, where the fact comes from, and what a click does. Rows, tiles and pins share it.
/// </summary>
internal static class MonsterTooltip
{
    private static readonly StringBuilder Text = new();

    // A half-height blank line between the header, the rule, the facts and the hint.
    private const string SectionGap = "\n<size=50%> </size>";

    /// <param name="named">False for an undiscovered monster drawn as a silhouette.</param>
    /// <param name="distance">The distance to the spawn point in yd, for monsters in the player's zone.</param>
    public static string Build(TrackedMonster monster, double now, bool named, bool watched, float? distance, Vector2 direction)
    {
        var state = monster.State;
        var rules = monster.Rules;
        string zone = GameText.ZoneName("", monster.Zone);

        Text.Clear();
        string colour = ColorUtility.ToHtmlStringRGB(Theme.Readable(GameAccess.TierColor(monster.Tier)));
        Text.Append("<b><color=#").Append(colour).Append('>')
            .Append(named ? GameText.EntityName(monster.Key) : "???").Append("</color></b>\n");
        Text.Append("<size=90%><color=#A3B0BF>").Append(TierWord(monster.Tier)).Append(" · ")
            .Append(GameText.Level(monster.Level));
        if (!string.IsNullOrEmpty(zone)) Text.Append(" · ").Append(zone);
        Text.Append("</color></size>").Append(SectionGap);

        AppendRule(monster);
        AppendState(monster, now, zone);

        int facts = Text.Length;
        AppendSource(state, now);

        if (distance.HasValue)
            Text.Append("\n<color=#A3B0BF>").Append(monster.Rules.Origin == SpawnOrigin.Altar ? "Altar" : "Spawn point")
                .Append("</color> ").Append(Mathf.RoundToInt(distance.Value)).Append(" yd ").Append(Compass(direction));

        int kills = Kills(monster.Key);
        if (kills > 0) Text.Append("\n<color=#A3B0BF>Your kills</color> ").Append(kills);
        if (Text.Length > facts) Text.Insert(facts, SectionGap);

        Text.Append(SectionGap).Append("\n<size=90%><color=#6B7684>")
            .Append(watched ? "Click to stop watching." : "Click to watch.")
            .Append(" Shift-click opens the Bestiary.</color></size>");
        Wrapping.KeepLastWordsTogether(Text);
        return Text.ToString();
    }

    /// <summary>Whether the player's Bestiary has an entry for the monster.</summary>
    public static bool Discovered(string key)
    {
        var player = Player.localPlayer;
        return player != null && player.bossesKilled != null && player.bossesKilled.ContainsKey(key);
    }

    private static int Kills(string key)
    {
        var player = Player.localPlayer;
        return player != null && player.bossesKilled != null && player.bossesKilled.TryGetValue(key, out int kills) ? kills : 0;
    }

    private static void AppendRule(TrackedMonster monster)
    {
        var rules = monster.Rules;
        Text.Append('\n');
        switch (rules.Origin)
        {
            case SpawnOrigin.Altar:
                Text.Append("Spawns only in an altar event");
                if (monster.AltarItem != null) Text.Append(", started with ").Append(monster.AltarItem.LocalizedName());
                Text.Append('.');
                return;
            case SpawnOrigin.Placeholder:
                Text.Append("Spawns when ").Append(GameText.EntityName(monster.Guards[0].name)).Append(" dies.");
                return;
        }

        Text.Append("Respawns ").Append(StateText.Minutes(rules.KillToRespawnSeconds)).Append(" after each kill.");
        if (rules.ChancePercent is int chance) Text.Append(" Each spawn has a <b>").Append(chance).Append("% chance</b>.");
        if (rules.Summoned) Text.Append(" It spawns only after all ").Append(monster.Guards.Length).Append(" of its guards are dead at the same time.");
        // Written like the game's clock on the minimap.
        if (rules.HasWindow)
            Text.Append(rules.NightWindow ? " Only at night, " : " Only by day, ")
                .Append(rules.WindowStart.ToString("00")).Append(":00 to ")
                .Append(rules.WindowEnd.ToString("00")).Append(":00.");
    }

    private static void AppendState(TrackedMonster monster, double now, string zone)
    {
        var state = monster.State;
        var rules = monster.Rules;
        string about = state.Estimate ? "about " : "";
        string where = string.IsNullOrEmpty(zone) ? "the zone" : zone;
        Text.Append('\n');
        switch (state.State)
        {
            case SpawnState.Up:
                Text.Append("Up now.");
                break;
            case SpawnState.InCombat:
                Text.Append("Up, and in a fight.");
                break;
            case SpawnState.Respawns:
            case SpawnState.Estimated:
                Text.Append("Next spawn in ").Append(about).Append("<b>").Append(StateText.Countdown(state.At.Value - now)).Append("</b>.");
                break;
            case SpawnState.Chance:
                if (state.LastRollFailed) Text.Append("The last roll failed. ");
                Text.Append("The next roll is in ").Append(about).Append("<b>").Append(StateText.Countdown(state.At.Value - now))
                    .Append("</b>, then every ").Append(StateText.Minutes(rules.RespawnSeconds)).Append('.');
                break;
            case SpawnState.Due:
                if (state.WaitsForEntry)
                    Text.Append("Nobody has entered ").Append(where).Append(" since the world started. When someone does, it waits ")
                        .Append(StateText.Minutes(rules.RespawnSeconds)).Append(", then rolls.");
                else if (state.Estimate)
                    Text.Append("Its estimated time has passed, so it may be up.");
                else if (rules.Rolls)
                    Text.Append("Its roll is due. It happens when someone is in ").Append(where).Append('.');
                else
                    Text.Append("Its time has passed. It spawns when someone is in ").Append(where).Append('.');
                break;
            case SpawnState.Window:
                Text.Append(state.At.HasValue
                    ? "Its window opens in " + about + "<b>" + StateText.Minutes(state.At.Value - now) + "</b>."
                    : "Its window never opens.");
                break;
            case SpawnState.Guards:
                if (rules.Origin == SpawnOrigin.Placeholder) Text.Append(state.GuardsLeft > 0 ? "It is alive, so the next death spawns it." : "It is dead, so this waits for its respawn.");
                else if (state.GuardsLeft >= 0) Text.Append("<b>").Append(state.GuardsLeft).Append(" of ").Append(state.GuardsTotal).Append("</b> guards are alive.");
                else Text.Append("Its guards are out of sight.");
                break;
            case SpawnState.Altar:
                Text.Append("No event is running.");
                break;
            case SpawnState.Seen:
                Text.Append("Seen up ").Append(StateText.Ago(now - state.ObservedAt.Value)).Append('.');
                break;
            default:
                Text.Append("Not seen on this server yet.");
                break;
        }
    }

    private static void AppendSource(in TrackedState state, double now)
    {
        if (state.ObservedAt == null) return;

        string ago = StateText.Ago(now - state.ObservedAt.Value);
        switch (state.Source)
        {
            case StateSource.Host when state.State is not (SpawnState.Up or SpawnState.InCombat):
            case StateSource.Shared when state.State is not (SpawnState.Up or SpawnState.InCombat):
                Text.Append("\n<color=#A3B0BF>Killed</color> ").Append(ago);
                break;
            case StateSource.SeenDeath:
                Text.Append("\n<color=#A3B0BF>Killed</color> ").Append(ago).Append(", seen by you");
                break;
            case StateSource.SeenCorpse:
                Text.Append("\n<color=#A3B0BF>Corpse found</color> ").Append(ago).Append(", so it may spawn a little later");
                break;
            case StateSource.KillNotice:
                Text.Append("\n<color=#A3B0BF>Killed</color> ").Append(ago).Append(", from the server's kill notice");
                break;
        }
    }

    private static string TierWord(Tier tier) => tier switch
    {
        Tier.Boss => "Boss",
        Tier.Elite => "Elite",
        _ => "Fabled",
    };

    // The world's y axis points north on the map.
    private static string Compass(Vector2 direction)
    {
        float angle = Mathf.Atan2(direction.y, direction.x) * Mathf.Rad2Deg;
        int sector = Mathf.RoundToInt(((angle % 360f) + 360f) % 360f / 45f) % 8;
        return sector switch
        {
            0 => "east",
            1 => "northeast",
            2 => "north",
            3 => "northwest",
            4 => "west",
            5 => "southwest",
            6 => "south",
            _ => "southeast",
        };
    }
}
