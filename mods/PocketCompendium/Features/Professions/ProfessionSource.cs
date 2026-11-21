using System;
using Il2Cpp;
using Il2CppTMPro;
using PocketCompendium.Features.Professions.Model;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.Professions;

/// <summary>
/// The 13 professions of the game's Professions tab, in the tab's order, left to right and top to
/// bottom. Levels come from the player as <c>UIProfessions.Update</c> computes them, and names and
/// icons from the tab's slots, so they follow the game's language.
/// </summary>
internal sealed class ProfessionSource
{
    // Source: server-scripts/UIProfessions.cs:Update — Lorekeeping counts books out of 17 and Exploring zones out of 47.
    private const float Books = 17f;
    private const float Zones = 47f;

    public readonly Profession[] All =
    {
        new("Adventuring", ui => ui.slotAdventuring, p => p.adventuringLevel),
        new("Alchemy", ui => ui.slotAlchemy, p => p.alchemyLevel),
        new("Cooking", ui => ui.slotCooking, p => p.cookingLevel),
        new("Herbalism", ui => ui.slotHerbalism, p => p.foragingLevel),
        new("TreasureHunter", ui => ui.slotTreasureHunter, p => p.treasureHunterLevel),
        new("Lorekeeping", ui => ui.slotLoreKeeping, p => p.books.Count / Books),
        new("Mining", ui => ui.slotMining, p => p.miningLevel),
        new("Exploring", ui => ui.slotExploring, p => p.zonesDiscovered.Count / Zones),
        new("RadiantSeeker", ui => ui.slotRadiantSeeker, p => p.radiantSekeerLevel),
        new("Slayer", ui => ui.slotSlayer, p => p.slayerLevel),
        new("Hunter", ui => ui.slotHunter, p => p.hunterLevel),
        new("ScrollMastery", ui => ui.slotScrollMastery, p => p.scrollMasteryLevel),
        new("Fishing", ui => ui.slotFishing, p => p.fishingLevel),
    };

    /// <summary>Reads every level, and names and icons once the game's tab exists. Returns whether a text changed.</summary>
    public bool Refresh(Player player)
    {
        var ui = UIProfessions.singleton;
        bool changed = false;
        foreach (var profession in All)
        {
            if (profession.Icon == null && ui != null) changed |= profession.ReadSlot(ui);
            float fraction = Mathf.Clamp01(profession.ReadLevel(player));
            string text = ProfessionLevels.Text(fraction);
            if (text == profession.LevelText) continue;
            profession.Fraction = fraction;
            profession.LevelText = text;
            changed = true;
        }
        return changed;
    }

    public void Forget()
    {
        foreach (var profession in All) profession.Icon = null;
    }

    public sealed class Profession
    {
        private readonly Func<UIProfessions, UIProfessionSlot> _slot;
        private readonly Func<Player, float> _level;

        public Profession(string key, Func<UIProfessions, UIProfessionSlot> slot, Func<Player, float> level)
        {
            Key = key;
            Name = key;
            _slot = slot;
            _level = level;
        }

        /// <summary>The game's English name without spaces, kept in the settings for a watch.</summary>
        public string Key { get; }

        public string Name { get; private set; }
        public Sprite Icon { get; set; }
        public float Fraction { get; set; }
        public string LevelText { get; set; }
        public bool Maxed => ProfessionLevels.Maxed(Fraction);

        public float ReadLevel(Player player) => _level(player);

        public bool ReadSlot(UIProfessions ui)
        {
            var slot = _slot(ui);
            if (slot == null) return false;
            var name = slot.transform.Find("NameProfession");
            var text = name != null ? name.GetComponent<TextMeshProUGUI>() : null;
            if (text != null && !string.IsNullOrEmpty(text.text)) Name = text.text;
            var icon = slot.transform.Find("0/icon");
            var image = icon != null ? icon.GetComponent<Image>() : null;
            Icon = image != null ? image.sprite : null;
            return Icon != null;
        }
    }
}
