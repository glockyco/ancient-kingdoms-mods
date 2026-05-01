using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using BossMod.Core.Catalog;
using BossMod.Core.Tracking;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class BossesTab
{
    private readonly SkillCatalog _catalog;
    private readonly ISettingsMutator _mutator;
    private string _filter = "";
    private string _selectedBossId = "";

    public BossesTab(SkillCatalog catalog, ISettingsMutator mutator)
    {
        _catalog = catalog;
        _mutator = mutator;
    }

    public UiRenderResult Render()
    {
        var result = new UiRenderResult();
        ImGui.InputText("Filter bosses", ref _filter, 128);

        var rows = BuildRows().ToList();
        ImGui.Columns(2, "bosses_tab_columns", true);
        ImGui.SetColumnWidth(0, 300f);
        ImGui.BeginChild("boss_list", new Vector2(0f, 0f), true);
        for (int i = 0; i < rows.Count; i++)
        {
            var boss = rows[i];
            string label = $"{boss.DisplayName}##boss_{boss.Id}";
            if (ImGui.Selectable(label, _selectedBossId == boss.Id)) _selectedBossId = boss.Id;
            ImGui.TextDisabled($"Lv {boss.LastSeenLevel} {boss.Kind}");
        }
        ImGui.EndChild();

        ImGui.NextColumn();
        if (!rows.Any(boss => boss.Id == _selectedBossId)) _selectedBossId = rows.Count > 0 ? rows[0].Id : "";
        if (_catalog.Bosses.TryGetValue(_selectedBossId, out var selectedBoss))
            RenderSelectedBoss(selectedBoss, result);
        else
            ImGui.TextDisabled("No discovered bosses match the current filter.");
        ImGui.Columns(1);

        return result;
    }

    private IEnumerable<BossRecord> BuildRows() =>
        _catalog.Bosses.Values
            .Where(MatchesFilter)
            .OrderBy(boss => boss.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(boss => boss.Id, StringComparer.OrdinalIgnoreCase);

    private bool MatchesFilter(BossRecord boss)
    {
        if (string.IsNullOrWhiteSpace(_filter)) return true;
        if (boss.DisplayName.Contains(_filter, StringComparison.OrdinalIgnoreCase)) return true;
        if (boss.Id.Contains(_filter, StringComparison.OrdinalIgnoreCase)) return true;
        if (boss.ZoneBestiary.Contains(_filter, StringComparison.OrdinalIgnoreCase)) return true;
        return boss.Skills.Keys.Any(skillId =>
            skillId.Contains(_filter, StringComparison.OrdinalIgnoreCase) ||
            (_catalog.Skills.TryGetValue(skillId, out var skill) && skill.DisplayName.Contains(_filter, StringComparison.OrdinalIgnoreCase)));
    }

    private void RenderSelectedBoss(BossRecord boss, UiRenderResult result)
    {
        ImGui.TextUnformatted(boss.DisplayName);
        ImGui.TextDisabled($"Lv {boss.LastSeenLevel} {boss.Kind}  {boss.ZoneBestiary}");
        ImGui.Separator();

        var abilityRows = BuildBossAbilityRows(boss).ToList();
        if (abilityRows.Count == 0)
        {
            ImGui.TextDisabled("No abilities discovered for this boss yet.");
            return;
        }

        if (!ImGui.BeginTable("boss_abilities_settings", 6, ImGuiTableFlags.Borders | ImGuiTableFlags.RowBg)) return;

        ImGui.TableSetupColumn("#");
        ImGui.TableSetupColumn("Ability");
        ImGui.TableSetupColumn("Role");
        ImGui.TableSetupColumn("Importance");
        ImGui.TableSetupColumn("Cast Bars");
        ImGui.TableSetupColumn("Boss Abilities");
        ImGui.TableHeadersRow();

        for (int i = 0; i < abilityRows.Count; i++) RenderBossAbilityConfigRow(boss, abilityRows[i], result);

        ImGui.EndTable();
    }

    private IEnumerable<BossAbilityConfigRow> BuildBossAbilityRows(BossRecord boss)
    {
        foreach (var entry in boss.Skills
                     .OrderBy(entry => entry.Value.SkillIndex)
                     .ThenBy(entry => SkillDisplayName(entry.Key), StringComparer.OrdinalIgnoreCase))
        {
            if (!_catalog.Skills.TryGetValue(entry.Key, out var skill)) continue;
            yield return new BossAbilityConfigRow(skill, entry.Value, RoleLabel(entry.Value.SkillIndex, skill));
        }
    }

    private void RenderBossAbilityConfigRow(BossRecord boss, BossAbilityConfigRow row, UiRenderResult result)
    {
        string idPrefix = $"boss_{boss.Id}_{row.Skill.Id}";
        Func<SkillOverridePatch, bool> apply = patch => _mutator.SetBossSkillOverride(boss.Id, row.Skill.Id, patch);

        ImGui.TableNextRow();
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.BossSkill.SkillIndex == int.MaxValue ? "-" : row.BossSkill.SkillIndex.ToString());
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.Skill.DisplayName);
        ImGui.TextDisabled(row.Skill.Id);
        ImGui.TableNextColumn();
        ImGui.TextUnformatted(row.Role);
        ImGui.TableNextColumn();
        SettingsTabHelpers.RenderBossThreatCell(idPrefix, row.Skill, row.BossSkill, apply, result);
        ImGui.TableNextColumn();
        SettingsTabHelpers.RenderBossCastBarsCell(idPrefix, row.Skill, row.BossSkill, apply, result);
        ImGui.TableNextColumn();
        SettingsTabHelpers.RenderBossAbilitiesCell(idPrefix, row.Skill, row.BossSkill, apply, result);
    }

    private string SkillDisplayName(string skillId) =>
        _catalog.Skills.TryGetValue(skillId, out var skill) ? skill.DisplayName : skillId;

    private static string RoleLabel(int skillIndex, SkillRecord skill)
    {
        if (skillIndex == int.MaxValue) return "Unknown";
        if (skillIndex == 0) return BossAbilityRole.Default.ToString();
        if (skill.RawSnapshot.IsAura) return BossAbilityRole.Aura.ToString();
        if (skill.RawSnapshot.SkillClass.Contains("Passive", StringComparison.OrdinalIgnoreCase)) return BossAbilityRole.Passive.ToString();
        return BossAbilityRole.Special.ToString();
    }

    private readonly struct BossAbilityConfigRow
    {
        public BossAbilityConfigRow(SkillRecord skill, BossSkillRecord bossSkill, string role)
        {
            Skill = skill;
            BossSkill = bossSkill;
            Role = role;
        }

        public SkillRecord Skill { get; }
        public BossSkillRecord BossSkill { get; }
        public string Role { get; }
    }
}
