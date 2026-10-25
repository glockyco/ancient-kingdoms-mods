using DataExporter.Models;
using MelonLoader;
using UnityEngine;
using UnityEngine.Localization.Settings;

namespace DataExporter.Exporters;

public class GameConfigExporter : BaseExporter
{
    private readonly ConfiguredWorldSnapshot _snapshot;
    public GameConfigExporter(MelonLogger.Instance logger, string exportPath, ConfiguredWorldSnapshot snapshot)
        : base(logger, exportPath)
    {
        _snapshot = snapshot;
    }

    public override void Export()
    {
        Logger.Msg("Exporting game config...");

        var config = new GameConfigData
        {
            game_version = Application.version,
            export_locale = SelectedLocaleCode(),
            lockpicks_item_id = _snapshot.Read<string>("lockpicks"),
            journal_fish_item_ids = _snapshot.Read<System.Collections.Generic.List<string>>("journal_fish"),
            trash_fish_item_ids = _snapshot.Read<System.Collections.Generic.List<string>>("trash_fish"),
            housing_catalog = _snapshot.Read<System.Collections.Generic.List<HousingCatalogData>>("housing_catalog")
        };
        Logger.Msg(
            $"Export game version: {config.game_version ?? "none"}; "
            + $"locale: {config.export_locale ?? "none"}");

        var gameManager = Il2Cpp.GameManager.singleton;
        if (gameManager == null)
            throw new System.InvalidOperationException("GameManager.singleton is unavailable; cannot export game config.");

        // Export bestiary monsters (elites/bosses for Slayer skill)
        if (gameManager.elitesBosses != null)
        {
            foreach (var monster in gameManager.elitesBosses)
            {
                if (monster != null && !string.IsNullOrEmpty(monster.name))
                {
                    config.bestiary_monsters.Add(SanitizeId(monster.name));
                }
            }
            Logger.Msg($"Found {config.bestiary_monsters.Count} bestiary monsters");
        }

        // Export mounts
        if (gameManager.listMountItems != null)
        {
            foreach (var mount in gameManager.listMountItems)
            {
                if (mount != null && !string.IsNullOrEmpty(mount.name))
                {
                    config.mounts.Add(SanitizeId(mount.name));
                }
            }
            Logger.Msg($"Found {config.mounts.Count} mounts");
        }

        // Source: server-scripts/NpcTrading.cs:VisibleSaleItemsFor and EnviromentSystem.cs:CheckSpecialEvents.
        // The season ids are the game's own keys (isHalloween, isChristmas). These lists are
        // configuration, so the export does not depend on which season is active.
        config.seasons.Add(ExportSeason("halloween", gameManager.HalloweenBuff, gameManager.HalloweenItems));
        config.seasons.Add(ExportSeason("christmas", gameManager.ChristmasBuff, gameManager.ChristmasItems));

        // Export special item references
        config.special_items = new SpecialItemsData
        {
            gold_item = GetItemId(gameManager.GoldItem),
            primal_essence = GetItemId(gameManager.PrimalEssenceItem),
            blessed_rune = GetItemId(gameManager.blessedRune),
            redemption_token = GetItemId(gameManager.redemptionToken),
            max_level_reward = GetItemId(gameManager.RewardMaxLevelItem),
            food_burned = GetItemId(gameManager.food_burned)
        };

        WriteJson(config, "game_config.json");
        Logger.Msg($"✓ Exported game config with {config.bestiary_monsters.Count} bestiary monsters, {config.mounts.Count} mounts");
    }

    /// <summary>
    /// The code of the locale the game has selected, or null when it has none.
    ///
    /// ScriptableItem resolves a tooltip through this locale, and the locale also
    /// chooses the culture that formats its numbers.
    /// </summary>
    private static string SelectedLocaleCode()
    {
        var locale = LocalizationSettings.SelectedLocale;
        if (locale == null)
            return null;

        var code = locale.Identifier.Code;
        return string.IsNullOrEmpty(code) ? null : code;
    }

    private string GetItemId(Il2Cpp.ScriptableItem item)
    {
        if (item == null || string.IsNullOrEmpty(item.name))
            return null;
        return SanitizeId(item.name);
    }

    private SeasonData ExportSeason(
        string id,
        Il2Cpp.BuffSkill buff,
        Il2CppInterop.Runtime.InteropTypes.Arrays.Il2CppReferenceArray<Il2Cpp.ScriptableItem> items)
    {
        if (buff == null || string.IsNullOrEmpty(buff.name))
            throw new System.InvalidOperationException($"GameManager has no buff for season {id}.");
        if (items == null || items.Length == 0)
            throw new System.InvalidOperationException($"GameManager has no shop list for season {id}.");
        var season = new SeasonData { id = id, buff_skill_id = SanitizeId(buff.name) };
        foreach (var item in items)
        {
            if (item == null || string.IsNullOrEmpty(item.name))
                throw new System.InvalidOperationException($"Season {id} shop list has a missing item.");
            season.shop_item_ids.Add(SanitizeId(item.name));
        }
        Logger.Msg($"Season {id}: buff {season.buff_skill_id}, {season.shop_item_ids.Count} shop items");
        return season;
    }
}
