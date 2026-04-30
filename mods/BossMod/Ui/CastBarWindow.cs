using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class CastBarWindow
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;

    public CastBarWindow(SkillCatalog catalog, Globals globals)
    {
        _catalog = catalog;
        _globals = globals;
    }

    public void Render(UiFrame frame)
    {
        if (!frame.Mode.InWorldScene) return;
        if (!_globals.ShowCastBarWindow) return;

        var rows = BuildRows(frame)
            .OrderByDescending(row => row.Threat)
            .ThenBy(row => row.Remaining)
            .ToList();

        if (rows.Count == 0 && !frame.Mode.ConfigMode) return;

        ImGui.SetNextWindowSize(new Vector2(360f, 120f), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Cast Bars", frame.Mode.CastBarChrome.ToImGuiFlags()))
        {
            ImGui.End();
            return;
        }

        WindowChromeExtensions.DrawConfigOutline(frame.Mode.CastBarChrome);

        if (rows.Count == 0)
        {
            ImGui.TextDisabled("Cast bars appear here when active bosses cast.");
            ImGui.End();
            return;
        }

        int maxRows = Math.Max(1, _globals.MaxCastBars);
        int visibleRows = Math.Min(maxRows, rows.Count);
        for (int i = 0; i < visibleRows; i++) RenderRow(rows[i], i);

        int overflow = rows.Count - visibleRows;
        if (overflow > 0) ImGui.TextDisabled($"+{overflow} more casting");

        ImGui.End();
    }

    private List<CastRow> BuildRows(UiFrame frame)
    {
        var rows = new List<CastRow>();
        for (int i = 0; i < frame.Bosses.Count; i++)
        {
            var boss = frame.Bosses[i];
            if (!boss.IsActive || !boss.ActiveCast.HasValue) continue;

            var cast = boss.ActiveCast.Value;
            double remaining = Math.Max(0, cast.CastTimeEnd - frame.ServerTime);
            float progress = cast.TotalCastTime <= 0
                ? 1f
                : Math.Clamp(1f - (float)(remaining / cast.TotalCastTime), 0f, 1f);

            rows.Add(new CastRow(
                bossName: boss.DisplayName,
                skillName: cast.DisplayName,
                skillId: cast.SkillId,
                threat: ResolveThreat(boss.BossId, cast.SkillId),
                remaining: remaining,
                progress: progress));
        }

        return rows;
    }

    private ThreatTier ResolveThreat(string bossId, string skillId)
    {
        if (!_catalog.Skills.TryGetValue(skillId, out var skill)) return ThreatTier.Low;
        if (!_catalog.Bosses.TryGetValue(bossId, out var boss)) return ThreatTier.Low;
        if (!boss.Skills.TryGetValue(skillId, out var bossSkill)) return ThreatTier.Low;
        return SettingsResolver.ResolveThreat(skill, bossSkill);
    }

    private static void RenderRow(CastRow row, int index)
    {
        ImGui.PushStyleColor(ImGuiCol.PlotHistogram, Theme.ThreatColor(row.Threat));
        ImGui.TextUnformatted(row.BossName);
        string overlay = $"{row.SkillName}  {row.Remaining:0.0}s";
        ImGui.ProgressBar(row.Progress, new Vector2(-1f, 20f), overlay);
        ImGui.PopStyleColor();
        if (index >= 0) ImGui.Spacing();
    }

    private readonly struct CastRow
    {
        public CastRow(string bossName, string skillName, string skillId, ThreatTier threat, double remaining, float progress)
        {
            BossName = bossName;
            SkillName = skillName;
            SkillId = skillId;
            Threat = threat;
            Remaining = remaining;
            Progress = progress;
        }

        public string BossName { get; }
        public string SkillName { get; }
        public string SkillId { get; }
        public ThreatTier Threat { get; }
        public double Remaining { get; }
        public float Progress { get; }
    }
}
