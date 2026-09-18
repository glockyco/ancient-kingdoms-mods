#nullable disable
using System.Collections;
using System.Collections.Generic;
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
    /// The window opens at the first completed action, so it starts with the default attack on its
    /// refractory period and the approach walk outside it.
    /// </summary>
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

        private FixtureWindow(Player player, Monster target, IReadOnlyList<int> priority, double seconds)
        {
            _player = player;
            _skills = player.skills.TryCast<PlayerSkills>();
            _target = target;
            _priority = priority;
            _seconds = seconds;
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

        public static IEnumerator RunCoroutine(
            Player player, Monster target, IReadOnlyList<int> priority, double seconds, Outcome outcome)
        {
            var window = new FixtureWindow(player, target, priority, seconds);
            yield return window.Run(outcome);
        }

        private IEnumerator Run(Outcome outcome)
        {
            // Warm-up: arm the first listed action and wait for its completion. The window opens
            // at that completion, so the approach walk and the first cast stay outside it and the
            // default attack starts the window on its refractory period.
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
                    _skills.CmdUse(_priority[0], Direction());
                    armed = true;
                }
            }
            if (openedAt <= 0)
            {
                outcome.Failure = "No action completed within the warm-up, so no window opened.";
                yield break;
            }

            if (!DamageEvents.TryListen(_player, out var events, out var unavailable))
            {
                outcome.Failure = $"The caster cannot be listened to: {unavailable}.";
                yield break;
            }

            var timeline = new ActionTimeline();
            var first = ActionInterval.Read(_player);
            timeline.Observe(first.End, first.Period);
            var incoming = new List<IncomingBlow>();
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

                    // Keep the target alive and targeted.
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

                    // Priority policy: the first listed skill that is ready and affordable. The
                    // armed follow-up loop fires the default attack itself.
                    if (!casting && _player.state == "IDLE")
                    {
                        foreach (var index in _priority)
                        {
                            var skill = _skills.skills[index];
                            if (skill.data.learnDefault && _player.NetworkcontinueFollowUpSkill >= 0)
                                continue;
                            if (!skill.IsReady()) continue;
                            if (_player.mana.current < skill.manaCosts || _player.energy.current < skill.energyCosts)
                                continue;
                            attempted++;
                            pendingAttempt = true;
                            _skills.CmdUse(index, Direction());
                            break;
                        }
                    }
                }
            }
            finally
            {
                var measured = events.Measured(timeline, 0, openedAt, closedAt);
                events.Dispose();
                outcome.Sample = new WindowSample
                {
                    OpenedAt = openedAt,
                    ClosedAt = closedAt,
                    Hits = measured.Hits,
                    Completions = new List<double>(timeline.Completions),
                    Intervals = new List<double>(timeline.Intervals),
                    Resets = timeline.Resets,
                    Incoming = incoming,
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
