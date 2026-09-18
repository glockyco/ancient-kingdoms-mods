#nullable disable
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using CombatVerification.Dtos;
using CombatVerification.Engine;
using CombatVerification.Fixtures;
using Il2Cpp;
using UnityEngine;

namespace CombatVerification.Probes
{
    /// <summary>
    /// Drives one measurement window: the player casts the first listed skill that is ready and
    /// affordable whenever it is idle, the game's own follow-up loop fills the gaps with the default
    /// attack, and every hit, completion, and incoming blow is recorded against the server clock.
    /// The window opens when the warm-up attack enters its refractory period. Its remaining cast or
    /// projectile travel can therefore finish inside the window, while the approach walk stays out.
    /// </summary>
    /// <remarks>
    /// When no listed skill is ready and affordable, the default attack is armed instead, as the
    /// game's own client does when a rage or mana skill cannot be paid for. A Warrior starts a
    /// fight at zero rage, so a fixture that lists only a rage skill still opens its window and the
    /// default attack builds the rage the listed skill then spends.
    /// </remarks>
    /// <remarks>
    /// The target is kept alive by refilling its health each frame, because a level 50 character
    /// kills a low-level spawn in a few hits and a dead target ends the window. A refill cannot
    /// save a target that one hit would take from full to zero, so the window refuses such a pair.
    /// The player is not made invincible: incoming blows are part of what the engine models, so
    /// they are recorded instead of prevented.
    /// </remarks>
    public sealed class FixtureWindow
    {
        public sealed class Outcome
        {
            public string Failure;
            public WindowSample Sample;
        }

        private readonly Player _player;
        private readonly PlayerSkills _skills;
        private readonly Monster _target;
        private readonly IReadOnlyList<int> _priority;
        private readonly double _seconds;
        private readonly int _fallback;
        private readonly IReadOnlyList<string> _companionIds;
        private readonly bool _keepResourcesFull;
        private readonly int _stopAfterListedHits;
        private readonly bool _stopAfterListedEffect;

        private FixtureWindow(
            Player player, Monster target, IReadOnlyList<int> priority, double seconds,
            IReadOnlyList<string> companionIds, bool keepResourcesFull, int stopAfterListedHits,
            bool stopAfterListedEffect)
        {
            _keepResourcesFull = keepResourcesFull;
            _stopAfterListedHits = stopAfterListedHits;
            _stopAfterListedEffect = stopAfterListedEffect;
            _player = player;
            _skills = player.skills.TryCast<PlayerSkills>();
            _target = target;
            _priority = priority;
            _seconds = seconds;
            _fallback = DefaultAttackIndex(_skills);
            _companionIds = companionIds;
        }

        /// <summary>The companions the player holds, in hire order.</summary>
        private List<Pet> Companions()
        {
            var held = new List<Pet>();
            foreach (var pet in new[]
            {
                _player.activeMercenary, _player.activeMercenary2,
                _player.activeMercenary3, _player.activeMercenary4,
            })
                if (pet != null)
                    held.Add(pet);
            return held;
        }

        /// <summary>
        /// Accumulates each companion's damage meter across the window. The meter is read every
        /// frame and a backward move is a cleared meter, so only forward moves are counted.
        /// </summary>
        private sealed class CompanionMeters
        {
            private readonly List<Pet> _pets;
            private readonly long[] _last;
            public readonly long[] Total;

            public CompanionMeters(List<Pet> pets)
            {
                _pets = pets;
                _last = new long[pets.Count];
                Total = new long[pets.Count];
                for (var i = 0; i < pets.Count; i++)
                    _last[i] = pets[i].combat.meterDamageDone;
            }

            public void Observe()
            {
                for (var i = 0; i < _pets.Count; i++)
                {
                    var now = _pets[i].combat.meterDamageDone;
                    if (now > _last[i]) Total[i] += now - _last[i];
                    _last[i] = now;
                }
            }
        }

        /// <summary>
        /// The skill the engine continues with between casts: the first held base damage skill
        /// flagged as a follow-up default attack. -1 when the character holds none.
        /// </summary>
        private static int DefaultAttackIndex(PlayerSkills skills)
        {
            for (var i = 0; i < skills.skills.Count; i++)
            {
                var skill = skills.skills[i];
                if (skill.data is DamageSkill { baseSkill: true }
                    && skill.data.followupDefaultAttack && skill.level > 0)
                    return i;
            }
            return -1;
        }

        /// <summary>
        /// Arms the first listed skill that is ready and affordable, or the default attack when none
        /// is. Returns the armed skill index, or -1 when nothing could be armed.
        /// </summary>
        private int TryArm()
        {
            foreach (var index in _priority)
            {
                var skill = _skills.skills[index];
                if (index == _fallback && _player.NetworkcontinueFollowUpSkill >= 0)
                    continue;
                if (!skill.IsReady()) continue;
                if (_player.mana.current < skill.manaCosts || _player.energy.current < skill.energyCosts)
                    continue;
                _skills.CmdUse(index, Direction());
                return index;
            }
            if (_fallback < 0 || _player.NetworkcontinueFollowUpSkill >= 0)
                return -1;
            _skills.CmdUse(_fallback, Direction());
            return _fallback;
        }

        /// <summary>Resolves the declared actions to skill indexes the engine addresses.</summary>
        public static bool TryResolveActions(
            Player player, IReadOnlyList<ActionSpec> actions, out List<int> indexes, out string failure)
        {
            indexes = new List<int>();
            failure = null;
            var skills = player.skills.skills;
            foreach (var action in actions)
            {
                var index = -1;
                for (var i = 0; i < skills.Count; i++)
                {
                    if (skills[i].name == action.Skill) { index = i; break; }
                }
                if (index < 0)
                {
                    failure = $"The character holds no skill named '{action.Skill}'.";
                    return false;
                }
                if (skills[index].level <= 0)
                {
                    failure = $"The character holds '{action.Skill}' at level 0, which it cannot use.";
                    return false;
                }
                indexes.Add(index);
            }
            return true;
        }

        /// <param name="keepResourcesFull">
        /// Refill the player's mana and energy every frame. A per-hit window measures each hit
        /// against the target's state, not the caster's resource economy, so a 500-mana skill can
        /// be cast on every cooldown. A rotation window leaves resources to the engine's model.
        /// </param>
        /// <param name="stopAfterListedHits">
        /// Close the window once the listed skills have landed this many hits, or 0 to run the
        /// whole declared length. A per-hit window is bounded by its sample count, not the clock.
        /// </param>
        /// <param name="stopAfterListedEffect">
        /// Close after the target holds an effect from a listed skill. This records the effect and
        /// the settled target stats instead of waiting for a hit that a debuff does not produce.
        /// </param>
        public static IEnumerator RunCoroutine(
            Player player, Monster target, IReadOnlyList<int> priority, double seconds,
            IReadOnlyList<string> companionIds, bool keepResourcesFull, int stopAfterListedHits,
            bool stopAfterListedEffect, Outcome outcome)
        {
            var window = new FixtureWindow(
                player, target, priority, seconds, companionIds, keepResourcesFull,
                stopAfterListedHits, stopAfterListedEffect);
            yield return window.Run(outcome);
        }

        private IEnumerator Run(Outcome outcome)
        {
            // Warm-up: arm the default attack and wait for its first refractory boundary. The
            // approach walk stays outside the window, while the remaining cast or projectile travel
            // can finish inside it. The listed skills are armed inside the window. A character
            // without a default attack arms its first ready listed skill instead.
            var warmup = new ActionTimeline();
            var armed = false;
            var openedAt = 0.0;
            for (var frame = 0; frame < 1800; frame++)
            {
                yield return null;
                if (_player == null || _target == null)
                {
                    outcome.Failure = "The player or the target went away before the window opened.";
                    yield break;
                }
                if (_player.Networktarget == null || _player.Networktarget.netId != _target.netId)
                    _player.CmdSetTarget(_target.netIdentity);
                var reading = ActionInterval.Read(_player);
                warmup.Observe(reading.End, reading.Period);
                if (warmup.Completions.Count > 0)
                {
                    openedAt = warmup.Completions[0];
                    break;
                }
                if (!armed && _player.state == "IDLE")
                {
                    if (_fallback >= 0)
                    {
                        _skills.CmdUse(_fallback, Direction());
                        armed = true;
                    }
                    else
                        armed = TryArm() >= 0;
                }
            }
            if (openedAt <= 0)
            {
                outcome.Failure = armed
                    ? "No action completed within the warm-up, so no window opened."
                    : "No listed skill was ready and affordable and the character holds no default attack.";
                yield break;
            }

            // The window opens at full resources, which is the initial state the engine assumes.
            _player.mana.current = _player.mana.max;
            _player.energy.current = _player.energy.max;

            if (!DamageEvents.TryListen(_player, out var events, out var unavailable))
            {
                outcome.Failure = $"The caster cannot be listened to: {unavailable}.";
                yield break;
            }

            var pets = Companions();
            if (pets.Count != _companionIds.Count)
            {
                events.Dispose();
                outcome.Failure = $"The player holds {pets.Count} companion(s); the fixture declares {_companionIds.Count}.";
                yield break;
            }
            var meters = new CompanionMeters(pets);
            var companionBuffCapabilities = pets.Select(pet => pet.hasBuffs).ToArray();
            foreach (var pet in pets)
            {
                pet.health.current = pet.health.max;
                if (pet.mana != null) pet.mana.current = pet.mana.max;
                if (pet.energy != null) pet.energy.current = pet.energy.max;
                pet.CmdAttackTarget(_target.netIdentity);
            }

            var listedNames = new HashSet<string>(StringComparer.Ordinal);
            foreach (var index in _priority)
                listedNames.Add(_skills.skills[index].name);
            var targetEffectsBefore = Effects.Read(_target);
            TargetStateResult settledTarget = null;

            var timeline = new ActionTimeline();
            var first = ActionInterval.Read(_player);
            timeline.Observe(first.End, first.Period);
            var incoming = new List<IncomingBlow>();
            var attempts = new List<ActionAttempt>();
            var attempted = 0;
            var accepted = 0;
            var targetRefills = 0;
            var playerRefills = 0;
            var lastPlayerHealth = _player.health.current;
            var frames = 0;
            var wasCasting = false;
            var pendingAttempt = false;
            var closedAt = openedAt;
            var failure = (string)null;

            try
            {
                // Tier D verifies PetSkills.NextAttackSkill. Autonomous buff checks would apply a
                // second policy the planner does not claim to model and would change attack time.
                foreach (var pet in pets)
                    pet.hasBuffs = false;

                while (closedAt - openedAt < _seconds)
                {
                    yield return null;
                    frames++;
                    if (_player == null || _target == null)
                    {
                        failure = "The player or the target went away during the window.";
                        break;
                    }
                    ServerClock.TryRead(out closedAt);
                    meters.Observe();
                    if (_stopAfterListedHits > 0)
                    {
                        var listed = 0;
                        foreach (var hit in events.Log.Hits)
                            if (hit.Skill != null && listedNames.Contains(hit.Skill)) listed++;
                        if (listed >= _stopAfterListedHits) break;
                    }
                    if (_stopAfterListedEffect)
                    {
                        var currentEffects = Effects.Read(_target);
                        if (currentEffects.Any(effect => listedNames.Contains(effect.Name)))
                        {
                            settledTarget = TargetState.Read(
                                _target, targetEffectsBefore, currentEffects, frames, closedAt);
                            break;
                        }
                    }

                    // Incoming blows: the player's health only falls when something hits it.
                    var health = _player.health.current;
                    if (health < lastPlayerHealth)
                        incoming.Add(new IncomingBlow { At = closedAt, Amount = lastPlayerHealth - health });
                    if (health < _player.health.max / 2)
                    {
                        _player.health.current = _player.health.max;
                        playerRefills++;
                        health = _player.health.current;
                    }
                    lastPlayerHealth = health;

                    // Keep the target alive, at full mana, and targeted. The target is declared at
                    // its full state, and a mana-burning hit is sized by the mana it finds.
                    if (_target.health.current <= 0)
                    {
                        failure = "The target died inside the window.";
                        break;
                    }
                    if (_target.health.current < _target.health.max)
                    {
                        _target.health.current = _target.health.max;
                        targetRefills++;
                    }
                    if (_target.mana.current < _target.mana.max)
                        _target.mana.current = _target.mana.max;
                    if (_keepResourcesFull)
                    {
                        _player.mana.current = _player.mana.max;
                        _player.energy.current = _player.energy.max;
                    }
                    if (_player.Networktarget == null || _player.Networktarget.netId != _target.netId)
                        _player.CmdSetTarget(_target.netIdentity);

                    // Completed actions and acceptance of the last attempt.
                    var reading = ActionInterval.Read(_player);
                    timeline.Observe(reading.End, reading.Period);
                    var casting = ActionInterval.IsActing(_player);
                    if (pendingAttempt && casting && !wasCasting)
                    {
                        accepted++;
                        pendingAttempt = false;
                    }
                    wasCasting = casting;

                    // Priority policy: the first listed skill that is ready and affordable, else
                    // the default attack. Once armed, the engine's follow-up loop fires the default
                    // attack itself, so it is not re-armed.
                    if (!casting && _player.state == "IDLE")
                    {
                        var mana = _player.mana.current;
                        var energy = _player.energy.current;
                        var armedIndex = TryArm();
                        if (armedIndex >= 0)
                        {
                            attempted++;
                            pendingAttempt = true;
                            attempts.Add(new ActionAttempt
                            {
                                At = closedAt,
                                Skill = _skills.skills[armedIndex].name,
                                Mana = mana,
                                Energy = energy,
                            });
                        }
                    }
                }
                if (_stopAfterListedEffect && settledTarget == null && failure == null)
                    failure = "No listed target effect landed before the window closed.";
            }
            finally
            {
                for (var i = 0; i < pets.Count; i++)
                    pets[i].hasBuffs = companionBuffCapabilities[i];

                var measured = events.Measured(timeline, 0, openedAt, closedAt);
                events.Dispose();
                var compactWindow = _stopAfterListedHits > 0 || _stopAfterListedEffect;
                // A projectile from the warm-up action can arrive after the boundary. Damage from
                // that pre-window action is not part of the rotation, so keep hits only after the
                // first action that completed inside the window.
                var firstWindowCompletion = timeline.Completions.Count > 0
                    ? timeline.Completions[0]
                    : openedAt;
                var retainedHits = compactWindow
                    ? measured.Hits.Where(hit => hit.Skill != null && listedNames.Contains(hit.Skill)).ToList()
                    : measured.Hits.Where(hit => hit.At >= firstWindowCompletion).ToList();
                var retainedAttempts = compactWindow
                    ? new List<ActionAttempt>()
                    : attempts;
                outcome.Sample = new WindowSample
                {
                    OpenedAt = openedAt,
                    ClosedAt = closedAt,
                    Hits = retainedHits,
                    Completions = compactWindow ? new List<double>() : new List<double>(timeline.Completions),
                    Intervals = compactWindow ? new List<double>() : new List<double>(timeline.Intervals),
                    Resets = timeline.Resets,
                    Incoming = incoming,
                    Attempts = retainedAttempts,
                    Counts = new ActionCounts
                    {
                        Attempted = attempted,
                        Accepted = accepted,
                        Completed = timeline.Completions.Count,
                        Landed = measured.Hits.Count - measured.Absorbed,
                    },
                    Fidelity = measured.Tier,
                    FidelityLimit = measured.TierLimit,
                    AverageFrameSeconds = frames == 0 ? 0 : (closedAt - openedAt) / frames,
                    TargetHealthRefills = targetRefills,
                    PlayerHealthRefills = playerRefills,
                    SettledTarget = settledTarget,
                    CompanionDamage = pets.Select((pet, i) => new CompanionDamage
                    {
                        EntityId = _companionIds[i],
                        Name = pet.nameEntity,
                        Archetype = pet.typeMonster,
                        Damage = meters.Total[i],
                    }).ToList(),
                };
            }
            if (failure != null)
                outcome.Failure = failure;
        }

        private Vector2 Direction()
        {
            Vector2 toTarget = (Vector2)_target.transform.position - (Vector2)_player.transform.position;
            return toTarget.sqrMagnitude > 1e-6f ? toTarget.normalized : Vector2.down;
        }
    }
}
