using System.Collections.Generic;
using BossSkillTracker.Game;
using BossSkillTracker.Model;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;

namespace BossSkillTracker.Ui;

public sealed class HudRoot
{
    private readonly Config _config;
    private readonly Dictionary<uint, GroupView> _groups = new();
    private readonly List<uint> _order = new();

    private GameObject _canvasGo;
    private Canvas _canvas;
    private RectTransform _panel;
    private ControlCluster _controls;
    private bool _dragging;
    private Vector2 _grab;

    public HudRoot(Config config)
    {
        _config = config;
    }

    private void EnsureCanvas()
    {
        if (_canvasGo != null) return;

        _canvasGo = new GameObject("BST_Canvas");
        UnityEngine.Object.DontDestroyOnLoad(_canvasGo);

        _canvas = _canvasGo.AddComponent<Canvas>();
        _canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        _canvas.pixelPerfect = true;
        _canvas.sortingOrder = Tuning.CanvasSortingOrder;
        _canvasGo.AddComponent<GraphicRaycaster>();

        var scaler = _canvasGo.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920f, 1080f);

        var panelGo = HudFactory.Rect("BST_Panel", _canvasGo.transform);
        _panel = panelGo.GetComponent<RectTransform>();
        _panel.anchorMin = new Vector2(0.5f, 0.5f);
        _panel.anchorMax = new Vector2(0.5f, 0.5f);
        _panel.pivot = new Vector2(0.5f, 0.5f);
        _panel.anchoredPosition = new Vector2(_config.PanelX.Value, _config.PanelY.Value);
        _panel.sizeDelta = new Vector2(Tuning.PanelWidth, 0f);

        _controls = new ControlCluster(_panel);
        _controls.SetLocked(_config.Locked.Value);
        _controls.SetCompact(_config.Compact.Value);
        _controls.BringToFront();
    }

    public void Reconcile(List<EnemyInfo> infos)
    {
        EnsureCanvas();

        var seen = new HashSet<uint>();
        foreach (var info in infos)
        {
            seen.Add(info.NetId);
            if (_groups.ContainsKey(info.NetId))
            {
                _groups[info.NetId].SetEngaged(info.Engaged);
                continue;
            }

            var group = new GroupView(_panel.transform, info);
            group.Layout(_config.Compact.Value);
            _groups[info.NetId] = group;
            _order.Add(info.NetId);
        }

        for (int index = _order.Count - 1; index >= 0; index--)
        {
            uint id = _order[index];
            if (seen.Contains(id)) continue;

            _groups[id].Destroy();
            _groups.Remove(id);
            _order.RemoveAt(index);
        }
    }

    public void RenderTick(double now)
    {
        if (_panel == null) return;

        bool compact = _config.Compact.Value;
        float y = 0f;
        foreach (uint id in _order)
        {
            var group = _groups[id];
            group.UpdateLive(now, compact);

            float height = group.Height(compact);
            var rect = group.Root.GetComponent<RectTransform>();
            rect.anchorMin = new Vector2(0f, 1f);
            rect.anchorMax = new Vector2(1f, 1f);
            rect.pivot = new Vector2(0.5f, 1f);
            rect.anchoredPosition = new Vector2(0f, -y);
            rect.sizeDelta = new Vector2(0f, height);
            y += height + Tuning.GroupSpacing;
        }
        _controls.BringToFront();

        _panel.sizeDelta = new Vector2(Tuning.PanelWidth, y);
        if (_order.Count > 0) ClampPanelToScreen(persist: true);
        HandleInput();
    }

    private void HandleInput()
    {
        var mouse = Mouse.current;
        if (mouse == null || _panel == null || _canvas == null || _canvasGo == null || !_canvasGo.activeSelf) return;

        Vector2 point = mouse.position.ReadValue();
        if (mouse.leftButton.wasPressedThisFrame)
        {
            if (Hit(_controls.CompactRect, point))
            {
                ToggleCompact();
                return;
            }

            if (Hit(_controls.LockRect, point))
            {
                ToggleLock();
                return;
            }

            if (!_config.Locked.Value)
            {
                foreach (uint id in _order)
                {
                    if (!Hit(_groups[id].HeaderRect, point)) continue;

                    _dragging = true;
                    _grab = point;
                    break;
                }
            }
        }

        if (_dragging && mouse.leftButton.isPressed)
        {
            float scale = _canvas.scaleFactor <= 0f ? 1f : _canvas.scaleFactor;
            _panel.anchoredPosition += (point - _grab) / scale;
            _grab = point;
        }

        if (_dragging && mouse.leftButton.wasReleasedThisFrame)
        {
            _dragging = false;
            ClampPanelToScreen(persist: false);
            _config.PanelX.Value = _panel.anchoredPosition.x;
            _config.PanelY.Value = _panel.anchoredPosition.y;
            _config.Save();
        }
    }

    private void ClampPanelToScreen(bool persist)
    {
        if (_panel == null || _canvas == null) return;

        float scale = _canvas.scaleFactor <= 0f ? 1f : _canvas.scaleFactor;
        float screenWidth = Screen.width / scale;
        float screenHeight = Screen.height / scale;
        Vector2 pos = _panel.anchoredPosition;

        var clamped = PanelPlacement.ClampCentered(
            pos.x,
            pos.y,
            screenWidth,
            screenHeight,
            _panel.sizeDelta.x,
            _panel.sizeDelta.y,
            Tuning.Pad);
        float x = clamped.X;
        float y = clamped.Y;
        if (Mathf.Approximately(pos.x, x) && Mathf.Approximately(pos.y, y)) return;

        _panel.anchoredPosition = new Vector2(x, y);
        if (!persist) return;

        _config.PanelX.Value = x;
        _config.PanelY.Value = y;
        _config.Save();
    }

    private static bool Hit(RectTransform rect, Vector2 screenPoint)
        => RectTransformUtility.RectangleContainsScreenPoint(rect, screenPoint, null);

    private void ToggleCompact()
    {
        _config.Compact.Value = !_config.Compact.Value;
        _config.Save();
        _controls.SetCompact(_config.Compact.Value);

        foreach (uint id in _order)
            _groups[id].Layout(_config.Compact.Value);

        ClampPanelToScreen(persist: true);
    }

    private void ToggleLock()
    {
        _config.Locked.Value = !_config.Locked.Value;
        _config.Save();
        _controls.SetLocked(_config.Locked.Value);
        if (_config.Locked.Value) _dragging = false;
    }

    public void SetVisible(bool visible)
    {
        if (_canvasGo != null && _canvasGo.activeSelf != visible)
            _canvasGo.SetActive(visible);
    }

    public void Dispose()
    {
        foreach (var group in _groups.Values)
            group.Destroy();

        _groups.Clear();
        _order.Clear();

        if (_canvasGo != null) UnityEngine.Object.Destroy(_canvasGo);
        _canvasGo = null;
        _canvas = null;
        _panel = null;
        _controls = null;
        ControlSprites.Dispose();
        Theme.Dispose();
    }
}
