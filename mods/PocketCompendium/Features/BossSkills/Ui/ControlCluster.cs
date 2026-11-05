using Il2Cpp;
using PocketCompendium.Core.Text;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossSkills.Model;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Features.BossSkills.Ui;

/// <summary>The settings, compact and lock controls at the top right of the skill panel.</summary>
public sealed class ControlCluster
{
    public readonly RectTransform SettingsRect;
    public readonly RectTransform CompactRect;
    public readonly RectTransform LockRect;

    private readonly GameObject _compactCollapse;
    private readonly GameObject _compactExpand;
    private readonly GameObject _lockOpen;
    private readonly GameObject _lockClosed;

    private readonly HoverText _compactTooltip;
    private readonly HoverText _lockTooltip;

    public ControlCluster(Transform parent)
    {
        float size = Tuning.ControlIconSize;
        float gap = Tuning.ControlGap;
        float right = Tuning.Pad;

        LockRect = Slot("lock", parent, 0, size, gap, right);
        _lockTooltip = AddTooltip(LockRect.gameObject, string.Empty);
        _lockOpen = ControlIcon("lockOpen", LockRect, Icons.LockOpen, Theme.Muted);
        _lockClosed = ControlIcon("lockClosed", LockRect, Icons.Lock, Theme.Ready);

        CompactRect = Slot("compact", parent, 1, size, gap, right);
        _compactTooltip = AddTooltip(CompactRect.gameObject, string.Empty);
        _compactCollapse = ControlIcon("compactCollapse", CompactRect, Icons.ChevronsDownUp, Theme.Muted);
        _compactExpand = ControlIcon("compactExpand", CompactRect, Icons.ChevronsUpDown, Theme.Muted);

        SettingsRect = Slot("settings", parent, 2, size, gap, right);
        AddTooltip(SettingsRect.gameObject, "<b>Settings</b>\n" + ModText.Name + "'s settings, on the Boss skills page.");
        ControlIcon("settingsIcon", SettingsRect, Icons.Sliders, Theme.Muted);
    }

    public void BringToFront()
    {
        SettingsRect.SetAsLastSibling();
        CompactRect.SetAsLastSibling();
        LockRect.SetAsLastSibling();
    }

    public void SetLocked(bool locked, bool lockedByLayout)
    {
        _lockOpen.SetActive(!locked);
        _lockClosed.SetActive(locked);
        _lockTooltip.Text = lockedByLayout
            ? "<b>Panels locked</b>\nEvery panel is locked. Click to open the Layout settings."
            : locked
                ? "<b>Unlock panel</b>\nAllow dragging from the header and resizing from the corner."
                : "<b>Lock panel</b>\nPrevent dragging and resizing.";
    }

    public void SetCompact(bool compact)
    {
        _compactCollapse.SetActive(!compact);
        _compactExpand.SetActive(compact);
        _compactTooltip.Text = compact ? "<b>Full rows</b>\nShow skill names and larger icons." : "<b>Compact rows</b>\nSmaller rows and icons.";
    }

    // Slot 0 is the rightmost control, each further slot sits one control to the left.
    private static RectTransform Slot(string name, Transform parent, int slot, float size, float gap, float right)
    {
        float yMin = -(Tuning.HeaderHeight + size) * 0.5f;
        float yMax = -(Tuning.HeaderHeight - size) * 0.5f;
        float xMax = -right - slot * (size + gap);
        var root = HudFactory.Rect(name, parent);
        return HudFactory.Place(root.GetComponent<RectTransform>(), new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(xMax - size, yMin), new Vector2(xMax, yMax));
    }

    private static HoverText AddTooltip(GameObject root, string text)
    {
        // The hitbox lets the pointer test find the control above the panel behind it.
        var hitbox = root.AddComponent<Image>();
        hitbox.sprite = Theme.White;
        hitbox.type = Image.Type.Simple;
        hitbox.color = Color.clear;
        hitbox.raycastTarget = true;

        return new HoverText(root.GetComponent<RectTransform>()) { Text = text };
    }

    private static GameObject ControlIcon(string name, Transform parent, Sprite sprite, Color color)
    {
        var image = HudFactory.Icon(name, parent, sprite);
        image.color = color;
        HudFactory.Stretch(image, Vector2.zero, Vector2.zero);
        return image.gameObject;
    }
}
