using Il2Cpp;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossList.Model;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BossList.Ui;

/// <summary>What one row or tile shows for one monster.</summary>
internal struct RowData
{
    public TrackedMonster Monster;
    public ListEntry Entry;
    public bool Silhouette;

    /// <summary>Whether the row shows the distance and an arrow, for monsters in the player's zone.</summary>
    public bool ShowDistance;

    /// <summary>From the player to the spawn point or altar, in world units, which are yd.</summary>
    public Vector2 Offset;

    public double Now;
    public int PlayerLevel;
}

/// <summary>
/// One monster in the list: portrait, then name over level, then state over distance, then an
/// arrow to the spawn point. A chance spawn's chance and a day or night monster's hours follow
/// the level. The other rules, kill times and roll results stay in the tooltip.
/// </summary>
internal sealed class RowView
{
    public const float Height = 46f;
    private const float Pad = 9f;
    private const float PortraitSize = 32f;
    private const float ArrowSize = 20f;
    private const float TextLeft = Pad + PortraitSize + 9f;
    private const float IconSize = 14f;
    private const float IconGap = 5f;

    private static readonly Color ArrowBackground = new(1f, 1f, 1f, 0.05f);
    private static readonly Color ArrowRing = new(1f, 1f, 1f, 0.18f);
    private static readonly string NoteColour = "#" + ColorUtility.ToHtmlStringRGB(Theme.Muted);

    // A label shows nothing when its line is taller than its rect, because its overflow mode
    // truncates whole lines. These fit a 14 and a 12 point line of the game's font.
    private const float TopLine = 4f;
    private const float TopHeight = 21f;
    private const float BottomLine = 24f;
    private const float BottomHeight = 18f;

    private readonly Image _background;
    private readonly Image _hoverBar;
    private readonly Image _line;
    private readonly PortraitView _portrait;
    private readonly Label _name;
    private readonly Image _skull;
    private readonly Label _level;
    private readonly Image _valueIcon;
    private readonly Label _value;
    private readonly Label _distance;
    private readonly RectTransform _arrowCircle;
    private readonly RectTransform _arrow;
    private readonly HoverText _tooltip;
    private int _shownLevel = -1;
    private SpawnRules _shownRules;

    public RowView(Transform parent)
    {
        _background = HudFactory.Box("row", parent, Color.clear);
        _background.raycastTarget = true;
        Rect = _background.rectTransform;
        _tooltip = new HoverText(Rect);

        _line = HudFactory.Box("line", Rect, Theme.RowLine);
        _hoverBar = HudFactory.Box("hover", Rect, Theme.Gold);

        _portrait = new PortraitView(Rect, PortraitSize, 2f);
        HudFactory.TopLeft(_portrait.Rect, Pad, (Height - PortraitSize) / 2f, PortraitSize, PortraitSize);

        _name = HudFactory.Label("name", Rect, 14f, Theme.Text, Align.Left, bold: true);
        _skull = HudFactory.Tinted("skull", Rect, Icons.Skull, Theme.LevelRed);
        _level = HudFactory.Label("level", Rect, 12f, Theme.Muted, Align.Left);
        _valueIcon = HudFactory.Tinted("valueIcon", Rect, null, Theme.Muted);
        _value = HudFactory.Label("value", Rect, 14f, Theme.Text, Align.Right, monospaced: true);
        _distance = HudFactory.Label("distance", Rect, 12f, Theme.Muted, Align.Right, monospaced: true);

        var circle = HudFactory.Tinted("direction", Rect, Shapes.Disc, ArrowBackground);
        _arrowCircle = circle.rectTransform;
        var ring = HudFactory.Tinted("ring", _arrowCircle, Shapes.Ring, ArrowRing);
        HudFactory.Stretch(ring, Vector2.zero, Vector2.zero);
        var arrow = HudFactory.Tinted("arrow", _arrowCircle, Icons.Arrow, Theme.Text);
        _arrow = arrow.rectTransform;
        _arrow.sizeDelta = new Vector2(11f, 11f);
    }

    public RectTransform Rect { get; }
    public TrackedMonster Monster { get; private set; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
        if (!active) Monster = null;
    }

    public void Set(in RowData data, float width, bool first, bool watched)
    {
        Monster = data.Monster;
        var monster = data.Monster;
        var state = monster.State;
        float right = width - Pad;

        _line.enabled = !first;
        HudFactory.TopLeft(_line, 0f, 0f, width, 1f);
        HudFactory.TopLeft(_hoverBar, 0f, 0f, 2f, Height);

        var tier = GameAccess.TierColor(monster.Tier);
        // A row dims a dead monster in full, so the monsters a player can act on stand out.
        _portrait.Set(GameAccess.Portrait(monster.Definition), tier, !state.IsUp, watched, data.Silhouette);

        // The arrow column, then state over distance, then the name takes what is left.
        _arrowCircle.gameObject.SetActive(data.ShowDistance);
        if (data.ShowDistance)
        {
            HudFactory.TopLeft(_arrowCircle, right - ArrowSize, (Height - ArrowSize) / 2f, ArrowSize, ArrowSize);
            float angle = Mathf.Atan2(data.Offset.y, data.Offset.x) * Mathf.Rad2Deg - 90f;
            _arrow.localRotation = Quaternion.Euler(0f, 0f, angle);
            right -= ArrowSize + 9f;
        }

        var look = StateLook.Of(state, monster.Rules.NightWindow, monster.AltarItem != null ? monster.AltarItem.image : null);
        _value.Value = StateText.Value(state, data.Now);
        _value.Color = look.TextColor;
        _value.Text.fontStyle = look.Bold ? Il2CppTMPro.FontStyles.Bold : Il2CppTMPro.FontStyles.Normal;
        float valueWidth = Mathf.Ceil(_value.PreferredWidth) + 1f;
        HudFactory.TopLeft(_value.Rect, right - valueWidth, TopLine, valueWidth, TopHeight);
        float valueLeft = right - valueWidth;

        bool hasIcon = look.Icon != null;
        _valueIcon.enabled = hasIcon;
        if (hasIcon)
        {
            _valueIcon.sprite = look.Icon;
            _valueIcon.color = look.IconColor;
            valueLeft -= IconGap + IconSize;
            HudFactory.TopLeft(_valueIcon, valueLeft, TopLine + (TopHeight - IconSize) / 2f, IconSize, IconSize);
        }

        _distance.SetActive(data.ShowDistance);
        if (data.ShowDistance)
        {
            _distance.Value = Mathf.RoundToInt(data.Offset.magnitude) + " yd";
            HudFactory.TopLeft(_distance.Rect, valueLeft - 20f, BottomLine, right - valueLeft + 20f, BottomHeight);
        }

        float textWidth = Mathf.Max(20f, valueLeft - 8f - TextLeft);
        _name.Color = data.Silhouette ? Theme.Dim : Theme.Readable(tier);
        _name.LocalizedValue = data.Silhouette ? "???" : GameText.EntityName(monster.Key);
        HudFactory.TopLeft(_name.Rect, TextLeft, TopLine, textWidth, TopHeight);

        // Above +10 the game's target frame shows only a skull. The row keeps the level beside it.
        var band = LevelBands.Of(monster.Level, data.PlayerLevel);
        bool skull = band == LevelBand.Skull;
        _skull.enabled = skull;
        float levelLeft = TextLeft;
        if (skull)
        {
            HudFactory.TopLeft(_skull, TextLeft, BottomLine + (BottomHeight - 12f) / 2f - 1f, 12f, 12f);
            levelLeft += 15f;
        }

        // The text is rebuilt only when it changes, because rows update every frame. A monster's
        // rules never change, so they key the notes after its level.
        var rules = monster.Rules;
        if (monster.Level != _shownLevel || rules != _shownRules)
        {
            _shownLevel = monster.Level;
            _shownRules = rules;
            var text = new System.Text.StringBuilder("Lv ").Append(monster.Level);
            if (rules.Origin == SpawnOrigin.Placed && rules.ChancePercent is int percent)
                text.Append("  <color=").Append(NoteColour).Append(">·  ").Append(percent).Append("% chance</color>");
            if (rules.HasWindow)
                text.Append("  <color=").Append(NoteColour).Append(">·  ").Append(StateText.Hours(rules)).Append("</color>");
            _level.Value = text.ToString();
        }
        _level.Color = StateLook.LevelColor(band);
        HudFactory.TopLeft(_level.Rect, levelLeft, BottomLine, textWidth - (levelLeft - TextLeft), BottomHeight);
    }

    public void SetTooltip(string text)
    {
        _tooltip.Text = text;
    }

    /// <summary>Updates the hover look and reports whether the pointer is over the row.</summary>
    public bool UpdateHover()
    {
        bool hovered = Pointer.Over(Rect);
        _background.color = hovered ? Theme.Hover : Color.clear;
        _hoverBar.enabled = hovered;
        return hovered;
    }
}
