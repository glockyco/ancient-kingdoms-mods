using Il2Cpp;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BestiaryPages.Game;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.Fatecharms;

/// <summary>
/// Warns on the game's target frame while killing the target would use the Fatecharm in the main
/// inventory, in a socket like the level's beside it, and tints it red where the charm raises
/// none of the boss's drops.
/// </summary>
public sealed class FatecharmsFeature : Feature
{
    private const string SocketName = "PC_Fatecharm";
    private static readonly Color NoGain = new(1f, 0.45f, 0.35f, 1f);

    private GameObject _socket;
    private Image _socketImage;
    private Image _icon;
    private HoverText _tooltip;
    private string _shownFor;

    public FatecharmsFeature()
        : base("Fatecharms", "Fatecharms", "Shows the dungeon's Fatecharm beside a boss's level while killing the boss would use the one in your main inventory. Hover over it to see what you gain.")
    {
    }

    protected internal override void Enable() => _shownFor = null;

    protected internal override void Disable()
    {
        if (_socket != null) _socket.SetActive(false);
        _shownFor = null;
    }

    protected internal override void Update()
    {
        var frame = UITarget.singleton;
        var player = Player.localPlayer;
        if (frame == null || frame.panel == null || player == null) return;

        var monster = player.target != null ? player.target.TryCast<Monster>() : null;
        var charm = WarnedCharm(player, monster);
        if (charm == null || !frame.panel.activeInHierarchy)
        {
            if (_socket != null && _socket.activeSelf) _socket.SetActive(false);
            _shownFor = null;
            return;
        }

        string key = monster.netId + "|" + charm.nameItem + "|" + EntityNameLocalization.LocaleCode;
        if (key == _shownFor && _socket != null && _socket.activeSelf) return;

        EnsureSocket(frame);
        bool raises = Fatecharm.RaisesAny(monster);
        _icon.sprite = charm.image;
        _icon.enabled = true;
        _socketImage.color = raises ? Color.white : NoGain;
        _tooltip.Text = Wrapping.KeepLastWordsTogether(Explanation(monster, charm, raises));
        _socket.SetActive(true);
        _shownFor = key;
    }

    // Source: Monster.cs:3062-3076. A living boss in a dungeon uses the zone's Fatecharm.
    private static ScriptableItem WarnedCharm(Player player, Monster monster)
    {
        if (monster == null || !monster.isBoss || monster.health.current <= 0 || monster.idZone <= 0) return null;
        if (ZoneInfo.zones == null || !ZoneInfo.zones.ContainsKey(monster.idZone) || !ZoneInfo.zones[monster.idZone].isDungeon) return null;
        var charm = Fatecharm.ForZone(monster.idZone);
        return Fatecharm.Carries(player, charm) ? charm : null;
    }

    private static string Explanation(Monster monster, ScriptableItem charm, bool raises)
    {
        string name = charm.LocalizedName();
        string body = raises
            ? "Killing " + GameText.MonsterName(monster) + " uses the " + name + " in your main inventory, and the corpse holds one more piece of equipment."
            : "Killing this boss uses the " + name + " in your main inventory, but it raises none of the drops.";
        return "<b>" + name + "</b>\n" + body + "\nMove it to your backpack to keep it.";
    }

    // A copy of the frame's level socket, beside it on the left.
    private void EnsureSocket(UITarget frame)
    {
        if (_socket != null) return;

        var level = frame.Level.transform.parent;
        var levelRect = level.GetComponent<RectTransform>();
        var levelImage = level.GetComponent<Image>();

        _socket = HudFactory.Rect(SocketName, frame.panel.transform);
        var rect = _socket.GetComponent<RectTransform>();
        rect.anchorMin = levelRect.anchorMin;
        rect.anchorMax = levelRect.anchorMax;
        rect.pivot = levelRect.pivot;
        rect.sizeDelta = levelRect.sizeDelta;
        rect.anchoredPosition = levelRect.anchoredPosition + new Vector2(-44f, 0f);

        _socketImage = _socket.AddComponent<Image>();
        _socketImage.sprite = levelImage.sprite;
        _socketImage.type = levelImage.type;
        _socketImage.raycastTarget = true;

        _icon = HudFactory.Icon("charm", _socket.transform, null);
        _icon.raycastTarget = false;
        var iconRect = _icon.rectTransform;
        iconRect.anchorMin = iconRect.anchorMax = new Vector2(0.5f, 0.5f);
        iconRect.sizeDelta = new Vector2(24f, 24f);
        iconRect.anchoredPosition = Vector2.zero;

        // The socket sits on the game's target frame, so its hover uses the game's tooltip.
        _tooltip = new HoverText(rect) { Look = TooltipLook.Game };
    }
}
