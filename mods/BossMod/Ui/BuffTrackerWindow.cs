using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using BossMod.Core.Persistence;
using BossMod.Core.Tracking;
using ImGuiNET;

namespace BossMod.Ui;

public sealed class BuffTrackerWindow
{
    private readonly Globals _globals;

    public BuffTrackerWindow(Globals globals)
    {
        _globals = globals;
    }

    public void Render(UiFrame frame)
    {
        if (!frame.Mode.InWorldScene) return;
        if (!_globals.ShowBuffTrackerWindow) return;

        var activeBosses = frame.Bosses.Where(boss => boss.IsActive).ToList();
        bool hasPlayerRows = frame.PlayerBuffs.Any(buff => ShouldShowPlayerBuff(buff, frame.Mode.ConfigMode));
        bool hasBossRows = activeBosses.Any(boss => boss.Buffs.Count > 0);
        if (!hasPlayerRows && !hasBossRows && !frame.Mode.ConfigMode) return;

        ImGui.SetNextWindowSize(new Vector2(360f, 300f), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Buff Tracker", frame.Mode.BuffTrackerChrome.ToImGuiFlags()))
        {
            ImGui.End();
            return;
        }

        WindowChromeExtensions.DrawConfigOutline(frame.Mode.BuffTrackerChrome);

        if (!hasPlayerRows && !hasBossRows)
        {
            ImGui.TextDisabled("Buffs and debuffs appear here for active bosses and the local player.");
            ImGui.End();
            return;
        }

        RenderPlayerSection(frame);
        RenderBossSections(frame, activeBosses);

        ImGui.End();
    }

    private static void RenderPlayerSection(UiFrame frame)
    {
        var rows = frame.PlayerBuffs
            .Where(buff => ShouldShowPlayerBuff(buff, frame.Mode.ConfigMode))
            .OrderBy(buff => Math.Max(0, buff.EndTime - frame.ServerTime))
            .ThenBy(buff => buff.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (rows.Count == 0) return;
        if (!ImGui.CollapsingHeader("On You##player_buffs", ImGuiTreeNodeFlags.DefaultOpen)) return;

        for (int i = 0; i < rows.Count; i++) RenderPlayerBuff(frame, rows[i]);
    }

    private static void RenderBossSections(UiFrame frame, IReadOnlyList<BossState> activeBosses)
    {
        for (int i = 0; i < activeBosses.Count; i++)
        {
            var boss = activeBosses[i];
            if (boss.Buffs.Count == 0) continue;

            ImGui.SetNextItemOpen(false, ImGuiCond.FirstUseEver);
            if (!ImGui.CollapsingHeader($"{boss.DisplayName} buffs##boss_buffs_{boss.NetId}")) continue;

            var rows = boss.Buffs
                .OrderBy(buff => Math.Max(0, buff.BuffTimeEnd - frame.ServerTime))
                .ThenBy(buff => buff.DisplayName, StringComparer.OrdinalIgnoreCase)
                .ToList();

            for (int row = 0; row < rows.Count; row++) RenderBossBuff(frame, rows[row]);
        }
    }

    private static bool ShouldShowPlayerBuff(PlayerBuffView buff, bool configMode) =>
        buff.SourceStatus == PlayerBuffSourceStatus.FromActiveBoss || configMode;

    private static void RenderPlayerBuff(UiFrame frame, PlayerBuffView buff)
    {
        double remaining = Math.Max(0, buff.EndTime - frame.ServerTime);
        string badge = buff.SourceStatus switch
        {
            PlayerBuffSourceStatus.FromActiveBoss => "from active boss",
            PlayerBuffSourceStatus.NotFromActiveBoss => "not from active boss",
            _ => "source unknown",
        };

        bool sourceVerified = buff.SourceStatus == PlayerBuffSourceStatus.FromActiveBoss;
        if (!sourceVerified) ImGui.TextDisabled($"{buff.DisplayName}  ({badge})  {remaining:0.0}s");
        else RenderTimedRow(buff.DisplayName, remaining, buff.TotalTime, ColorFor(buff.IsAura, buff.IsDebuff));
    }

    private static void RenderBossBuff(UiFrame frame, BuffSnapshot buff)
    {
        double remaining = Math.Max(0, buff.BuffTimeEnd - frame.ServerTime);
        RenderTimedRow(buff.DisplayName, remaining, buff.TotalBuffTime, ColorFor(buff.IsAura, buff.IsDebuff));
    }

    private static void RenderTimedRow(string displayName, double remaining, double totalTime, Vector4 color)
    {
        if (totalTime > 0)
        {
            float progress = Math.Clamp((float)(remaining / totalTime), 0f, 1f);
            ImGui.PushStyleColor(ImGuiCol.PlotHistogram, color);
            ImGui.ProgressBar(progress, new Vector2(-1f, 18f), $"{displayName}  {remaining:0.0}s");
            ImGui.PopStyleColor();
        }
        else
        {
            ImGui.TextColored(color, $"{displayName}  {remaining:0.0}s");
        }

        ImGui.Spacing();
    }

    private static Vector4 ColorFor(bool isAura, bool isDebuff)
    {
        if (isAura) return UintToVector4(Theme.Aura);
        if (isDebuff) return UintToVector4(Theme.Debuff);
        return UintToVector4(Theme.Buff);
    }

    private static Vector4 UintToVector4(uint rgba)
    {
        float r = (rgba & 0xFF) / 255f;
        float g = ((rgba >> 8) & 0xFF) / 255f;
        float b = ((rgba >> 16) & 0xFF) / 255f;
        float a = ((rgba >> 24) & 0xFF) / 255f;
        return new Vector4(r, g, b, a);
    }
}
