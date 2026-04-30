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

public sealed class CooldownWindow
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;

    public CooldownWindow(SkillCatalog catalog, Globals globals)
    {
        _catalog = catalog;
        _globals = globals;
    }

    public void Render(UiFrame frame)
    {
        if (!frame.Mode.InWorldScene) return;
        if (!_globals.ShowBossAbilitiesWindow) return;

        var bosses = frame.Bosses
            .Where(boss => boss.IsActive || HasAlwaysBossAbilityRow(boss))
            .OrderByDescending(boss => boss.IsTargeted)
            .ThenBy(boss => boss.DistanceToPlayer)
            .ToList();

        bool hasRows = bosses.Any(boss => VisibleAbilities(boss).Any());
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
            ImGui.TextDisabled("Boss abilities appear here for active bosses.");
            ImGui.End();
            return;
        }

        for (int i = 0; i < bosses.Count; i++) RenderBoss(frame, bosses[i]);

        ImGui.End();
    }

    private void RenderBoss(UiFrame frame, BossState boss)
    {
        var rows = VisibleAbilities(boss)
            .Select(ability => BuildRow(ability, frame.ServerTime, boss.IsChasingTarget, boss.SpecialTiming))
            .OrderBy(row => row.SkillIndex == 0 ? 0 : 1)
            .ThenBy(row => row.Remaining)
            .ThenBy(row => row.SkillIndex)
            .ToList();

        if (rows.Count == 0) return;

        bool targeted = boss.IsTargeted;
        ImGui.SetNextItemOpen(InitialOpen(targeted), ImGuiCond.FirstUseEver);
        string label = $"{boss.DisplayName}  Lv {boss.Level}  HP {HealthPercent(boss):0}%##cooldowns_{boss.NetId}";
        if (!ImGui.CollapsingHeader(label)) return;

        ImGui.TextDisabled(boss.SpecialTiming.DisplayText);
        for (int i = 0; i < rows.Count; i++) RenderRow(rows[i], i, _globals.BossAbilitiesDensity);
    }

    private IEnumerable<BossAbilityState> VisibleAbilities(BossState boss) =>
        boss.Abilities.Where(ability => ShouldShowInBossAbilities(boss.BossId, ability.SkillId, boss.IsActive));

    private bool HasAlwaysBossAbilityRow(BossState boss) =>
        boss.Abilities.Any(ability => ResolveBossAbilityVisibility(boss.BossId, ability.SkillId) == AbilityDisplayPolicy.Always);

    private bool ShouldShowInBossAbilities(string bossId, string skillId, bool bossIsActive) =>
        ResolveBossAbilityVisibility(bossId, skillId) switch
        {
            AbilityDisplayPolicy.Hidden => false,
            AbilityDisplayPolicy.Always => true,
            _ => bossIsActive,
        };

    private AbilityDisplayPolicy ResolveBossAbilityVisibility(string bossId, string skillId)
    {
        if (!_catalog.Skills.TryGetValue(skillId, out var skill)) return AbilityDisplayPolicy.Auto;
        if (!_catalog.Bosses.TryGetValue(bossId, out var boss)) return AbilityDisplayPolicy.Auto;
        if (!boss.Skills.TryGetValue(skillId, out var bossSkill)) return AbilityDisplayPolicy.Auto;

        return SettingsResolver.ResolveBossAbilityVisibility(skill, bossSkill);
    }

    private static CooldownRow BuildRow(BossAbilityState ability, double serverTime, bool isChasingTarget, BossSpecialTimingState timing)
    {
        double individualReadyAt = Math.Max(ability.CastTimeEnd, ability.CooldownEnd);
        double remaining = ability.Eligibility == AbilityEligibilityKind.OnCooldown
            ? Math.Max(0, individualReadyAt - serverTime)
            : 0;
        float totalDuration = Math.Max(ability.TotalCastTime, ability.TotalCooldown);
        float progress = totalDuration <= 0
            ? (remaining <= 0 ? 1f : 0f)
            : Math.Clamp(1f - (float)(remaining / totalDuration), 0f, 1f);
        bool timingAllowsRoll = timing.Phase is SpecialTimingPhase.OpeningEstimate or SpecialTimingPhase.OpenEstimate;
        float? chance = !isChasingTarget &&
                        ability.Role == BossAbilityRole.Special &&
                        ability.Eligibility == AbilityEligibilityKind.Eligible &&
                        timingAllowsRoll
            ? ability.ConditionalRollChance
            : null;
        string status = StatusFor(ability, timing);
        return new CooldownRow(
            ability.SkillIndex,
            ability.DisplayName,
            remaining,
            progress,
            chance,
            status,
            IsReadyStatus(status),
            NoteFor(ability, timing, isChasingTarget));
    }

    private static string StatusFor(BossAbilityState ability, BossSpecialTimingState timing) =>
        ability.Eligibility switch
        {
            AbilityEligibilityKind.DefaultFallback => "DEFAULT",
            AbilityEligibilityKind.Casting => "CASTING",
            AbilityEligibilityKind.OnCooldown => "COOLDOWN",
            AbilityEligibilityKind.Passive => "PASSIVE",
            AbilityEligibilityKind.Aura => "AURA",
            AbilityEligibilityKind.NoTarget => "NO TARGET",
            AbilityEligibilityKind.TargetOutOfRange => "RANGE",
            AbilityEligibilityKind.NoAreaTargets => "NO AREA",
            AbilityEligibilityKind.HealthGate => "HEALTH",
            AbilityEligibilityKind.SummonGate => "SUMMON",
            AbilityEligibilityKind.ResourceGate => "RESOURCE",
            AbilityEligibilityKind.Eligible when ability.Role == BossAbilityRole.Special => timing.Phase switch
            {
                SpecialTimingPhase.Locked => "TIMING",
                SpecialTimingPhase.Unknown => "WAIT",
                SpecialTimingPhase.OpeningEstimate => "WINDOW",
                _ => "READY",
            },
            AbilityEligibilityKind.Eligible => "READY",
            _ => "BLOCKED",
        };

    private static bool IsReadyStatus(string status) =>
        status is "READY" or "DEFAULT" or "CASTING";

    private static string NoteFor(BossAbilityState ability, BossSpecialTimingState timing, bool isChasingTarget)
    {
        if (isChasingTarget && ability.Role == BossAbilityRole.Special) return "Chasing: ranged picks differ";
        if (ability.Role != BossAbilityRole.Special || ability.Eligibility != AbilityEligibilityKind.Eligible) return "";
        return timing.Phase switch
        {
            SpecialTimingPhase.Locked => "timing locked",
            SpecialTimingPhase.Unknown => "timing unknown",
            SpecialTimingPhase.OpeningEstimate => "timing estimate",
            _ => "",
        };
    }

    private static bool InitialOpen(bool targeted) => targeted;

    private static void RenderRow(CooldownRow row, int index, BossAbilityDensity density)
    {
        string prefix = density == BossAbilityDensity.Expanded ? $"#{row.SkillIndex} " : "";
        string chance = row.ConditionalRollChance.HasValue ? $"  roll {row.ConditionalRollChance.Value * 100f:0}%" : "";
        string note = string.IsNullOrEmpty(row.Note) ? "" : $"  {row.Note}";
        if (row.Remaining <= 0)
        {
            ImGui.TextUnformatted($"{prefix}{row.SkillName}{chance}{note}");
            ImGui.SameLine();
            if (row.ReadyStatus)
                ImGui.TextColored(UintToVector4(Theme.Ready), row.Status);
            else
                ImGui.TextDisabled(row.Status);
        }
        else
        {
            string overlay = density == BossAbilityDensity.Expanded
                ? $"#{row.SkillIndex} {row.SkillName}  ready in {row.Remaining:0.0}s{chance}{note}"
                : $"{row.SkillName}  {row.Remaining:0.0}s";
            float height = density == BossAbilityDensity.Expanded ? 22f : 18f;
            ImGui.ProgressBar(row.Progress, new Vector2(-1f, height), overlay);
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
        public CooldownRow(int skillIndex, string skillName, double remaining, float progress, float? conditionalRollChance, string status, bool readyStatus, string note)
        {
            SkillIndex = skillIndex;
            SkillName = skillName;
            Remaining = remaining;
            Progress = progress;
            ConditionalRollChance = conditionalRollChance;
            Status = status;
            ReadyStatus = readyStatus;
            Note = note;
        }
        public int SkillIndex { get; }
        public string SkillName { get; }
        public double Remaining { get; }
        public float Progress { get; }
        public float? ConditionalRollChance { get; }
        public string Status { get; }
        public bool ReadyStatus { get; }
        public string Note { get; }
    }
}
