using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using BossMod.Audio;
using BossMod.Core.Catalog;
using BossMod.Core.Effects;
using BossMod.Ui.Settings;
using ImGuiNET;

namespace BossMod.Ui.Tabs;

public sealed class BossesTab
{
    private readonly SkillCatalog _catalog;
    private readonly ISettingsMutator _mutator;
    private readonly TierDefaults _defaults;
    private readonly SoundBank _soundBank;
    private readonly SoundPreview _soundPreview;
    private string _filter = "";
    private string _selectedBossId = "";
    private string _selectedSkillId = "";

    public BossesTab(SkillCatalog catalog, ISettingsMutator mutator, TierDefaults defaults, SoundBank soundBank, SoundPreview soundPreview)
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
        ImGui.InputText("Filter bosses", ref _filter, 128);

        var rows = BuildRows().ToList();
        ImGui.Columns(2, "bosses_tab_columns", true);
        ImGui.SetColumnWidth(0, 320f);
        ImGui.BeginChild("boss_skill_list", new Vector2(0f, 0f), true);
        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            bool selected = _selectedBossId == row.Boss.Id && _selectedSkillId == row.Skill.Id;
            string label = $"{row.Boss.DisplayName} / {row.Skill.DisplayName}##boss_skill_{row.Boss.Id}_{row.Skill.Id}";
            if (ImGui.Selectable(label, selected))
            {
                _selectedBossId = row.Boss.Id;
                _selectedSkillId = row.Skill.Id;
            }
        }
        ImGui.EndChild();

        ImGui.NextColumn();
        if ((string.IsNullOrEmpty(_selectedBossId) || string.IsNullOrEmpty(_selectedSkillId)) && rows.Count > 0)
        {
            _selectedBossId = rows[0].Boss.Id;
            _selectedSkillId = rows[0].Skill.Id;
        }

        if (TryGetSelected(out var boss, out var skill, out var bossSkill))
        {
            ImGui.TextUnformatted(boss.DisplayName);
            ImGui.TextDisabled($"Lv {boss.LastSeenLevel} {boss.Kind}  {boss.ZoneBestiary}");
            ImGui.TextUnformatted(skill.DisplayName);
            ImGui.TextDisabled(skill.Id);
            ImGui.Separator();

            result.Merge(SettingsTabHelpers.RenderOverrides(
                idPrefix: "boss_" + boss.Id + "_" + skill.Id,
                skill: skill,
                bossSkill: bossSkill,
                defaults: _defaults,
                editingBossOverride: true,
                soundBank: _soundBank,
                preview: _soundPreview,
                apply: patch => _mutator.SetBossSkillOverride(boss.Id, skill.Id, patch)));
        }
        else
        {
            ImGui.TextDisabled("No discovered boss skills match the current filter.");
        }
        ImGui.Columns(1);

        return result;
    }

    private IEnumerable<BossSkillRow> BuildRows()
    {
        foreach (var boss in _catalog.Bosses.Values.OrderBy(boss => boss.DisplayName, StringComparer.OrdinalIgnoreCase))
        {
            foreach (var bossSkill in boss.Skills.OrderBy(entry => SkillDisplayName(entry.Key), StringComparer.OrdinalIgnoreCase))
            {
                if (!_catalog.Skills.TryGetValue(bossSkill.Key, out var skill)) continue;
                if (!MatchesFilter(boss, skill)) continue;
                yield return new BossSkillRow(boss, skill, bossSkill.Value);
            }
        }
    }

    private bool MatchesFilter(BossRecord boss, SkillRecord skill)
    {
        if (string.IsNullOrWhiteSpace(_filter)) return true;
        return boss.DisplayName.Contains(_filter, StringComparison.OrdinalIgnoreCase) ||
               boss.Id.Contains(_filter, StringComparison.OrdinalIgnoreCase) ||
               skill.DisplayName.Contains(_filter, StringComparison.OrdinalIgnoreCase) ||
               skill.Id.Contains(_filter, StringComparison.OrdinalIgnoreCase) ||
               boss.ZoneBestiary.Contains(_filter, StringComparison.OrdinalIgnoreCase);
    }

    private bool TryGetSelected(out BossRecord boss, out SkillRecord skill, out BossSkillRecord bossSkill)
    {
        boss = null;
        skill = null;
        bossSkill = null;
        if (!_catalog.Bosses.TryGetValue(_selectedBossId, out boss)) return false;
        if (!_catalog.Skills.TryGetValue(_selectedSkillId, out skill)) return false;
        if (!boss.Skills.TryGetValue(_selectedSkillId, out bossSkill)) return false;
        return true;
    }

    private string SkillDisplayName(string skillId) =>
        _catalog.Skills.TryGetValue(skillId, out var skill) ? skill.DisplayName : skillId;

    private readonly struct BossSkillRow
    {
        public BossSkillRow(BossRecord boss, SkillRecord skill, BossSkillRecord bossSkill)
        {
            Boss = boss;
            Skill = skill;
            BossSkill = bossSkill;
        }

        public BossRecord Boss { get; }
        public SkillRecord Skill { get; }
        public BossSkillRecord BossSkill { get; }
    }
}
