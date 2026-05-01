using System;
using System.Linq;
using System.Numerics;
using BossMod.Core.Catalog;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class SkillsTab
{
    private readonly SkillCatalog _catalog;
    private readonly ISettingsMutator _mutator;
    private string _filter = "";
    private string _selectedSkillId = "";

    public SkillsTab(SkillCatalog catalog, ISettingsMutator mutator)
    {
        _catalog = catalog;
        _mutator = mutator;
    }

    public UiRenderResult Render()
    {
        var result = new UiRenderResult();
        ImGui.InputText("Filter skills", ref _filter, 128);

        var skills = _catalog.Skills.Values
            .Where(MatchesFilter)
            .OrderBy(skill => skill.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(skill => skill.Id, StringComparer.OrdinalIgnoreCase)
            .ToList();

        ImGui.Columns(2, "skills_tab_columns", true);
        ImGui.SetColumnWidth(0, 260f);
        ImGui.BeginChild("skills_list", new Vector2(0f, 0f), true);
        for (int i = 0; i < skills.Count; i++)
        {
            var skill = skills[i];
            string label = $"{skill.DisplayName}##skill_{skill.Id}";
            if (ImGui.Selectable(label, _selectedSkillId == skill.Id)) _selectedSkillId = skill.Id;
        }
        ImGui.EndChild();

        ImGui.NextColumn();
        if (!skills.Any(skill => skill.Id == _selectedSkillId)) _selectedSkillId = skills.Count > 0 ? skills[0].Id : "";
        if (_catalog.Skills.TryGetValue(_selectedSkillId, out var selected))
        {
            ImGui.TextUnformatted(selected.DisplayName);
            ImGui.TextDisabled(selected.Id);
            ImGui.Separator();

            result.Merge(SettingsTabHelpers.RenderSkillDefaults(
                idPrefix: "skill_" + selected.Id,
                skill: selected,
                apply: patch => _mutator.SetSkillOverride(selected.Id, patch)));

            ImGui.Separator();
            RenderBossUsage(selected.Id);
        }
        else
        {
            ImGui.TextDisabled("No discovered skills match the current filter.");
        }
        ImGui.Columns(1);

        return result;
    }

    private bool MatchesFilter(SkillRecord skill)
    {
        if (string.IsNullOrWhiteSpace(_filter)) return true;
        return skill.DisplayName.Contains(_filter, StringComparison.OrdinalIgnoreCase) ||
               skill.Id.Contains(_filter, StringComparison.OrdinalIgnoreCase);
    }

    private void RenderBossUsage(string skillId)
    {
        var usage = _catalog.Bosses.Values
            .Where(boss => boss.Skills.ContainsKey(skillId))
            .OrderBy(boss => boss.DisplayName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(boss => boss.Id, StringComparer.OrdinalIgnoreCase)
            .ToList();

        ImGui.TextUnformatted("Boss usage");
        if (usage.Count == 0)
        {
            ImGui.TextDisabled("No bosses use this skill yet.");
            return;
        }

        if (!ImGui.BeginTable("skill_boss_usage", 4, ImGuiTableFlags.Borders | ImGuiTableFlags.RowBg)) return;

        ImGui.TableSetupColumn("Boss");
        ImGui.TableSetupColumn("#");
        ImGui.TableSetupColumn("Auto importance");
        ImGui.TableSetupColumn("Boss overrides");
        ImGui.TableHeadersRow();

        for (int i = 0; i < usage.Count; i++)
        {
            var boss = usage[i];
            var bossSkill = boss.Skills[skillId];
            ImGui.TableNextRow();
            ImGui.TableNextColumn();
            ImGui.TextUnformatted(boss.DisplayName);
            ImGui.TextDisabled(boss.Id);
            ImGui.TableNextColumn();
            ImGui.TextUnformatted(bossSkill.SkillIndex == int.MaxValue ? "-" : bossSkill.SkillIndex.ToString());
            ImGui.TableNextColumn();
            ImGui.TextUnformatted(bossSkill.AutoThreat.ToString());
            ImGui.TableNextColumn();
            ImGui.TextDisabled(OverrideSummary(bossSkill));
        }

        ImGui.EndTable();
    }

    private static string OverrideSummary(BossSkillRecord bossSkill)
    {
        var parts = new System.Collections.Generic.List<string>();
        if (bossSkill.UserThreat.HasValue) parts.Add("importance");
        if (bossSkill.CastBarVisibility.HasValue) parts.Add("cast bars");
        if (bossSkill.BossAbilityVisibility.HasValue) parts.Add("boss abilities");
        return parts.Count == 0 ? "-" : string.Join(", ", parts);
    }
}
