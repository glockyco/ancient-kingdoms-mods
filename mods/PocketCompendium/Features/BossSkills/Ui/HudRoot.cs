using System.Collections.Generic;
using PocketCompendium.Core.Features;
using PocketCompendium.Core.Ui;
using PocketCompendium.Features.BossSkills.Game;
using PocketCompendium.Features.BossSkills.Model;
using UnityEngine;

namespace PocketCompendium.Features.BossSkills.Ui;

/// <summary>
/// The skill panel: one card per relevant monster, stacked under each other in a panel the
/// player can move by any card's header, scale by its corner grip and lock.
/// </summary>
public sealed class HudRoot
{
    private readonly BossSkillsSettings _config;
    private readonly Feature _feature;
    private readonly Dictionary<uint, GroupView> _groups = new();
    private readonly List<uint> _order = new();
    private readonly List<RectTransform> _dragHandles = new();

    private ControlCluster _controls;
    private bool _visible;
    private bool _shownLocked;
    private bool _shownLockedByLayout;
    private bool _shownCompact;

    public HudRoot(BossSkillsSettings config, Feature feature)
    {
        _config = config;
        _feature = feature;
    }

    private PanelHost Host => _config.Panel;

    private void EnsurePanel()
    {
        if (Host.Exists) return;

        Host.Create();
        Host.SetContentWidth(Tuning.PanelWidth);
        _controls = new ControlCluster(Host.Rect);
        ShowControlState(force: true);
        _controls.BringToFront();
        Host.SetVisible(_visible);
    }

    public void Reconcile(List<EnemyInfo> infos)
    {
        EnsurePanel();

        var seen = new HashSet<uint>();
        foreach (var info in infos)
        {
            seen.Add(info.NetId);
            if (_groups.ContainsKey(info.NetId))
            {
                _groups[info.NetId].SetEngaged(info.Engaged);
                continue;
            }

            var group = new GroupView(Host.Rect, info);
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
        if (!Host.Exists) return;

        bool compact = _config.Compact.Value;
        if (compact != _shownCompact)
            foreach (uint id in _order)
                _groups[id].Layout(compact);

        float y = 0f;
        _dragHandles.Clear();
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
            _dragHandles.Add(group.HeaderRect);
        }

        ShowControlState(force: false);
        _controls.BringToFront();
        Host.SetHeight(Mathf.Max(0f, y - Tuning.GroupSpacing));
        HandleInput();
    }

    private void HandleInput()
    {
        if (!_visible) return;
        Host.UpdateGrip();

        if (Pointer.Clicked(_controls.SettingsRect))
            SettingsWindow.Current?.Open(_feature);
        else if (Pointer.Clicked(_controls.CompactRect))
            _config.Compact.Value = !_config.Compact.Value;
        else if (Pointer.Clicked(_controls.LockRect))
        {
            // Under Lock all the panel's own lock cannot unlock it, so the click leads to the switch that can.
            if (PanelHost.LockAll()) SettingsWindow.Current?.OpenLayout();
            else Host.Locked = !Host.Locked;
        }

        Host.Update(_dragHandles);
    }

    private void ShowControlState(bool force)
    {
        bool locked = Host.EffectivelyLocked;
        bool lockedByLayout = PanelHost.LockAll();
        if (force || locked != _shownLocked || lockedByLayout != _shownLockedByLayout)
            _controls.SetLocked(locked, lockedByLayout);
        if (force || _config.Compact.Value != _shownCompact)
            _controls.SetCompact(_config.Compact.Value);

        _shownLocked = locked;
        _shownLockedByLayout = lockedByLayout;
        _shownCompact = _config.Compact.Value;
    }

    public void SetVisible(bool visible)
    {
        _visible = visible;
        Host.SetVisible(visible);
    }

    public void Dispose()
    {
        foreach (var group in _groups.Values)
            group.Destroy();

        _groups.Clear();
        _order.Clear();
        _dragHandles.Clear();
        Host.Destroy();
        _controls = null;
    }
}
