using System.Collections.Generic;
using PocketCompendium.Core.Game;
using PocketCompendium.Core.Text;
using PocketCompendium.Features.BossSkills.Model;
using Il2Cpp;

namespace PocketCompendium.Features.BossSkills.Game;

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
                Name = GameText.SkillName(data),
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

    /// <summary>
    /// Reads what this process can see of the monster's special-cast gate. The cast mirrors the
    /// game's own unconditional cast in Monster.SelectNextCombatSkillIndex, so a monster without
    /// MonsterSkills is a defect, not a case.
    /// </summary>
    public static GateReading ReadGate(Monster monster)
    {
        var skills = monster.skills.Cast<MonsterSkills>();
        Skill basic = skills.skills[0];
        double cycle = basic.castTime + basic.cooldown + Tuning.RefractorySeconds;

        int current = skills.currentSkill;
        double specialCastEnd = IsCasting(monster) && current >= 1 && current < skills.skills.Count
            ? skills.skills[current].castTimeEnd
            : 0.0;

        bool longerReach = LongerReachReady(monster, skills);
        return GameAccess.HostsServer
            ? GateReading.FromServer(skills.nextSpecialCastTime, monster.startCombatTime, monster.basicOnlySkillTimeEnd, specialCastEnd, cycle, longerReach)
            : GateReading.FromObservation(specialCastEnd, cycle, longerReach);
    }

    // Mirrors Monster.cs:1880-1898: with the target beyond the reach of the skill the monster
    // would use, a ready skill with a longer reach may start at once.
    private static bool LongerReachReady(Monster monster, MonsterSkills skills)
    {
        var target = monster.Networktarget;
        if (target == null || skills.skills.Count <= 1) return false;
        int current = skills.currentSkill >= 0 && skills.currentSkill < skills.skills.Count ? skills.currentSkill : 0;
        Skill check = skills.skills[current];
        if (skills.CastCheckDistance(check) && monster.isTargetVisible(target)) return false;

        for (int index = 1; index < skills.skills.Count; index++)
        {
            Skill skill = skills.skills[index];
            if (skill.castRange > check.castRange && skills.CastCheckSelf(skill) && skills.CastCheckTarget(skill) && skills.CastCheckDistance(skill))
                return true;
        }

        return false;
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
