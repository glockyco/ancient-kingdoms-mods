using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using BossMod.Core.Catalog;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class CooldownWindow
{
    private readonly Globals _globals;

    public CooldownWindow(Globals globals)
    {
        _globals = globals;
    }

    public void Render(UiFrame frame)
    {
        if (!frame.Mode.InWorldScene) return;
        if (!_globals.ShowCooldownWindow) return;

        var bosses = frame.Bosses
            .Where(boss => boss.IsActive)
            .OrderByDescending(boss => boss.IsTargeted)
            .ThenBy(boss => boss.DistanceToPlayer)
            .ToList();

        bool hasRows = bosses.Any(boss => boss.Cooldowns.Any(cd => cd.SkillIdx >= 1));
        if (!hasRows && !frame.Mode.ConfigMode) return;

        ImGui.SetNextWindowSize(new Vector2(360f, 260f), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Cooldowns", frame.Mode.CooldownChrome.ToImGuiFlags()))
        {
            ImGui.End();
            return;
        }

        WindowChromeExtensions.DrawConfigOutline(frame.Mode.CooldownChrome);

        if (!hasRows)
        {
            ImGui.TextDisabled("Cooldowns appear here for active bosses.");
            ImGui.End();
            return;
        }

        for (int i = 0; i < bosses.Count; i++) RenderBoss(frame, bosses[i]);

        ImGui.End();
    }

    private void RenderBoss(UiFrame frame, BossState boss)
    {
        var rows = boss.Cooldowns
            .Where(cd => cd.SkillIdx >= 1)
            .Select(cd => BuildRow(cd, frame.ServerTime))
            .OrderBy(row => row.Remaining)
            .ThenBy(row => row.SkillName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (rows.Count == 0) return;

        bool targeted = boss.IsTargeted;
        ImGui.SetNextItemOpen(InitialOpen(targeted), ImGuiCond.FirstUseEver);
        string label = $"{boss.DisplayName}  Lv {boss.Level}  HP {HealthPercent(boss):0}%##cooldowns_{boss.NetId}";
        if (!ImGui.CollapsingHeader(label)) return;

        for (int i = 0; i < rows.Count; i++) RenderRow(rows[i], i);
    }

    private static CooldownRow BuildRow(SkillCooldown cooldown, double serverTime)
    {
        double remaining = Math.Max(0, cooldown.CooldownEnd - serverTime);
        float progress = cooldown.TotalCooldown <= 0
            ? (remaining <= 0 ? 1f : 0f)
            : Math.Clamp(1f - (float)(remaining / cooldown.TotalCooldown), 0f, 1f);
        return new CooldownRow(cooldown.DisplayName, remaining, progress);
    }

    private bool InitialOpen(bool targeted) => _globals.ExpansionDefault switch
    {
        ExpansionDefault.ExpandAll => true,
        ExpansionDefault.CollapseAll => false,
        ExpansionDefault.ExpandTargetedOnly => targeted,
        _ => targeted,
    };

    private static void RenderRow(CooldownRow row, int index)
    {
        if (row.Remaining <= 0)
        {
            ImGui.TextUnformatted(row.SkillName);
            ImGui.SameLine();
            ImGui.TextColored(UintToVector4(Theme.Ready), "READY");
        }
        else
        {
            string overlay = $"{row.SkillName}  {row.Remaining:0.0}s";
            ImGui.ProgressBar(row.Progress, new Vector2(-1f, 18f), overlay);
        }

        if (index >= 0) ImGui.Spacing();
    }


    private static float HealthPercent(BossState boss) =>
        boss.HealthMax <= 0 ? 0f : Math.Clamp((boss.HealthCurrent / (float)boss.HealthMax) * 100f, 0f, 100f);

    private static Vector4 UintToVector4(uint rgba)
    {
        float r = (rgba & 0xFF) / 255f;
        float g = ((rgba >> 8) & 0xFF) / 255f;
        float b = ((rgba >> 16) & 0xFF) / 255f;
        float a = ((rgba >> 24) & 0xFF) / 255f;
        return new Vector4(r, g, b, a);
    }

    private readonly struct CooldownRow
    {
        public CooldownRow(string skillName, double remaining, float progress)
        {
            SkillName = skillName;
            Remaining = remaining;
            Progress = progress;
        }

        public string SkillName { get; }
        public double Remaining { get; }
        public float Progress { get; }
    }
}
