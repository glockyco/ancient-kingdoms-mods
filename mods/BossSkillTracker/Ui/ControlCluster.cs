using Il2Cpp;
using BossSkillTracker.Model;
using UnityEngine;
using UnityEngine.UI;

namespace BossSkillTracker.Ui;

public sealed class ControlCluster
{
    public readonly RectTransform CompactRect;
    public readonly RectTransform LockRect;

    private readonly GameObject _compactCollapse;
    private readonly GameObject _compactExpand;
    private readonly GameObject _lockOpen;
    private readonly GameObject _lockClosed;

    private readonly UIShowToolTip _compactTooltip;
    private readonly UIShowToolTip _lockTooltip;

    public ControlCluster(Transform parent)
    {
        float size = Tuning.ControlIconSize;
        float gap = Tuning.ControlGap;
        float right = Tuning.Pad;
        float yMin = -(Tuning.HeaderHeight + size) * 0.5f;
        float yMax = -(Tuning.HeaderHeight - size) * 0.5f;

        var lockRoot = HudFactory.Rect("lock", parent);
        LockRect = HudFactory.Place(lockRoot.GetComponent<RectTransform>(), new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-size - right, yMin), new Vector2(-right, yMax));
        _lockTooltip = AddTooltip(lockRoot, string.Empty);
        _lockOpen = ControlIcon("lockOpen", lockRoot.transform, ControlSprites.LockOpen, Theme.Muted);
        _lockClosed = ControlIcon("lockClosed", lockRoot.transform, ControlSprites.LockClosed, Theme.Ready);
        var compactRoot = HudFactory.Rect("compact", parent);
        CompactRect = HudFactory.Place(compactRoot.GetComponent<RectTransform>(), new Vector2(1f, 1f), new Vector2(1f, 1f), new Vector2(-2f * size - gap - right, yMin), new Vector2(-size - gap - right, yMax));
        _compactTooltip = AddTooltip(compactRoot, string.Empty);
        _compactCollapse = ControlIcon("compactCollapse", compactRoot.transform, ControlSprites.Collapse, Theme.Muted);
        _compactExpand = ControlIcon("compactExpand", compactRoot.transform, ControlSprites.Expand, Theme.Muted);
    }

    public void BringToFront()
    {
        CompactRect.transform.SetAsLastSibling();
        LockRect.transform.SetAsLastSibling();
    }

    public void SetLocked(bool locked)
    {
        _lockOpen.SetActive(!locked);
        _lockClosed.SetActive(locked);
        _lockTooltip.text = locked ? "<b>Unlock panel</b>\nAllow dragging from the boss header." : "<b>Lock panel</b>\nPrevent accidental HUD dragging.";
    }

    public void SetCompact(bool compact)
    {
        _compactCollapse.SetActive(!compact);
        _compactExpand.SetActive(compact);
        _compactTooltip.text = compact ? "<b>Expand HUD</b>\nShow full rows and skill names." : "<b>Compact HUD</b>\nShrink rows and icons.";
    }

    private static UIShowToolTip AddTooltip(GameObject root, string text)
    {
        var hitbox = root.AddComponent<Image>();
        hitbox.sprite = Theme.White;
        hitbox.type = Image.Type.Simple;
        hitbox.color = Color.clear;
        hitbox.raycastTarget = true;

        var tooltip = root.AddComponent<UIShowToolTip>();
        tooltip.enabled = true;
        tooltip.text = text;
        return tooltip;
    }

    private static GameObject ControlIcon(string name, Transform parent, Sprite sprite, Color color)
    {
        var image = HudFactory.Icon(name, parent, sprite);
        image.color = color;
        HudFactory.Stretch(image, Vector2.zero, Vector2.zero);
        return image.gameObject;
    }
}
