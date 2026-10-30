using System;
using System.Collections.Generic;
using Il2Cpp;
using Il2CppTMPro;

namespace AncientKingdomsMods.Shared;

/// <summary>
/// The game's own translations and fonts, for text the mods show. Each helper falls back to the
/// text vanilla shows where the game has no translation, so English stays exactly as vanilla
/// prints it. The game selects the language on the title screen and keys its own caches by
/// locale, so callers re-apply text and fonts whenever they redraw, as vanilla does.
/// </summary>
internal static class GameText
{
    private const string English = "en";

    // item.class.* covers six classes and the flat keys add Bard and Necromancer. Monster-only
    // classes such as Paladin have no key, and vanilla shows every class in English.
    private static readonly HashSet<string> PlayerClasses = new(StringComparer.Ordinal)
    {
        "warrior", "cleric", "druid", "ranger", "rogue", "wizard", "bard", "necromancer",
    };

    private static List<KeyValuePair<int, string>> _zones;

    public static bool IsEnglish => EntityNameLocalization.LocaleCode == English;

    public static string MonsterName(Monster monster) => monster != null ? monster.LocalizedName() : string.Empty;

    /// <summary>Translates a canonical English entity name, such as a monster's <c>nameEntity</c>.</summary>
    public static string EntityName(string canonical) => EntityNameLocalization.Get(canonical);

    /// <summary>Translates the entity names inside a longer English text, such as boss lore.</summary>
    public static string WithEntityNames(string text) =>
        string.IsNullOrEmpty(text) ? string.Empty : EntityNameLocalization.LocalizeReferences(text);

    public static string SkillName(ScriptableSkill skill) => skill != null ? skill.LocalizedDisplayName() : string.Empty;

    /// <summary>A <c>Localization_String_Table</c> entry, or <paramref name="fallback"/> when it has none.</summary>
    public static string Term(string key, string fallback) => UITutorial.Localize(key, fallback) ?? fallback;

    public static string Level(int level) => Term("level", "Level") + " " + level;

    public static string FullDurability() => ScriptableItem.LocalizedDurabilityPercent(100);

    public static string ClassName(string className)
    {
        if (string.IsNullOrWhiteSpace(className) || IsEnglish)
            return className ?? string.Empty;

        var key = className.Trim().ToLowerInvariant();
        if (!PlayerClasses.Contains(key))
            return className;

        return ScriptableItem.LocalizedTerm("class." + key, null) ?? Term(key, className);
    }

    /// <summary>
    /// The monster's zone in the player's language. <paramref name="zoneText"/> is the monster's
    /// free-text zone, translated only when it names one of the game's zones. An empty text falls
    /// back to <paramref name="zoneId"/>.
    /// </summary>
    public static string ZoneName(string zoneText, int zoneId)
    {
        var zones = Zones();
        if (!string.IsNullOrWhiteSpace(zoneText))
        {
            if (IsEnglish)
                return zoneText;
            var id = ZoneNames.Match(zoneText, zones);
            return id.HasValue ? ScriptableItem.LocalizedZoneName(id.Value, zoneText) : zoneText;
        }

        foreach (var zone in zones)
        {
            if (zone.Key == zoneId)
                return IsEnglish ? zone.Value : ScriptableItem.LocalizedZoneName(zoneId, zone.Value);
        }

        return string.Empty;
    }

    /// <summary>Gives the label the game's Chinese or Japanese font in those languages, and its own font otherwise.</summary>
    public static void ApplyFont(TMP_Text label)
    {
        if (label != null)
            EntityNameLocalization.ApplyFont(label);
    }

    /// <summary>
    /// A Latin font for a label the mod creates. <see cref="ApplyFont"/> remembers a label's first
    /// font as the one to restore outside Chinese and Japanese, so a label must start with a Latin
    /// font even when it is created in a Chinese or Japanese session.
    /// </summary>
    public static TMP_FontAsset LatinFont(TMP_FontAsset candidate)
    {
        var tutorial = UITutorial.singleton;
        var isCjk = candidate != null && tutorial != null &&
                    (candidate == tutorial.jaFont || candidate == tutorial.zhFont);
        return candidate == null || isCjk ? TMP_Settings.defaultFontAsset : candidate;
    }

    private static List<KeyValuePair<int, string>> Zones()
    {
        if (_zones != null)
            return _zones;

        var zones = new List<KeyValuePair<int, string>>();
        if (ZoneInfo.zones != null)
        {
            foreach (var entry in ZoneInfo.zones)
            {
                if (entry.Value != null && !string.IsNullOrWhiteSpace(entry.Value.name))
                    zones.Add(new KeyValuePair<int, string>(entry.Key, entry.Value.name));
            }
        }

        // ZoneInfo.zones is a static readonly table, so one read serves the session.
        if (zones.Count > 0)
            _zones = zones;
        return zones;
    }
}
