using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BossList.Ui;

/// <summary>A zone's header: its name, a pin for a zone shown for its watched monsters, and a count.</summary>
internal sealed class GroupHeaderView
{
    public const float Height = 22f;

    private readonly Image _background;
    private readonly Image _line;
    private readonly Image _pin;
    private readonly Label _name;
    private readonly Label _count;

    public GroupHeaderView(Transform parent)
    {
        _background = HudFactory.Box("group", parent, Theme.GroupBg);
        Rect = _background.rectTransform;
        _line = HudFactory.Box("line", Rect, Theme.Line);
        _pin = HudFactory.Tinted("pin", Rect, Icons.Pin, Theme.Ready);
        _name = HudFactory.Label("zone", Rect, 10.5f, Theme.GroupTitle, Align.Left);
        _name.Text.characterSpacing = 14f;
        _count = HudFactory.Label("count", Rect, 11f, Theme.Dim, Align.Right);
    }

    public RectTransform Rect { get; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
    }

    public void Set(string zone, string count, bool pinned, float width)
    {
        HudFactory.TopLeft(_line, 0f, Height - 1f, width, 1f);
        float x = 10f;
        _pin.enabled = pinned;
        if (pinned)
        {
            HudFactory.TopLeft(_pin, x, (Height - 12f) / 2f, 12f, 12f);
            x += 18f;
        }

        _count.Value = count;
        float countWidth = Mathf.Ceil(_count.PreferredWidth) + 2f;
        HudFactory.TopLeft(_count.Rect, width - 10f - countWidth, 0f, countWidth, Height);

        // Uppercase suits Latin zone names. The game's own Chinese and Japanese names keep their form.
        _name.LocalizedValue = zone.ToUpperInvariant();
        HudFactory.TopLeft(_name.Rect, x, 0f, width - x - countWidth - 18f, Height);
    }
}

/// <summary>The line that stands for the monsters a group's filters hide.</summary>
internal sealed class MoreLineView
{
    public const float Height = 26f;
    private const float TextLeft = 50f;

    private readonly Image _line;
    private readonly Image _icon;
    private readonly Label _text;

    public MoreLineView(Transform parent)
    {
        Rect = HudFactory.Rect("more", parent).GetComponent<RectTransform>();
        _line = HudFactory.Box("line", Rect, Theme.RowLine);
        _icon = HudFactory.Tinted("icon", Rect, Icons.EyeOff, Theme.Dim);
        _text = HudFactory.Label("text", Rect, 12f, Theme.Dim, Align.Left);
    }

    public RectTransform Rect { get; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
    }

    public void Set(string text, float width)
    {
        HudFactory.TopLeft(_line, 0f, 0f, width, 1f);
        HudFactory.TopLeft(_icon, TextLeft - 20f, (Height - 13f) / 2f, 13f, 13f);
        _text.Value = text;
        HudFactory.TopLeft(_text.Rect, TextLeft, 0f, width - TextLeft - 10f, Height);
    }
}
