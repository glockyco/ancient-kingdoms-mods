using System;
using System.Collections.Generic;
using System.Numerics;
using BossMod.Core.Alerts;
using BossMod.Core.Catalog;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class AlertOverlay
{
    private const int MaxEntries = 4;
    private readonly List<Entry> _entries = new();

    public void Push(AlertEvent ev)
    {
        if (string.IsNullOrEmpty(ev.EffectiveAlertText)) return;

        int existingIndex = _entries.FindIndex(e => e.SkillId == ev.SkillId);
        if (existingIndex >= 0)
        {
            var existing = _entries[existingIndex];
            existing.Event = ev;
            existing.Count++;
            existing.StartedAt = null;
            _entries.RemoveAt(existingIndex);
            _entries.Insert(0, existing);
        }
        else
        {
            _entries.Insert(0, new Entry(ev));
        }

        while (_entries.Count > MaxEntries) _entries.RemoveAt(_entries.Count - 1);
    }

    public void Render(double unscaledNow)
    {
        PruneExpired(unscaledNow);
        if (_entries.Count == 0) return;

        ImGui.SetNextWindowPos(new Vector2(30f, 80f), ImGuiCond.FirstUseEver);
        ImGui.SetNextWindowBgAlpha(0.25f);
        var flags = ImGuiWindowFlags.NoDecoration |
                    ImGuiWindowFlags.AlwaysAutoResize |
                    ImGuiWindowFlags.NoFocusOnAppearing |
                    ImGuiWindowFlags.NoNav |
                    ImGuiWindowFlags.NoInputs;

        if (ImGui.Begin("BossMod Alerts", flags))
        {
            foreach (var entry in _entries)
            {
                entry.StartedAt ??= unscaledNow;
                string text = entry.Count > 1
                    ? $"{entry.Event.EffectiveAlertText} (x{entry.Count})"
                    : entry.Event.EffectiveAlertText;
                ImGui.TextColored(ColorFor(entry.Event.EffectiveThreat), text);
            }
        }
        ImGui.End();
    }

    private void PruneExpired(double unscaledNow)
    {
        for (int i = _entries.Count - 1; i >= 0; i--)
        {
            var entry = _entries[i];
            if (entry.StartedAt is not { } startedAt) continue;

            double ttl = entry.Event.EffectiveThreat == ThreatTier.Critical ? 5.0 : 3.0;
            if (unscaledNow - startedAt >= ttl) _entries.RemoveAt(i);
        }
    }

    private static Vector4 ColorFor(ThreatTier tier) => tier switch
    {
        ThreatTier.Critical => new Vector4(1.0f, 0.15f, 0.15f, 1.0f),
        ThreatTier.High => new Vector4(1.0f, 0.55f, 0.15f, 1.0f),
        ThreatTier.Medium => new Vector4(1.0f, 0.9f, 0.25f, 1.0f),
        _ => new Vector4(1.0f, 1.0f, 1.0f, 1.0f),
    };

    private sealed class Entry
    {
        public Entry(AlertEvent ev)
        {
            Event = ev;
            SkillId = ev.SkillId;
        }

        public string SkillId { get; }
        public AlertEvent Event { get; set; }
        public int Count { get; set; } = 1;
        public double? StartedAt { get; set; }
    }
}
