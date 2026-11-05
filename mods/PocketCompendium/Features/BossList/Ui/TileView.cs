using Il2Cpp;
using Il2CppTMPro;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Tracking;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BossList.Ui;

/// <summary>One monster in the compact style: its portrait with the state's icon and time on it.</summary>
internal sealed class TileView
{
    public const float Size = 44f;

    private static readonly Color UnknownCaption = new(0.725f, 0.761f, 0.800f, 1f);
    private static readonly Color CaptionShade = new(0f, 0f, 0f, 0.85f);

    private readonly PortraitView _portrait;
    private readonly Image _icon;
    private readonly Label _caption;
    private readonly Image _hover;
    private readonly HoverText _tooltip;

    public TileView(Transform parent)
    {
        _portrait = new PortraitView(parent, Size, 2f);
        Rect = _portrait.Rect;
        var hit = Rect.GetComponent<Image>();
        hit.raycastTarget = true;
        _tooltip = new HoverText(Rect);

        // A shade under the caption keeps a gold "Up" readable on light portraits.
        var shade = HudFactory.Box("shade", Rect, CaptionShade);
        shade.sprite = Shapes.Shade;
        HudFactory.Place(shade.rectTransform, Vector2.zero, new Vector2(1f, 0.6f), new Vector2(2f, 2f), new Vector2(-2f, 0f));

        _hover = HudFactory.Box("hover", Rect, new Color(1f, 1f, 1f, 0.12f));
        HudFactory.Stretch(_hover, new Vector2(2f, 2f), new Vector2(-2f, -2f));

        _icon = HudFactory.Tinted("icon", Rect, null, Color.white);
        _icon.rectTransform.anchorMin = _icon.rectTransform.anchorMax = new Vector2(0.5f, 1f);
        _icon.rectTransform.pivot = new Vector2(0.5f, 1f);
        _icon.rectTransform.sizeDelta = new Vector2(16f, 16f);
        _icon.rectTransform.anchoredPosition = new Vector2(0f, -6f);
        var shadow = _icon.gameObject.AddComponent<Shadow>();
        shadow.effectColor = new Color(0f, 0f, 0f, 0.9f);
        shadow.effectDistance = new Vector2(1f, -1f);

        _caption = HudFactory.Label("caption", Rect, 12f, Color.white, Align.Center, bold: true, monospaced: true);
        _caption.Text.extraPadding = true;
        _caption.Text.outlineWidth = 0.28f;
        _caption.Text.outlineColor = new Color32(0, 0, 0, 255);
        HudFactory.Place(_caption.Rect, new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(-3f, -2f), new Vector2(3f, 17f));
    }

    public RectTransform Rect { get; }
    public TrackedMonster Monster { get; private set; }

    public void SetActive(bool active)
    {
        if (Rect.gameObject.activeSelf != active) Rect.gameObject.SetActive(active);
        if (!active) Monster = null;
    }

    public void Set(in RowData data, bool watched)
    {
        Monster = data.Monster;
        var monster = data.Monster;
        var state = monster.State;
        // A tile keeps the portrait as it is: the time on it says the monster is dead.
        _portrait.Set(GameAccess.Portrait(monster.Definition), GameAccess.TierColor(monster.Tier), dimmed: false,
            watched, data.Silhouette);

        // The icon names states whose caption is not a time. Countdowns need none.
        var look = StateLook.Of(state, monster.Rules.NightWindow, monster.AltarItem != null ? monster.AltarItem.image : null);
        bool icon = look.Icon != null && state.State is not (SpawnState.InCombat or SpawnState.Seen);
        _icon.enabled = icon;
        if (icon)
        {
            _icon.sprite = look.Icon;
            _icon.color = state.State == SpawnState.Window && monster.Rules.NightWindow ? Theme.Night : Color.white;
        }

        _caption.Value = StateText.Caption(state, data.Now);
        _caption.Color = state.IsUp ? Theme.Ready
            : state.State == SpawnState.Window && monster.Rules.NightWindow ? Theme.Night
            : state.State is SpawnState.NotSeen or SpawnState.Seen ? UnknownCaption
            : Color.white;
    }

    public void SetTooltip(string text)
    {
        _tooltip.Text = text;
    }

    public bool UpdateHover()
    {
        bool hovered = Pointer.Over(Rect);
        _hover.enabled = hovered;
        return hovered;
    }
}
