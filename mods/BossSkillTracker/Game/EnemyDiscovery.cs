using System.Collections.Generic;
using BossSkillTracker.Model;
using Il2Cpp;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using UnityEngine;

namespace BossSkillTracker.Game;

public sealed class EnemyDiscovery
{
    private readonly Il2CppReferenceArray<Collider2D> _buffer = new(Tuning.OverlapBufferSize);

    /// <summary>
    /// Fills <paramref name="into"/> with relevant enemies. In combat this runs one bounded spatial
    /// query. Out of combat it only previews the explicitly selected target when eligible.
    /// </summary>
    public bool Discover(double now, List<EnemyInfo> into)
    {
        into.Clear();

        var localPlayer = GameAccess.LocalPlayer;
        if (localPlayer == null) return false;

        if (!GameAccess.InCombat(localPlayer, now))
            return DiscoverTargetPreview(localPlayer, into);
        uint myNet = localPlayer.netId;
        var pet = GameAccess.Pet(localPlayer);
        uint petNet = pet != null ? pet.netId : 0u;
        bool any = false;

        int count = Physics2D.OverlapCircle(localPlayer.transform.position, Tuning.DiscoveryRadius, GameManager.monsterFilter, _buffer);
        for (int index = 0; index < count; index++)
        {
            var collider = _buffer[index];
            if (collider == null) continue;

            var monster = collider.GetComponentInParent<Monster>();
            if (monster == null) continue;

            var tier = GameAccess.TierOf(monster);
            if (tier == null) continue;

            bool alive = monster.health != null && monster.health.current > 0;
            bool engaged = monster.aggroList != null && (monster.aggroList.ContainsKey(myNet) || (petNet != 0u && monster.aggroList.ContainsKey(petNet)));
            if (!RelevanceFilter.ShouldTrack(monster.isBoss, monster.isElite, monster.isFabled, alive, engaged, SkillReader.HasTrackable(monster) ? 1 : 0))
                continue;

            if (ContainsNetId(into, monster.netId)) continue;

            var info = CreateInfo(monster, tier.Value, engaged: true);
            into.Add(info);
            any = true;
        }

        return any;
    }

    private static bool DiscoverTargetPreview(Player localPlayer, List<EnemyInfo> into)
    {
        var target = localPlayer.Networktarget;
        var monster = target != null ? target.TryCast<Monster>() : null;
        if (monster == null) return false;

        var tier = GameAccess.TierOf(monster);
        if (tier == null) return false;

        bool alive = monster.health != null && monster.health.current > 0;
        if (!RelevanceFilter.ShouldPreviewTarget(monster.isBoss, monster.isElite, monster.isFabled, alive, SkillReader.HasTrackable(monster) ? 1 : 0))
            return false;

        into.Add(CreateInfo(monster, tier.Value, engaged: false));
        return true;
    }

    private static EnemyInfo CreateInfo(Monster monster, Tier tier, bool engaged)
    {
        var info = new EnemyInfo
        {
            NetId = monster.netId,
            Name = monster.nameEntity,
            Tier = tier,
            TierColor = GameAccess.TierColor(tier),
            Portrait = GameAccess.Portrait(monster),
            Monster = monster,
            Engaged = engaged,
        };
        SkillReader.ReadTrackable(monster, info.Skills);
        return info;

    }

    private static bool ContainsNetId(List<EnemyInfo> list, uint netId)
    {
        for (int index = 0; index < list.Count; index++)
            if (list[index].NetId == netId)
                return true;

        return false;
    }
}
