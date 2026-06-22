using System.Collections.Generic;
using System.Linq;

namespace BossSkillTracker.Model;

public static class SkillOrdering
{
    // Indices into 'cooldowns' ordered by cooldown descending. LINQ OrderByDescending is stable,
    // so equal cooldowns keep their original order.
    public static int[] ByCooldownDesc(IReadOnlyList<float> cooldowns)
        => Enumerable.Range(0, cooldowns.Count).OrderByDescending(index => cooldowns[index]).ToArray();
}
