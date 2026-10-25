using System.Collections.Generic;

namespace DataExporter.Models;

public class GameConfigData
{
    /// <summary>The game version that produced every file in this export run.</summary>
    public string game_version { get; set; }

    /// <summary>
    /// The locale the export was taken under. A localized string is in some
    /// language, so this dependency cannot be removed. The build reads it and
    /// fails on any language other than the one the compendium publishes.
    /// </summary>
    public string export_locale { get; set; }

    public List<string> bestiary_monsters { get; set; } = new();
    public List<string> mounts { get; set; } = new();
    public List<SeasonData> seasons { get; set; } = new();
    public SpecialItemsData special_items { get; set; } = new();
    public string lockpicks_item_id { get; set; }
    public List<string> journal_fish_item_ids { get; set; } = new();
    public List<string> trash_fish_item_ids { get; set; } = new();
    public List<HousingCatalogData> housing_catalog { get; set; } = new();
}

/// <summary>
/// A seasonal event as the game configures it. The id is the game's own season
/// key, which monster and NPC season fields reference.
/// </summary>
public class SeasonData
{
    public string id { get; set; }
    /// <summary>The buff every online player receives while the season runs.</summary>
    public string buff_skill_id { get; set; }
    /// <summary>Items every repair merchant adds to its stock while the season runs.</summary>
    public List<string> shop_item_ids { get; set; } = new();
}

public class SpecialItemsData
{
    public string gold_item { get; set; }
    public string primal_essence { get; set; }
    public string blessed_rune { get; set; }
    public string redemption_token { get; set; }
    public string max_level_reward { get; set; }
    public string food_burned { get; set; }
}
