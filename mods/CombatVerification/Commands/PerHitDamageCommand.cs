#nullable disable
using System;
using System.Collections;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Engine;
using CombatVerification.Probes;
using HotRepl.Control;
using Il2Cpp;
using MelonLoader;

namespace CombatVerification.Commands
{
    /// <summary>
    /// Records every hit the local player deals inside a window.
    /// </summary>
    /// <remarks>
    /// This is the probe that makes a damage rule measurable. Sampling the caster's running total on
    /// a timer cannot do it: a sample that spans two hits reports their sum as one, and any mean
    /// taken that way mixes the hits that landed with the actions that missed, so two configurations
    /// differing in accuracy are not comparable at all. Reading the total inside the hit event gives
    /// one amount per landing, because a missed action never raises the event.
    /// <para>
    /// The probe listens and does not drive. Whatever a fixture declares as its action has to be
    /// running, and unlike the interval probe this one must not still the caster, because it exists
    /// to watch actions happen rather than to read the state between them.
    /// </para>
    /// <para>
    /// It attaches one listener to the caster and removes it when the window closes, including when
    /// the job is cancelled, and it seeds the engine's generator. Those are the only changes it makes.
    /// </para>
    /// </remarks>
    public sealed class PerHitDamageCommand
        : IControlCommandHandler<PerHitDamageArgs, PerHitDamageResult>
    {
        /// <summary>The longest window the command will hold a job open for.</summary>
        private const double MaximumWindowSeconds = 300.0;

        public string Name => "probe.perHitDamage";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<PerHitDamageResult>> ExecuteAsync(
            ControlCommandContext<PerHitDamageResult> context,
            PerHitDamageArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<PerHitDamageResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, args, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<PerHitDamageResult>>(completion.Task);
        }

        private static IEnumerator RunCoroutine(
            ControlCommandContext<PerHitDamageResult> context,
            PerHitDamageArgs args,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<PerHitDamageResult>> completion)
        {
            var window = args?.WindowSeconds ?? 0.0;
            if (window <= 0 || window > MaximumWindowSeconds)
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "windowOutOfRange",
                    $"windowSeconds is {window}. Give a value above 0 and up to "
                    + $"{MaximumWindowSeconds}. A window of nothing observes no hit."));
                yield break;
            }

            if (!Subject.TryRead(context, out var player, out var refused)
                || !Subject.TryReadClock(context, out var openedAt, out refused))
            {
                completion.TrySetResult(refused);
                yield break;
            }

            if (!DamageEvents.TryListen(player, out var events, out var unavailable))
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "casterUnavailable",
                    $"The local player cannot be listened to: {unavailable}."));
                yield break;
            }

            // The same loop derives how often the caster acted, because a landing count alone
            // cannot say whether an action missed, and the interval probe cannot be asked: it
            // stills the attack loop that this measurement needs running.
            // Seeded before the window so the run states its starting point. This does not make the
            // run repeat: the engine draws from one generator for every system, so the sequence
            // depends on which other consumers drew and in what order.
            var seed = args.Seed ?? Environment.TickCount;
            UnityEngine.Random.InitState(seed);

            var timeline = new ActionTimeline();
            var closedAt = openedAt;

            try
            {
                while (closedAt - openedAt < window)
                {
                    if (cancellationToken.IsCancellationRequested)
                    {
                        completion.TrySetResult(context.PreconditionFailed("cancelled", "Cancelled."));
                        yield break;
                    }

                    yield return null;

                    if (player == null)
                    {
                        completion.TrySetResult(context.PreconditionFailed(
                            "playerLost", "The local player went away while the window was open."));
                        yield break;
                    }

                    var reading = ActionInterval.Read(player);
                    timeline.Observe(reading.End, reading.Period);
                    ServerClock.TryRead(out closedAt);
                }

                completion.TrySetResult(ControlCommandResult.Ok(
                    events.Measured(timeline, seed, openedAt, closedAt)));
            }
            finally
            {
                events.Dispose();
            }
        }
    }
}
