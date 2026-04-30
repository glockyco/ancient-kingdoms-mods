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

            var bossSkill = RepresentativeBossSkill(selected.Id, out bool autoThreatVaries, out bool bossSpecificOverridesExist);
            if (autoThreatVaries || bossSpecificOverridesExist)
            {
                ImGui.TextColored(new Vector4(1f, 0.75f, 0.2f, 1f), "This tab edits global defaults. Bosses tab shows final per-boss values when automatic importance or boss-specific overrides vary.");
            }
            result.Merge(SettingsTabHelpers.RenderOverrides(
                idPrefix: "skill_" + selected.Id,
                skill: selected,
                bossSkill: bossSkill,
                editingBossOverride: false,
                apply: patch => _mutator.SetSkillOverride(selected.Id, patch)));
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

    private BossSkillRecord RepresentativeBossSkill(string skillId, out bool autoThreatVaries, out bool bossSpecificOverridesExist)
    {
        autoThreatVaries = false;
        bossSpecificOverridesExist = false;
        bool found = false;
        ThreatTier strongest = ThreatTier.Low;
        ThreatTier first = ThreatTier.Low;

        foreach (var boss in _catalog.Bosses.Values)
        {
            if (!boss.Skills.TryGetValue(skillId, out var bossSkill)) continue;
            if (!found)
            {
                first = bossSkill.AutoThreat;
                strongest = bossSkill.AutoThreat;
                found = true;
            }
            else
            {
                if (bossSkill.AutoThreat != first) autoThreatVaries = true;
                if (bossSkill.AutoThreat > strongest) strongest = bossSkill.AutoThreat;
            }

            if (bossSkill.UserThreat.HasValue || bossSkill.CastBarVisibility.HasValue || bossSkill.BossAbilityVisibility.HasValue)
                bossSpecificOverridesExist = true;
        }

        return new BossSkillRecord { AutoThreat = strongest };
    }
}
