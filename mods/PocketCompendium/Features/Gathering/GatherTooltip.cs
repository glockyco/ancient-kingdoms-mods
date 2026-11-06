using System;
using System.Collections.Generic;
using System.Text;
using Il2Cpp;
using PocketCompendium.Core.Text;
using PocketCompendium.Features.Gathering.Model;
using UnityEngine;

namespace PocketCompendium.Features.Gathering;

/// <summary>
/// A tile's tooltip, in the boss list's layout: what the type is and where it grows, then whether
/// it is worth the walk: how many are ready, how long it takes to grow back and the player's chance,
/// from the game's own formulas with their skill and best tool.
/// </summary>
internal static class GatherTooltip
{
    private const string SectionGap = "\n<size=50%> </size>";
    private const string Grey = "#A3B0BF";
    private const string Footer = "#6B7684";

    // The game refuses below these chances, as its messages say the skill is too low.
    private const float HerbFloor = 0.1f;
    private const float ToolFloor = 0.2f;

    // A spark appears between these waits after it was taken or went unclaimed.
    private const float SparkMin = 100f;
    private const float SparkMax = 3600f;

    private static readonly StringBuilder Text = new();

    public static string Build(GatherType type, GatherCatalogue catalogue, IReadOnlyList<GatherNode> zoneNodes, int zone,
        TypeSummary summary, double now, bool watched, bool silhouette)
    {
        var player = Player.localPlayer;
        bool here = summary.Total > 0;
        Text.Clear();

        Text.Append("<b><color=#").Append(ColourOf(type.Category)).Append('>')
            .Append(silhouette ? "???" : NameOf(type, catalogue)).Append("</color></b>\n");
        Text.Append("<size=90%><color=").Append(Grey).Append('>').Append(KindOf(type.Category));
        if (type.Category != GatherCategory.Fishing) Text.Append(" · ").Append(GameText.Level(type.Level + 1));
        Text.Append(" · ").Append(here ? GameText.ZoneName("", zone) : Zones(type)).Append("</color></size>").Append(SectionGap);

        if (type.Category == GatherCategory.Fishing)
        {
            if (here)
            {
                int spots = 0;
                GatherNode easiest = null;
                foreach (var node in zoneNodes)
                {
                    if (node.Category != GatherCategory.Fishing) continue;
                    spots++;
                    if (node.Offers(type) && (easiest == null || node.Level < easiest.Level)) easiest = node;
                }

                Text.Append('\n').Append(summary.Total).Append(" of ").Append(spots).Append(" fishing spots here list it");
                if (player != null && easiest != null)
                {
                    float chance = Utils.GetSuccessProbFishing(ToolQuality(player, "Fishing Rod"), player.fishingLevel, easiest.Level);
                    Text.Append('\n');
                    AppendChance(chance, ToolFloor, "Fishing");
                    Text.Append(" at a ").Append(easiest.Name);
                }
            }
        }
        else
        {
            if (here)
                Text.Append('\n').Append(summary.Estimate ? "~" : "").Append(summary.Ready).Append(" of ").Append(summary.Total).Append(" ready");
            AppendRegrow(type, catalogue);
            if (player != null) AppendTypeChance(type, player);
        }

        Text.Append(SectionGap).Append("\n<size=90%><color=").Append(Footer).Append('>')
            .Append(watched ? "Click to stop watching." : "Click to watch.").Append("</color></size>");
        Wrapping.KeepLastWordsTogether(Text);
        return Text.ToString();
    }

    /// <summary>The name in the game's words: a node's name, or a fish's item name in the game's language.</summary>
    public static string NameOf(GatherType type, GatherCatalogue catalogue)
    {
        if (type.Category != GatherCategory.Fishing) return type.Name;
        var fish = catalogue.Fish(type.Name);
        return fish != null ? fish.LocalizedName() : type.Name;
    }

    private static void AppendRegrow(GatherType type, GatherCatalogue catalogue)
    {
        if (type.Category == GatherCategory.Sparks)
        {
            Text.Append("\nAppears after ").Append(Utils.PrettySecondsSimple(SparkMin)).Append(" to ").Append(Utils.PrettySecondsSimple(SparkMax));
            return;
        }

        var sample = catalogue.Sample(type);
        if (sample == null || sample.timeToWaitReady <= 0.0) return;
        float wait = (float)sample.timeToWaitReady;
        Text.Append("\nRespawns ");
        // A mined rock takes half to all of its time, a picked plant all of it.
        if (type.Category == GatherCategory.Ores) Text.Append(Utils.PrettySecondsSimple(wait / 2f)).Append(" to ");
        Text.Append(Utils.PrettySecondsSimple(wait)).Append(" after it's gathered");
    }

    private static void AppendTypeChance(GatherType type, Player player)
    {
        switch (type.Category)
        {
            case GatherCategory.Herbs:
                Text.Append('\n');
                AppendChance(Utils.GetSuccessProbHerbalism(type.Level, player.foragingLevel), HerbFloor, "Herbalism");
                break;
            case GatherCategory.Ores:
                Text.Append('\n');
                AppendChance(Utils.GetSuccessProbMining(ToolQuality(player, "Pickaxe"), player.miningLevel, type.Level), ToolFloor, "Mining");
                break;
        }
    }

    private static void AppendChance(float chance, float floor, string skill)
    {
        Text.Append("Your chance ").Append(Mathf.RoundToInt(Mathf.Clamp01(chance) * 100f)).Append('%');
        if (chance < floor) Text.Append(". Your ").Append(skill).Append(" is too low.");
    }

    // The game uses the selected tool, or else the best one in the bags, as its hover does.
    private static int ToolQuality(Player player, string category)
    {
        var inventory = player.inventory;
        if (inventory == null) return 0;
        int selected = category == "Pickaxe" ? player.slotPickaxeSelected : player.slotFishingRodSelected;
        int quality = Quality(inventory, selected, category, out bool usable);
        if (usable) return quality;
        int best = category == "Pickaxe" ? inventory.GetSlotBestPickaxe() : inventory.GetSlotBestFishingRod();
        return Quality(inventory, best, category, out _);
    }

    private static int Quality(PlayerInventory inventory, int index, string category, out bool usable)
    {
        usable = false;
        if (index < 0 || index >= inventory.slots.Count) return 0;
        var slot = inventory.slots[index];
        var weapon = slot.amount > 0 && slot.item.data != null ? slot.item.data.TryCast<WeaponItem>() : null;
        if (weapon == null || weapon.category != category) return 0;
        usable = category != "Pickaxe" || slot.durability > 0;
        return usable ? weapon.quality : 0;
    }

    private static string Zones(GatherType type)
    {
        var names = new List<string>();
        foreach (int zone in type.Zones) names.Add(GameText.ZoneName("", zone));
        return string.Join(", ", names);
    }

    private static string KindOf(GatherCategory category) => category switch
    {
        GatherCategory.Herbs => "Herb",
        GatherCategory.Ores => "Ore",
        GatherCategory.Fishing => "Fish",
        _ => "Spark",
    };

    // The game's colours for these names in its own hover, lightened where they read poorly on the panel.
    private static string ColourOf(GatherCategory category) => category switch
    {
        GatherCategory.Herbs => "7FC96B",
        GatherCategory.Ores => "C3AE80",
        GatherCategory.Fishing => "ADD8E6",
        _ => "E7B24A",
    };
}
