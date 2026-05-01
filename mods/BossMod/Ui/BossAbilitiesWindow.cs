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

public sealed class BossAbilitiesWindow
{
    private readonly SkillCatalog _catalog;
    private readonly Globals _globals;

    public BossAbilitiesWindow(SkillCatalog catalog, Globals globals)
    {
        _catalog = catalog;
        _globals = globals;
    }

    public void Render(UiFrame frame)
    {
        if (!frame.Mode.InWorldScene) return;
        if (!_globals.ShowBossAbilitiesWindow) return;

        var bosses = frame.Bosses
            .Where(boss => boss.IsActive)
            .OrderByDescending(boss => boss.IsTargeted)
            .ThenBy(boss => boss.DistanceToPlayer)
            .ToList();

        bool hasRows = bosses.Any(boss => VisibleAbilities(boss).Any());
        if (!hasRows && !frame.Mode.ConfigMode) return;

        ImGui.SetNextWindowSize(new Vector2(460f, 300f), ImGuiCond.FirstUseEver);
        if (!ImGui.Begin("BossMod Boss Abilities", frame.Mode.BossAbilitiesChrome.ToImGuiFlags()))
        {
            ImGui.End();
            return;
        }

        WindowChromeExtensions.DrawConfigOutline(frame.Mode.BossAbilitiesChrome);

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
        var visible = VisibleAbilities(boss).ToList();
        var rows = SortAbilities(visible, frame.ServerTime)
            .Select(ability => BuildRow(ability, frame.ServerTime, boss.IsChasingTarget, boss.SpecialTiming))
            .ToList();
        int notRolledCount = visible.Count(ability => IsNotRolled(ability.Role));

        if (rows.Count == 0 && notRolledCount == 0) return;

        ImGui.SetNextItemOpen(boss.IsTargeted, ImGuiCond.FirstUseEver);
        string label = $"{boss.DisplayName}  Lv {boss.Level}  HP {HealthPercent(boss):0}%###boss_abilities_{boss.NetId}";
        if (!ImGui.CollapsingHeader(label)) return;

        ImGui.TextDisabled(boss.SpecialTiming.DisplayText);
        if (_globals.BossAbilitiesDensity == BossAbilityDensity.Compact)
            RenderCompactRows(boss.NetId, rows, notRolledCount);
        else
            RenderExpandedRows(boss.NetId, rows, notRolledCount);
    }

    private IEnumerable<BossAbilityState> VisibleAbilities(BossState boss) =>
        boss.Abilities.Where(ability => ShouldShowInBossAbilities(boss.BossId, ability.SkillId, boss.IsActive));

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

    private static IEnumerable<BossAbilityState> SortAbilities(IReadOnlyList<BossAbilityState> abilities, double serverTime)
    {
        var defaultRows = abilities
            .Where(ability => ability.Role == BossAbilityRole.Default)
            .OrderBy(ability => ability.SkillIndex);
        var specialRows = abilities
            .Where(ability => ability.Role == BossAbilityRole.Special)
            .OrderByDescending(ability => ability.IsCurrent)
            .ThenBy(ability => ability.Eligibility == AbilityEligibilityKind.Eligible ? 0 : 1)
            .ThenBy(ability => RemainingCooldown(ability, serverTime))
            .ThenBy(ability => ability.SkillIndex);

        return defaultRows.Concat(specialRows);
    }

    private static bool IsNotRolled(BossAbilityRole role) =>
        role is BossAbilityRole.Passive or BossAbilityRole.Aura or BossAbilityRole.NotRolled;

    private static void RenderCompactRows(uint netId, IReadOnlyList<AbilityRow> rows, int notRolledCount)
    {
        if (!ImGui.BeginTable($"boss_abilities_compact_{netId}", 5, ImGuiTableFlags.Borders | ImGuiTableFlags.RowBg)) return;

        ImGui.TableSetupColumn("#");
        ImGui.TableSetupColumn("Ability");
        ImGui.TableSetupColumn("Ready");
        ImGui.TableSetupColumn("Roll");
        ImGui.TableSetupColumn("Note");
        ImGui.TableHeadersRow();

        for (int i = 0; i < rows.Count; i++) RenderCompactRow(rows[i]);
        if (notRolledCount > 0) RenderNotRolledRow(notRolledCount, columns: 5);

        ImGui.EndTable();
    }

    private static void RenderExpandedRows(uint netId, IReadOnlyList<AbilityRow> rows, int notRolledCount)
    {
        if (!ImGui.BeginTable($"boss_abilities_expanded_{netId}", 8, ImGuiTableFlags.Borders | ImGuiTableFlags.RowBg)) return;

        ImGui.TableSetupColumn("#");
        ImGui.TableSetupColumn("Ability");
        ImGui.TableSetupColumn("State");
        ImGui.TableSetupColumn("Ready");
        ImGui.TableSetupColumn("Cast");
        ImGui.TableSetupColumn("CD/Range");
        ImGui.TableSetupColumn("Roll");
        ImGui.TableSetupColumn("Note");
        ImGui.TableHeadersRow();

        for (int i = 0; i < rows.Count; i++) RenderExpandedRow(rows[i]);
        if (notRolledCount > 0) RenderNotRolledRow(notRolledCount, columns: 8);

        ImGui.EndTable();
    }

    private static void RenderCompactRow(AbilityRow row)
    {
        ImGui.TableNextRow();
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.SkillIndex.ToString());
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.SkillName);
        ImGui.TableNextColumn();
        RenderStatus(row);
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.RollText);
        ImGui.TableNextColumn();
        ImGui.TextDisabled(row.Note);
    }

    private static void RenderExpandedRow(AbilityRow row)
    {
        ImGui.TableNextRow();
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.SkillIndex.ToString());
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.SkillName);
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.Role.ToString());
        ImGui.TableNextColumn();
        RenderStatus(row);
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.CastText);
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.CooldownRangeText);
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.RollText);
        ImGui.TableNextColumn();
        ImGui.TextDisabled(row.Note);
    }

    private static void RenderNotRolledRow(int count, int columns)
    {
        ImGui.TableNextRow();
        ImGui.TableNextColumn();
        ImGui.TextDisabled("-");
        ImGui.TableNextColumn();
        ImGui.TextDisabled($"{count} passive/aura/not-rolled abilities collapsed");
        for (int i = 2; i < columns; i++)
        {
            ImGui.TableNextColumn();
            ImGui.TextDisabled(i == columns - 1 ? "Not rolled by server" : "");
        }
    }

    private static void RenderStatus(AbilityRow row)
    {
        if (row.ReadyStatus)
            ImGui.TextColored(UintToVector4(Theme.Ready), row.ReadyText);
        else
            ImGui.TextDisabled(row.ReadyText);
    }

    private static AbilityRow BuildRow(BossAbilityState ability, double serverTime, bool isChasingTarget, BossSpecialTimingState timing)
    {
        double remaining = RemainingCooldown(ability, serverTime);
        bool timingAllowsRoll = timing.Phase is SpecialTimingPhase.OpeningEstimate or SpecialTimingPhase.OpenEstimate;
        float? chance = !isChasingTarget &&
                        ability.Role == BossAbilityRole.Special &&
                        ability.Eligibility == AbilityEligibilityKind.Eligible &&
                        timingAllowsRoll
            ? ability.ConditionalRollChance
            : null;
        string status = StatusFor(ability, timing);
        string readyText = remaining > 0 ? $"{remaining:0.0}s" : status;
        return new AbilityRow(
            ability.SkillIndex,
            ability.DisplayName,
            ability.Role,
            readyText,
            IsReadyStatus(status),
            FormatSeconds(ability.TotalCastTime),
            $"{FormatSeconds(ability.TotalCooldown)} / {FormatRange(ability.CastRange)}",
            chance.HasValue ? $"{chance.Value * 100f:0}%" : "",
            NoteFor(ability, timing, isChasingTarget));
    }

    private static double RemainingCooldown(BossAbilityState ability, double serverTime)
    {
        if (ability.Eligibility != AbilityEligibilityKind.OnCooldown) return 0;
        return Math.Max(0, Math.Max(ability.CastTimeEnd, ability.CooldownEnd) - serverTime);
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

    private static string FormatSeconds(float seconds) =>
        seconds <= 0 ? "-" : $"{seconds:0.#}s";

    private static string FormatRange(float range) =>
        range <= 0 ? "-" : $"{range:0.#}m";

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

    private readonly struct AbilityRow
    {
        public AbilityRow(int skillIndex, string skillName, BossAbilityRole role, string readyText, bool readyStatus, string castText, string cooldownRangeText, string rollText, string note)
        {
            SkillIndex = skillIndex;
            SkillName = skillName;
            Role = role;
            ReadyText = readyText;
            ReadyStatus = readyStatus;
            CastText = castText;
            CooldownRangeText = cooldownRangeText;
            RollText = rollText;
            Note = note;
        }

        public int SkillIndex { get; }
        public string SkillName { get; }
        public BossAbilityRole Role { get; }
        public string ReadyText { get; }
        public bool ReadyStatus { get; }
        public string CastText { get; }
        public string CooldownRangeText { get; }
        public string RollText { get; }
        public string Note { get; }
    }
}
