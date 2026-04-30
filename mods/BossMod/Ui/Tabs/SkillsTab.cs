using System;
using System.Linq;
using System.Numerics;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class SkillsTab
{
    private readonly SkillCatalog _catalog;
    private readonly ISettingsMutator _mutator;
    private readonly TierDefaults _defaults;
    private string _filter = "";
    private string _selectedSkillId = "";

    public SkillsTab(SkillCatalog catalog, ISettingsMutator mutator, TierDefaults defaults)
    {
        _catalog = catalog;
        _mutator = mutator;
        _defaults = defaults;
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
        if (string.IsNullOrEmpty(_selectedSkillId) && skills.Count > 0) _selectedSkillId = skills[0].Id;
        if (_catalog.Skills.TryGetValue(_selectedSkillId, out var selected))
        {
            ImGui.TextUnformatted(selected.DisplayName);
            ImGui.TextDisabled(selected.Id);
            ImGui.Separator();

            var bossSkill = RepresentativeBossSkill(selected.Id);
            result.Merge(SettingsTabHelpers.RenderOverrides(
                idPrefix: "skill_" + selected.Id,
                skill: selected,
                bossSkill: bossSkill,
                defaults: _defaults,
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

    private BossSkillRecord RepresentativeBossSkill(string skillId)
    {
        if (_catalog.Skills.TryGetValue(skillId, out var skill) &&
            !string.IsNullOrEmpty(skill.LastSeenInBoss) &&
            _catalog.Bosses.TryGetValue(skill.LastSeenInBoss, out var lastBoss) &&
            lastBoss.Skills.TryGetValue(skillId, out var lastBossSkill))
        {
            return new BossSkillRecord { AutoThreat = lastBossSkill.AutoThreat };
        }

        foreach (var boss in _catalog.Bosses.Values)
        {
            if (boss.Skills.TryGetValue(skillId, out var bossSkill)) return new BossSkillRecord { AutoThreat = bossSkill.AutoThreat };
        }

        return new BossSkillRecord { AutoThreat = ThreatTier.Low };
    }
}
