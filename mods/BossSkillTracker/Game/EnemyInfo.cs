using System.Collections.Generic;
using BossSkillTracker.Model;
using Il2Cpp;
using UnityEngine;

namespace BossSkillTracker.Game;

public sealed class TrackedSkill
{
    public int Index;
    public string Name = string.Empty;
    public Sprite Icon;
    public float TotalCooldown;
}

public readonly struct LiveSkill
{
    public readonly double CooldownEnd;
    public readonly double CastTimeEnd;

    public LiveSkill(double cooldownEnd, double castTimeEnd)
    {
        CooldownEnd = cooldownEnd;
        CastTimeEnd = castTimeEnd;
    }
}

public sealed class EnemyInfo
{
    public uint NetId;
    public string Name = string.Empty;
    public Tier Tier;
    public Color TierColor;
    public Sprite Portrait;
    public Monster Monster;
    public bool Engaged;
    public List<TrackedSkill> Skills = new();
}
