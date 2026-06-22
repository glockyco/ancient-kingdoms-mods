using System.Collections.Generic;
using Il2Cpp;

namespace BossSkillTracker.Game;

public static class SkillReader
{
    public static bool HasTrackable(Monster monster)
    {
        var skills = monster.skills;
        if (skills == null || skills.skills == null) return false;

        for (int index = 1; index < skills.skills.Count; index++)
        {
            var data = skills.skills[index].data;
            if (data != null && !IsNonCastable(data)) return true;
        }

        return false;
    }

    public static void ReadTrackable(Monster monster, List<TrackedSkill> into)
    {
        into.Clear();

        var skills = monster.skills;
        if (skills == null || skills.skills == null) return;

        for (int index = 1; index < skills.skills.Count; index++)
        {
            Skill skill = skills.skills[index];
            var data = skill.data;
            if (data == null || IsNonCastable(data)) continue;

            into.Add(new TrackedSkill
            {
                Index = index,
                Name = skill.name,
                Icon = skill.image,
                TotalCooldown = skill.cooldown,
            });
        }
    }

    public static int CurrentSkill(Monster monster) => monster.skills != null ? monster.skills.currentSkill : -1;

    public static bool IsCasting(Monster monster) => monster.state == "CASTING";

    public static LiveSkill ReadLive(Monster monster, int index)
    {
        Skill skill = monster.skills.skills[index];
        return new LiveSkill(skill.cooldownEnd, skill.castTimeEnd);
    }

    private static bool IsNonCastable(ScriptableSkill data)
    {
        if (data.TryCast<PassiveSkill>() != null) return true;

        var areaBuff = data.TryCast<AreaBuffSkill>();
        if (areaBuff != null && areaBuff.isAura) return true;

        var areaDebuff = data.TryCast<AreaDebuffSkill>();
        if (areaDebuff != null && areaDebuff.isAura) return true;

        return false;
    }
}
