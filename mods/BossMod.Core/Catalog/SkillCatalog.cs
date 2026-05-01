using System;
using System.Collections.Generic;

namespace BossMod.Core.Catalog;

/// <summary>
/// In-memory registry. Persistence handled by Persistence.StateJson.
/// </summary>
public sealed class SkillCatalog
{
    public Dictionary<string, SkillRecord> Skills { get; set; } = new();
    public Dictionary<string, BossRecord> Bosses { get; set; } = new();

    public SkillRecord GetOrCreateSkill(string id, string displayName, string lastSeenInBoss)
    {
        if (!Skills.TryGetValue(id, out var rec))
        {
            rec = new SkillRecord
            {
                Id = id,
                DisplayName = displayName,
                FirstSeenUtc = DateTime.UtcNow,
                LastSeenInBoss = lastSeenInBoss,
            };
            Skills[id] = rec;
        }
        else
        {
            // Refresh display name and last-seen, never overwrite user-owned fields.
            rec.DisplayName = displayName;
            rec.LastSeenInBoss = lastSeenInBoss;
        }
        return rec;
    }

    public BossRecord GetOrCreateBoss(
        string id, string displayName,
        string type, string className, string zone,
        BossKind kind, int level)
    {
        if (!Bosses.TryGetValue(id, out var rec))
        {
            rec = new BossRecord
            {
                Id = id, DisplayName = displayName,
                Type = type, Class = className, ZoneBestiary = zone,
                Kind = kind, LastSeenLevel = level,
                FirstSeenUtc = DateTime.UtcNow,
                LastSeenUtc = DateTime.UtcNow,
            };
            Bosses[id] = rec;
        }
        else
        {
            // Refresh metadata (so e.g. zone updates when game patch changes them),
            // but keep all per-skill user overrides under .Skills.
            rec.DisplayName = displayName;
            rec.Type = type;
            rec.Class = className;
            rec.ZoneBestiary = zone;
            rec.Kind = kind;
            rec.LastSeenLevel = level;
            rec.LastSeenUtc = DateTime.UtcNow;
        }
        return rec;
    }

    public BossSkillRecord GetOrCreateBossSkill(BossRecord boss, string skillId, int skillIndex = int.MaxValue)
    {
        if (!boss.Skills.TryGetValue(skillId, out var rec))
        {
            rec = new BossSkillRecord
            {
                SkillIndex = skillIndex,
                LastObservedUtc = DateTime.UtcNow,
            };
            boss.Skills[skillId] = rec;
        }
        else
        {
            rec.LastObservedUtc = DateTime.UtcNow;
            rec.SkillIndex = skillIndex;
        }
        return rec;
    }
}
