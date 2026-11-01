using System;
using System.Collections.Generic;
using MelonLoader;
using PocketCompendium.Core.Settings;
using UnityEngine;
using UnityEngine.UI;

namespace PocketCompendium.Core.Ui;

/// <summary>How dragging a panel's corner grip changes it.</summary>
public enum PanelResize
{
    /// <summary>The grip sets the panel's width and its maximum height. Its content lays out to fit.</summary>
    Size,

    /// <summary>The grip scales the whole panel, for content with a fixed layout.</summary>
    Scale,
}

/// <summary>
/// Places one movable panel on the panel layer and keeps it on screen. Its owner fills
/// <see cref="Rect"/>, names the rects that drag it, and calls <see cref="Update"/> after
/// handling its own buttons. Position, size and lock are saved on the owner's settings page.
/// </summary>
public sealed class PanelHost
{
    private const float GripSize = 12f;
    private const float EdgeMargin = 4f;
    private const float VisibleHeader = 40f;
    private const float MinScale = 0.6f;
    private const float MaxScale = 2f;

    // Every host, created or not, so a reset reaches panels whose feature is off.
    private static readonly List<PanelHost> Hosts = new();

    private readonly SettingsPage _page;
    private readonly MelonPreferences_Entry<float> _x;
    private readonly MelonPreferences_Entry<float> _y;
    private readonly MelonPreferences_Entry<float> _width;
    private readonly MelonPreferences_Entry<float> _height;
    private readonly MelonPreferences_Entry<float> _scale;
    private readonly MelonPreferences_Entry<bool> _locked;
    private readonly Vector2 _defaultPosition;
    private readonly Vector2 _defaultSize;
    private readonly Vector2 _minSize;
    private readonly Vector2 _maxSize;

    private GameObject _root;
    private Image _grip;
    private Mode _mode;
    private Vector2 _grab;
    private Vector2 _startSize;
    private float _startScale;

    private enum Mode
    {
        Idle,
        Dragging,
        Resizing,
    }

    /// <param name="defaultPosition">Top-left corner relative to the screen centre, in canvas units.</param>
    /// <param name="defaultSize">Width and maximum height for <see cref="PanelResize.Size"/>. Ignored for <see cref="PanelResize.Scale"/>.</param>
    public PanelHost(SettingsPage page, string name, PanelResize resize, Vector2 defaultPosition, Vector2 defaultSize, Vector2 minSize, Vector2 maxSize)
    {
        _page = page;
        Name = name;
        Resize = resize;
        _defaultPosition = defaultPosition;
        _defaultSize = defaultSize;
        _minSize = minSize;
        _maxSize = maxSize;
        _x = page.Stored(name + "X", defaultPosition.x);
        _y = page.Stored(name + "Y", defaultPosition.y);
        _width = page.Stored(name + "Width", defaultSize.x);
        _height = page.Stored(name + "Height", defaultSize.y);
        _scale = page.Stored(name + "Scale", 1f);
        _locked = page.Stored(name + "Locked", false);
        Hosts.Add(this);
    }

    /// <summary>Locks every panel. Set from the Layout settings page.</summary>
    public static Func<bool> LockAll { get; set; } = () => false;

    public string Name { get; }
    public PanelResize Resize { get; }

    /// <summary>The panel's root, with a top-left pivot. Its owner adds content and sets its height.</summary>
    public RectTransform Rect { get; private set; }

    public bool Exists => _root != null;

    /// <summary>Whether the player locked this panel. <see cref="LockAll"/> also locks it.</summary>
    public bool Locked
    {
        get => _locked.Value;
        set
        {
            if (_locked.Value == value) return;
            _locked.Value = value;
            _page.Save();
        }
    }

    public bool EffectivelyLocked => _locked.Value || LockAll();

    /// <summary>The width a <see cref="PanelResize.Size"/> panel lays out to.</summary>
    public float Width => Mathf.Clamp(_width.Value, _minSize.x, _maxSize.x);

    /// <summary>The height beyond which a <see cref="PanelResize.Size"/> panel scrolls its content.</summary>
    public float MaxHeight => Mathf.Clamp(_height.Value, _minSize.y, _maxSize.y);

    public bool Moving => _mode != Mode.Idle;

    public void Create()
    {
        if (_root != null) return;

        _root = HudFactory.Rect("PC_" + _page.Id + Name, Overlay.Panels);
        Rect = _root.GetComponent<RectTransform>();
        Rect.anchorMin = new Vector2(0.5f, 0.5f);
        Rect.anchorMax = new Vector2(0.5f, 0.5f);
        Rect.pivot = new Vector2(0f, 1f);
        Rect.anchoredPosition = new Vector2(_x.Value, _y.Value);
        Rect.sizeDelta = new Vector2(Resize == PanelResize.Size ? Width : 0f, 0f);
        Rect.localScale = Vector3.one * (Resize == PanelResize.Scale ? Mathf.Clamp(_scale.Value, MinScale, MaxScale) : 1f);

        _grip = HudFactory.Tinted("grip", _root.transform, Shapes.Triangle, Theme.Dim);
        var gripRect = _grip.rectTransform;
        gripRect.anchorMin = new Vector2(1f, 0f);
        gripRect.anchorMax = new Vector2(1f, 0f);
        gripRect.pivot = new Vector2(0.5f, 0.5f);
        gripRect.sizeDelta = new Vector2(GripSize, GripSize);
        gripRect.anchoredPosition = new Vector2(-GripSize * 0.5f - 1f, GripSize * 0.5f + 1f);
        gripRect.localRotation = Quaternion.Euler(0f, 0f, -135f);
        _grip.raycastTarget = true;
        _grip.gameObject.SetActive(false);
    }

    public void SetVisible(bool visible)
    {
        if (_root != null && _root.activeSelf != visible) _root.SetActive(visible);
        if (!visible) _mode = Mode.Idle;
    }

    /// <summary>Sets the panel's content height.</summary>
    public void SetHeight(float height)
    {
        if (Rect == null) return;
        float width = Resize == PanelResize.Size ? Width : Rect.sizeDelta.x;
        Rect.sizeDelta = new Vector2(width, height);
    }

    /// <summary>
    /// Sets a <see cref="PanelResize.Size"/> panel's size when its content needs less than
    /// <see cref="Width"/>, such as a short row of tiles. The grip then sits at the content's corner.
    /// </summary>
    public void SetFittedSize(float width, float height)
    {
        if (Rect == null) return;
        Rect.sizeDelta = new Vector2(Mathf.Min(width, Width), height);
    }

    /// <summary>Sets the width of a <see cref="PanelResize.Scale"/> panel, whose content decides it.</summary>
    public void SetContentWidth(float width)
    {
        if (Rect == null || Resize != PanelResize.Scale) return;
        Rect.sizeDelta = new Vector2(width, Rect.sizeDelta.y);
    }

    /// <summary>
    /// Shows the grip while the pointer is over the panel and starts a resize when it is pressed.
    /// Call before the owner handles its own clicks, because the grip sits over the content's
    /// bottom-right corner and a row there would otherwise take the press.
    /// </summary>
    public void UpdateGrip()
    {
        if (_root == null || !_root.activeInHierarchy) return;

        bool locked = EffectivelyLocked;
        bool showGrip = !locked && (_mode == Mode.Resizing || Pointer.Over(Rect));
        if (_grip.gameObject.activeSelf != showGrip)
        {
            _grip.gameObject.SetActive(showGrip);
            // The owner adds its content after the grip, so the grip comes back on top when shown.
            if (showGrip) _grip.transform.SetAsLastSibling();
        }

        if (_mode == Mode.Idle && showGrip && Pointer.Pressed && Pointer.Over(_grip.rectTransform))
        {
            Pointer.Claim();
            _mode = Mode.Resizing;
            _grab = Pointer.Position;
            // A Size panel can show less than its stored size, such as a short list or a few
            // tiles, so the drag starts from what the player sees and the edge follows the pointer.
            _startSize = Resize == PanelResize.Size ? Rect.sizeDelta : new Vector2(Width, MaxHeight);
            _startScale = Rect.localScale.x;
        }
    }

    /// <summary>
    /// Moves or resizes the panel from the pointer. Call after handling the panel's own buttons, so
    /// a press they claimed does not start a drag.
    /// </summary>
    public void Update(IReadOnlyList<RectTransform> dragHandles)
    {
        if (_root == null || !_root.activeInHierarchy) return;

        if (_mode == Mode.Idle && !EffectivelyLocked && Pointer.Pressed)
            StartDrag(dragHandles);

        if (_mode == Mode.Dragging && Pointer.Held)
        {
            Rect.anchoredPosition += (Pointer.Position - _grab) / Overlay.PanelScale;
            _grab = Pointer.Position;
        }
        else if (_mode == Mode.Resizing && Pointer.Held)
        {
            ResizeTo((Pointer.Position - _grab) / Overlay.PanelScale);
        }

        if (_mode != Mode.Idle && !Pointer.Held)
        {
            _mode = Mode.Idle;
            KeepOnScreen();
            Save();
            return;
        }

        if (_mode == Mode.Idle) KeepOnScreen();
    }

    private void StartDrag(IReadOnlyList<RectTransform> dragHandles)
    {
        foreach (var handle in dragHandles)
        {
            if (!Pointer.Over(handle)) continue;
            Pointer.Claim();
            _mode = Mode.Dragging;
            _grab = Pointer.Position;
            return;
        }
    }

    private void ResizeTo(Vector2 delta)
    {
        if (Resize == PanelResize.Size)
        {
            // The owner lays out to the new size, so the panel never shows a size its content
            // does not fill.
            _width.Value = Mathf.Clamp(_startSize.x + delta.x, _minSize.x, _maxSize.x);
            _height.Value = Mathf.Clamp(_startSize.y - delta.y, _minSize.y, _maxSize.y);
            return;
        }

        // The panel grows with the pointer's horizontal travel, relative to its own width.
        float baseWidth = Mathf.Max(1f, Rect.sizeDelta.x);
        float scale = Mathf.Clamp(_startScale + delta.x / baseWidth, MinScale, MaxScale);
        _scale.Value = scale;
        Rect.localScale = Vector3.one * scale;
    }

    /// <summary>Moves the panel back inside the screen, keeping at least its header visible.</summary>
    public void KeepOnScreen()
    {
        if (Rect == null) return;

        Vector2 canvas = Overlay.CanvasSize;
        float scale = Rect.localScale.x;
        Vector2 position = Rect.anchoredPosition;
        var kept = PanelPlacement.KeepVisible(
            position.x, position.y, canvas.x, canvas.y,
            Rect.sizeDelta.x * scale, Rect.sizeDelta.y * scale, VisibleHeader * scale, EdgeMargin);
        if (!Mathf.Approximately(kept.X, position.x) || !Mathf.Approximately(kept.Y, position.y))
            Rect.anchoredPosition = new Vector2(kept.X, kept.Y);
    }

    /// <summary>Removes the panel from the screen. Its saved place and size stay.</summary>
    public void Destroy()
    {
        if (_root != null) UnityEngine.Object.Destroy(_root);
        _root = null;
        Rect = null;
        _grip = null;
        _mode = Mode.Idle;
    }

    /// <summary>Returns every panel to its default place and size, and unlocks it.</summary>
    public static void ResetAll()
    {
        foreach (var host in Hosts) host.Reset();
    }

    private void Reset()
    {
        _x.Value = _defaultPosition.x;
        _y.Value = _defaultPosition.y;
        _width.Value = _defaultSize.x;
        _height.Value = _defaultSize.y;
        _scale.Value = 1f;
        _locked.Value = false;
        _page.Save();
        if (Rect == null) return;

        Rect.anchoredPosition = _defaultPosition;
        Rect.localScale = Vector3.one;
        if (Resize == PanelResize.Size) Rect.sizeDelta = new Vector2(Width, Rect.sizeDelta.y);
    }

    private void Save()
    {
        _x.Value = Rect.anchoredPosition.x;
        _y.Value = Rect.anchoredPosition.y;
        _page.Save();
    }
}
