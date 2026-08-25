using DataExporter.Models;
using MelonLoader;
using UnityEngine.Localization.Settings;

namespace DataExporter.Exporters;

public class GameConfigExporter : BaseExporter
{
    public GameConfigExporter(MelonLogger.Instance logger, string exportPath)
        : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting game config...");

        var config = new GameConfigData { export_locale = SelectedLocaleCode() };
        Logger.Msg($"Export locale: {config.export_locale ?? "none"}");

        var gameManager = Il2Cpp.GameManager.singleton;
        if (gameManager == null)
        {
            Logger.Warning("GameManager.singleton is null, skipping game config export");
            WriteJson(config, "game_config.json");
            return;
        }

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

        // Export seasonal items
        if (gameManager.HalloweenItems != null)
        {
            foreach (var item in gameManager.HalloweenItems)
            {
                if (item != null && !string.IsNullOrEmpty(item.name))
                {
                    config.seasonal_items.halloween.Add(SanitizeId(item.name));
                }
            }
        }

        if (gameManager.ChristmasItems != null)
        {
            foreach (var item in gameManager.ChristmasItems)
            {
                if (item != null && !string.IsNullOrEmpty(item.name))
                {
                    config.seasonal_items.christmas.Add(SanitizeId(item.name));
                }
            }
        }

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
}
