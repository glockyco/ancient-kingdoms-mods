using System;
using System.Linq;
using System.Numerics;
using BossMod.Audio;
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
    private readonly SoundBank _soundBank;
    private readonly SoundPreview _soundPreview;
    private string _filter = "";
    private string _selectedSkillId = "";

    public SkillsTab(SkillCatalog catalog, ISettingsMutator mutator, TierDefaults defaults, SoundBank soundBank, SoundPreview soundPreview)
    {
        _catalog = catalog;
        _mutator = mutator;
        _defaults = defaults;
        _soundBank = soundBank;
        _soundPreview = soundPreview;
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

            var bossSkill = RepresentativeBossSkill(selected.Id, out bool resolutionVaries);
            if (resolutionVaries)
            {
                ImGui.TextColored(new System.Numerics.Vector4(1f, 0.75f, 0.2f, 1f), "Auto/tier defaults vary by boss; showing highest auto threat. Use Bosses for exact per-boss values.");
            }
            result.Merge(SettingsTabHelpers.RenderOverrides(
                idPrefix: "skill_" + selected.Id,
                skill: selected,
                bossSkill: bossSkill,
                defaults: _defaults,
                editingBossOverride: false,
                soundBank: _soundBank,
                preview: _soundPreview,
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

    private BossSkillRecord RepresentativeBossSkill(string skillId, out bool resolutionVaries)
    {
        resolutionVaries = false;
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
                if (bossSkill.AutoThreat != first) resolutionVaries = true;
                if (bossSkill.AutoThreat > strongest) strongest = bossSkill.AutoThreat;
            }
        }

        return new BossSkillRecord { AutoThreat = strongest };
    }
}
