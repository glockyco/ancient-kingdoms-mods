using System;
using System.Collections.Generic;
using Il2Cpp;
using PocketCompendium.Core;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BestiaryPages.Model;
using PocketCompendium.Features.BestiaryPages.Skills;
using PocketCompendium.Features.BossSkills.Model;
using UnityEngine;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace PocketCompendium.Features.BestiaryPages.Ui;

/// <summary>
/// Lays out a monster's skills in the Skills window: AT A GLANCE with its damage types and
/// threats, one card per special skill in the in-fight cards' order, then one line for the basic
/// attack and one for each passive or aura. Every card and line shows the skill's full mechanics
/// on hover and on gamepad focus.
/// </summary>
internal static class SkillsContent
{
    private const float Pad = 32f;
    private const float Inner = SkillsWindow.Width - 2f * Pad;
    private const float LabelColumn = 96f;

    // The Journal's own heading gold and text greys.
    private static readonly Color Gold = new(0.918f, 0.875f, 0.647f, 1f);
    private static readonly Color White = new(0.95f, 0.95f, 0.93f, 1f);
    private static readonly Color Body = new(0.80f, 0.80f, 0.78f, 1f);
    private static readonly Color Muted = new(0.60f, 0.62f, 0.66f, 1f);
    private static readonly Color Line = new(1f, 1f, 1f, 0.10f);
    private static readonly Color CardTint = new(1f, 1f, 1f, 0.55f);

    // The resistance icons of the game's character window, by damage type.
    private static readonly Dictionary<string, string> ResistIcons = new(StringComparer.Ordinal)
    {
        ["Physical"] = "armor",
        ["Magic"] = "magic_resist",
        ["Fire"] = "fire_resist",
        ["Cold"] = "cold_resist",
        ["Poison"] = "poison_resist",
        ["Disease"] = "disease_resist",
    };

    private static Dictionary<string, Sprite> _sprites;

    /// <summary>Replaces the window's content with <paramref name="monster"/>'s skills.</summary>
    public static void Build(SkillsWindow window, Monster monster)
    {
        var content = window.Content;
        for (int index = content.childCount - 1; index >= 0; index--)
            Object.Destroy(content.GetChild(index).gameObject);
        var entries = window.Entries;
        entries.Clear();

        // TextMesh Pro breaks Japanese and Chinese names between any two characters.
        string monsterName = KeepTogether(GameText.MonsterName(monster));
        var skills = Read(monster);
        var summary = new MonsterSkillSummary(skills.ConvertAll(entry => entry.Facts));

        float y = 6f;
        y = Heading(content, "AT A GLANCE", y);
        y = DamageRow(content, summary, y);
        string threats = SkillCardText.Threats(summary);
        if (!string.IsNullOrEmpty(threats)) y = TextRow(content, "Threats", threats, y);
        y = Rule(content, y);

        var specials = skills.FindAll(entry => entry.Facts.IsSpecial);
        if (specials.Count == 0)
        {
            y = Note(content, "No special skills.", y);
        }
        else
        {
            y = Heading(content, "SPECIAL SKILLS", y);
            var order = SkillOrdering.ByCooldownDesc(specials.ConvertAll(entry => (float)entry.Facts.Delivery.cooldown));
            foreach (int index in order) y = Card(content, specials[index], monsterName, entries, y);
        }

        var basic = skills.Find(entry => entry.Facts.Delivery.skill_index == 0);
        if (basic.Facts != null)
        {
            y = Heading(content, "BASIC ATTACK", y + 2f);
            y = OneLine(content, basic, monsterName, entries, y);
        }

        var passives = skills.FindAll(entry => entry.Facts.Delivery.skill_index > 0 && !entry.Facts.IsSpecial);
        if (passives.Count > 0)
        {
            y = Heading(content, "PASSIVE SKILLS", y + 2f);
            foreach (var passive in passives) y = OneLine(content, passive, monsterName, entries, y);
        }

        window.SetContentHeight(y + 8f);
    }

    private struct Entry
    {
        public MonsterSkillFacts Facts;
        public ScriptableSkill Skill;
        public string Name;
    }

    private static List<Entry> Read(Monster monster)
    {
        var entries = new List<Entry>();
        var skills = monster.skills;
        var templates = skills != null ? skills.skillTemplates : null;
        if (templates == null) return entries;

        for (int index = 0; index < templates.Length; index++)
        {
            var skill = templates[index];
            if (skill == null) continue;
            int level = skills.skills != null && index < skills.skills.Count ? skills.skills[index].level : skill.learnDefault ? 1 : 0;
            try
            {
                entries.Add(new Entry
                {
                    Facts = SkillEffectExtractor.From(skill, monster.combat.damage, monster.combat.magicDamage, level, index),
                    Skill = skill,
                    Name = GameText.SkillName(skill),
                });
            }
            catch (Exception exception)
            {
                Log.Warning($"Skills window left out '{skill.name}' of '{monster.name}': {exception.Message}");
            }
        }

        return entries;
    }

    private static float Heading(Transform parent, string text, float y)
    {
        y += 6f;
        var label = Text(parent, text, 12.5f, Gold, Pad, y, Inner, 18f, wrap: false);
        label.Text.characterSpacing = 10f;
        return y + 24f;
    }

    private static float DamageRow(Transform parent, MonsterSkillSummary summary, float y)
    {
        if (summary.DamageTypes.Count == 0) return y;

        Text(parent, "Damage", 15f, Muted, Pad, y, LabelColumn, 24f, wrap: false);
        float x = Pad + LabelColumn;
        foreach (var damage in summary.DamageTypes)
        {
            if (ResistIcons.TryGetValue(damage.Key, out var icon))
            {
                var image = HudFactory.Icon("icon", parent, Sprite(icon));
                HudFactory.TopLeft(image, x, y + 1f, 22f, 22f);
                x += 26f;
            }

            var value = Text(parent, damage.Key + " " + SkillText.Number(damage.Value), 15.5f, White, x, y, 200f, 24f, wrap: false);
            x += Mathf.Ceil(value.PreferredWidth) + 18f;
        }

        return y + 28f;
    }

    private static float TextRow(Transform parent, string label, string text, float y)
    {
        Text(parent, label, 15f, Muted, Pad, y, LabelColumn, 24f, wrap: false);
        var value = Text(parent, text, 15f, White, Pad + LabelColumn, y + 1f, Inner - LabelColumn, 24f, wrap: true);
        return y + Mathf.Max(28f, value.Rect.sizeDelta.y + 6f);
    }

    private static float Rule(Transform parent, float y)
    {
        y += 4f;
        HudFactory.TopLeft(HudFactory.Box("rule", parent, Line), Pad, y, Inner, 1f);
        return y + 10f;
    }

    private static float Note(Transform parent, string text, float y)
    {
        var label = Text(parent, text, 14.5f, Muted, Pad, y, Inner, 22f, wrap: true);
        return y + label.Rect.sizeDelta.y + 10f;
    }

    private static float Card(Transform parent, Entry entry, string monsterName, List<Selectable> entries, float y)
    {
        float top = y;
        var background = HudFactory.Sliced("card", parent, Sprite("tooltip2"), CardTint);
        AddDetails(background, entry, monsterName, entries);

        var slot = HudFactory.Sliced("slot", parent, Sprite("frame_slot_skillbar"), Color.white);
        HudFactory.TopLeft(slot, Pad + 10f, top + 12f, 52f, 52f);
        HudFactory.TopLeft(HudFactory.Icon("icon", parent, entry.Skill.image), Pad + 15f, top + 17f, 42f, 42f);

        var timing = Text(parent, Timing(entry.Facts), 13.7f, Muted, Pad + 74f, top + 10f, Inner - 86f, 22f, wrap: false);
        timing.Text.alignment = Il2CppTMPro.TextAlignmentOptions.Right;
        float timingWidth = Mathf.Ceil(timing.PreferredWidth);
        float nameWidth = Mathf.Max(60f, Inner - 86f - timingWidth - 12f);
        var name = Text(parent, entry.Name, 16f, White, Pad + 74f, top + 8f, nameWidth, 24f, wrap: false, bold: true);
        float sentenceTop = top + 34f;
        if (name.PreferredWidth > nameWidth)
        {
            // A long name such as "North Guardian Offhand Attack" takes a second line.
            name.Text.enableWordWrapping = true;
            name.Text.overflowMode = Il2CppTMPro.TextOverflowModes.Overflow;
            name.Text.alignment = Il2CppTMPro.TextAlignmentOptions.TopLeft;
            name.LocalizedValue = Wrapping.KeepLastWordsTogether(entry.Name);
            float nameHeight = Mathf.Ceil(name.Text.GetPreferredValues(name.Text.text, nameWidth, 0f).y);
            HudFactory.TopLeft(name.Rect, Pad + 74f, top + 10f, nameWidth, nameHeight);
            sentenceTop = top + 14f + nameHeight;
        }

        var sentence = Text(parent, SkillCardText.Sentence(entry.Facts, monsterName), 14f, Body, Pad + 74f, sentenceTop, Inner - 86f, 20f, wrap: true);
        float height = Mathf.Max(76f, sentenceTop - top + sentence.Rect.sizeDelta.y + 12f);
        HudFactory.TopLeft(background, Pad, top, Inner, height);
        background.transform.SetAsFirstSibling();
        return y + height + 6f;
    }

    private static float OneLine(Transform parent, Entry entry, string monsterName, List<Selectable> entries, float y)
    {
        var hit = HudFactory.Box("line", parent, Color.clear);
        AddDetails(hit, entry, monsterName, entries);
        var slot = HudFactory.Sliced("slot", parent, Sprite("frame_slot_skillbar"), Color.white);
        HudFactory.TopLeft(slot, Pad, y, 34f, 34f);
        HudFactory.TopLeft(HudFactory.Icon("icon", parent, entry.Skill.image), Pad + 4f, y + 4f, 26f, 26f);
        var text = Text(parent, SkillCardText.Line(entry.Facts, KeepTogether(entry.Name), monsterName), 14f, Body, Pad + 44f, y + 1f, Inner - 44f, 34f, wrap: true);
        float height = Mathf.Max(40f, text.Rect.sizeDelta.y + 8f);
        HudFactory.TopLeft(hit, Pad, y, Inner, height - 4f);
        return y + height;
    }

    private static string KeepTogether(string name) => "<nobr>" + name + "</nobr>";

    // Written like the game's own skill tooltips: "1.2s cast    50s cooldown".
    private static string Timing(MonsterSkillFacts facts)
    {
        string cast = facts.Delivery.cast_time > 0
            ? Utils.PrettySeconds((float)facts.Delivery.cast_time) + " cast"
            : "Instant cast";
        return cast + "    " + Utils.PrettySeconds((float)facts.Delivery.cooldown) + " cooldown";
    }

    // The full mechanics show on hover, and on gamepad focus through GamepadLootNavigation.
    private static void AddDetails(Image target, Entry entry, string monsterName, List<Selectable> entries)
    {
        target.raycastTarget = true;
        var tooltip = target.gameObject.AddComponent<UIShowToolTip>();
        tooltip.enabled = true;
        tooltip.text = Wrapping.KeepLastWordsTogether(SkillCardDetails.Hover(entry.Facts, entry.Name, monsterName));

        var selectable = target.gameObject.AddComponent<Selectable>();
        selectable.transition = Selectable.Transition.None;
        var navigation = new Navigation();
        navigation.mode = Navigation.Mode.Explicit;
        selectable.navigation = navigation;
        entries.Add(selectable);
    }

    private static Label Text(Transform parent, string text, float size, Color color, float x, float y, float width, float height, bool wrap, bool bold = false)
    {
        var label = HudFactory.Label("text", parent, size, color, Align.Left, bold);
        HudFactory.TopLeft(label.Rect, x, y, width, height);
        if (wrap)
        {
            text = Wrapping.KeepLastWordsTogether(text);
            label.Text.enableWordWrapping = true;
            label.Text.overflowMode = Il2CppTMPro.TextOverflowModes.Overflow;
            label.Text.alignment = Il2CppTMPro.TextAlignmentOptions.TopLeft;
        }

        label.LocalizedValue = text;
        if (wrap)
        {
            float needed = label.Text.GetPreferredValues(text, width, 0f).y;
            HudFactory.TopLeft(label.Rect, x, y, width, Mathf.Max(height, Mathf.Ceil(needed)));
        }

        return label;
    }

    private static Sprite Sprite(string name)
    {
        if (_sprites == null)
        {
            _sprites = new Dictionary<string, Sprite>(StringComparer.Ordinal);
            foreach (var sprite in Resources.FindObjectsOfTypeAll<Sprite>())
            {
                if (sprite != null && !_sprites.ContainsKey(sprite.name))
                    _sprites[sprite.name] = sprite;
            }
        }

        return _sprites.TryGetValue(name, out var found) ? found : null;
    }
}
