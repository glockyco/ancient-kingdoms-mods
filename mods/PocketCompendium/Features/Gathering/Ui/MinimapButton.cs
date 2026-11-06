using Il2Cpp;
using PocketCompendium.Core.Ui;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.Gathering.Ui;

/// <summary>
/// A round button on the minimap's free lower left that shows and hides the Gathering list. It is a
/// copy of the minimap's help button, so it has the game's frame and press look.
/// </summary>
internal sealed class MinimapButton
{
    private GameObject _root;
    private RectTransform _rect;
    private Image _icon;
    private HoverText _tooltip;

    public bool Exists => _root != null;

    /// <summary>Creates the button when the minimap exists. Returns whether it exists.</summary>
    public bool Ensure()
    {
        if (_root != null) return true;
        var map = UIMap.singleton;
        if (map == null || map.panelMinimap == null) return false;
        var minimap = map.panelMinimap.transform;
        var help = minimap.Find("Help");
        var players = minimap.Find("IconPlayersOnline");
        var circle = minimap.Find("Minimap Circle");
        if (help == null || players == null || circle == null) return false;

        _root = Object.Instantiate(help.gameObject, help.parent);
        _root.name = "PC_GatheringButton";
        // The copy would open the game's help, so it gets a click event of its own, which stays empty.
        var button = _root.GetComponent<Button>();
        if (button != null) button.onClick = new Button.ButtonClickedEvent();
        // The copy would also show the game's "Help" tooltip over the mod's own.
        var gameTooltip = _root.GetComponent<UIShowToolTip>();
        if (gameTooltip != null) Object.DestroyImmediate(gameTooltip);
        _rect = _root.GetComponent<RectTransform>();
        // Mirrored from the players-online button across the minimap's middle.
        var position = players.position;
        _rect.position = new Vector3(2f * circle.position.x - position.x, position.y, position.z);

        var iconTransform = _root.transform.Find("HelpIcon");
        _icon = iconTransform != null ? iconTransform.GetComponent<Image>() : null;
        if (_icon != null)
        {
            _icon.sprite = Icons.Leaf;
            _icon.rectTransform.sizeDelta = new Vector2(24f, 24f);
        }

        _tooltip = new HoverText(_rect) { Look = TooltipLook.Game };
        return true;
    }

    /// <summary>Shows whether the list is open and reports a click.</summary>
    public bool Update(bool open)
    {
        if (_root == null) return false;
        if (_icon != null) _icon.color = open ? Theme.Golden : Color.white;
        _tooltip.Text = open ? "<b>Gathering</b>\nHide the list of herbs, ores, fish and sparks." : "<b>Gathering</b>\nShow the list of herbs, ores, fish and sparks.";
        return Pointer.Clicked(_rect);
    }

    public void Destroy()
    {
        if (_root != null) Object.Destroy(_root);
        Forget();
    }

    /// <summary>Forgets the button after the game destroyed its interface.</summary>
    public void Forget()
    {
        _root = null;
        _rect = null;
        _icon = null;
        _tooltip = null;
    }
}
