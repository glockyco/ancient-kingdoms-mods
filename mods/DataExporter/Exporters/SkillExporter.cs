using System.Collections.Generic;
using DataExporter.Models;
using Il2CppInterop.Runtime;
using MelonLoader;
using UnityEngine;

namespace DataExporter.Exporters;

public class SkillExporter : BaseExporter
{
    public SkillExporter(MelonLogger.Instance logger, string exportPath) : base(logger, exportPath)
    {
    }

    public override void Export()
    {
        Logger.Msg("Exporting skills...");

        var type = Il2CppType.Of<Il2Cpp.ScriptableSkill>();
        var skills = Resources.FindObjectsOfTypeAll(type);

        var skillList = new List<SkillData>();

        foreach (var obj in skills)
        {
            var skill = obj.TryCast<Il2Cpp.ScriptableSkill>();
            if (skill == null || string.IsNullOrEmpty(skill.name))
                continue;

            var skillData = new SkillData
            {
                id = skill.name.ToLowerInvariant().Replace(" ", "_"),
                name = skill.nameSkill ?? skill.name,
                tier = skill.tier,
                max_level = skill.maxLevel,
                level_required = skill.requiredLevel.Get(1), // Get at skill level 1
                prerequisite_skill_id = skill.predecessor != null ? skill.predecessor.name.ToLowerInvariant().Replace(" ", "_") : "",
                prerequisite_level = skill.predecessorLevel,
                mana_cost = skill.manaCosts.Get(1),
                energy_cost = skill.energyCosts.Get(1),
                cooldown = skill.cooldown.Get(1),
                cast_time = skill.castTime.Get(1),
                cast_range = skill.castRange.Get(1),
                tooltip = skill.ToolTip(1, false, false) ?? "",
                icon_path = skill.image != null ? skill.image.name : ""
            };

            skillList.Add(skillData);
        }

        WriteJson(skillList, "skills.json");
        Logger.Msg($"✓ Exported {skillList.Count} skills");
    }
}
