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
                level_required = skill.requiredLevel.Get(1),
                required_skill_points = skill.requiredSkillPoints.Get(1),
                required_spent_points = skill.requiredSpentPoints,
                prerequisite_skill_id = skill.predecessor != null && !string.IsNullOrEmpty(skill.predecessor.name)
                    ? skill.predecessor.name.ToLowerInvariant().Replace(" ", "_")
                    : null,
                prerequisite_level = skill.predecessorLevel,
                prerequisite2_skill_id = skill.predecessor2 != null && !string.IsNullOrEmpty(skill.predecessor2.name)
                    ? skill.predecessor2.name.ToLowerInvariant().Replace(" ", "_")
                    : null,
                prerequisite2_level = skill.predecessorLevel2,
                required_weapon_category = skill.requiredWeaponCategory ?? "",
                mana_cost = skill.manaCosts.Get(1),
                energy_cost = skill.energyCosts.Get(1),
                cooldown = skill.cooldown.Get(1),
                cast_time = skill.castTime.Get(1),
                cast_range = skill.castRange.Get(1),
                learn_default = skill.learnDefault,
                show_cast_bar = skill.showCastBar,
                cancel_cast_if_target_died = skill.cancelCastIfTargetDied,
                allow_dungeon = skill.allowDungeon,
                is_spell = skill.isSpell,
                is_veteran = skill.isVeteran,
                is_mercenary_skill = skill.isMercenarySkill,
                is_pet_skill = skill.isPetSkill,
                followup_default_attack = skill.followupDefaultAttack,
                skill_aggro_message = skill.skillAggroMessage ?? "",
                tooltip = skill.ToolTip(1, false, false) ?? "",
                icon_path = skill.image != null ? skill.image.name : ""
            };

            skillList.Add(skillData);
        }

        WriteJson(skillList, "skills.json");
        Logger.Msg($"✓ Exported {skillList.Count} skills");
    }
}
