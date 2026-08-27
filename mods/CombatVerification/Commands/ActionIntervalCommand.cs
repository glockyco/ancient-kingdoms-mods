#nullable disable
using System;
using System.Collections;
using System.Threading;
using System.Threading.Tasks;
using CombatVerification.Dtos;
using CombatVerification.Probes;
using HotRepl.Control;
using Il2Cpp;
using MelonLoader;

namespace CombatVerification.Commands
{
    /// <summary>
    /// Reads how often the local player can act, and watches for the actions that prove it.
    /// </summary>
    /// <remarks>
    /// A job rather than a synchronous read. The subject has to fall idle, then hold one value across
    /// consecutive samples, and only then can a window observe an action, and none of that happens
    /// inside a single frame.
    /// <para>
    /// The command stills the subject's attack loop, which changes the game. That is reported in the
    /// result rather than assumed, because the reading exists to be attributed to one action and a
    /// loop rewriting the value would leave it attributable to none.
    /// </para>
    /// </remarks>
    public sealed class ActionIntervalCommand
        : IControlCommandHandler<ActionIntervalArgs, ActionIntervalResult>
    {
        /// <summary>How long the subject is given to finish an action already in flight.</summary>
        private static readonly TimeSpan IdleTimeout = TimeSpan.FromSeconds(5);

        /// <summary>How long one value must hold before the reading is attributable.</summary>
        private static readonly TimeSpan SettlePeriod = TimeSpan.FromSeconds(0.25);

        /// <summary>The longest window the command will hold a job open for.</summary>
        private const double MaximumWindowSeconds = 300.0;

        public string Name => "probe.actionInterval";
        public int Version => 1;
        public ControlCommandKind Kind => ControlCommandKind.Job;
        public bool MutatesState => true;

        public ValueTask<ControlCommandResult<ActionIntervalResult>> ExecuteAsync(
            ControlCommandContext<ActionIntervalResult> context,
            ActionIntervalArgs args,
            CancellationToken cancellationToken)
        {
            var completion = new TaskCompletionSource<ControlCommandResult<ActionIntervalResult>>(
                TaskCreationOptions.RunContinuationsAsynchronously);
            MelonCoroutines.Start(RunCoroutine(context, args, cancellationToken, completion));
            return new ValueTask<ControlCommandResult<ActionIntervalResult>>(completion.Task);
        }

        private static IEnumerator RunCoroutine(
            ControlCommandContext<ActionIntervalResult> context,
            ActionIntervalArgs args,
            CancellationToken cancellationToken,
            TaskCompletionSource<ControlCommandResult<ActionIntervalResult>> completion)
        {
            var window = args?.WindowSeconds ?? 0.0;
            if (window < 0 || window > MaximumWindowSeconds)
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "windowOutOfRange",
                    $"windowSeconds is {window}. Give a value from 0 to {MaximumWindowSeconds}."));
                yield break;
            }

            var player = Player.localPlayer;
            if (player == null)
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "noLocalPlayer", "No local player exists. Enter the world before reading."));
                yield break;
            }

            if (!ActionInterval.TryReadClock(out _))
            {
                completion.TrySetResult(context.PreconditionFailed(
                    "noServerClock",
                    "No network manager holds the time offset, so no moment can be stated."));
                yield break;
            }

            var stopped = ActionInterval.Still(player);

            // An action already in flight completes. The loop does not start another.
            var idleBy = DateTime.UtcNow + IdleTimeout;
            while (ActionInterval.IsActing(player))
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    completion.TrySetResult(context.PreconditionFailed("cancelled", "Cancelled."));
                    yield break;
                }

                if (DateTime.UtcNow > idleBy)
                {
                    completion.TrySetResult(ControlCommandResult.Ok(ActionInterval.Unattributable(
                        player, stopped, ActionInterval.Read(player),
                        $"The subject was still acting {IdleTimeout.TotalSeconds} s after its loop "
                        + "was stopped, so no value of its own could be read.")));
                    yield break;
                }

                yield return null;
            }

            // The value must hold across consecutive samples, or something is still writing it.
            var settled = ActionInterval.Read(player);
            var settledBy = DateTime.UtcNow + SettlePeriod;
            while (DateTime.UtcNow < settledBy)
            {
                yield return null;

                var again = ActionInterval.Read(player);
                if (!settled.Matches(again))
                {
                    completion.TrySetResult(ControlCommandResult.Ok(ActionInterval.Unattributable(
                        player, stopped, again,
                        "The refractory state changed between two consecutive samples, so something "
                        + "is still acting and the reading belongs to no single action.")));
                    yield break;
                }
            }

            var timeline = new ActionTimeline();
            timeline.Observe(settled.End, settled.Period);

            ActionInterval.TryReadClock(out var openedAt);
            var closedAt = openedAt;

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
                ActionInterval.TryReadClock(out closedAt);
            }

            completion.TrySetResult(ControlCommandResult.Ok(ActionInterval.Measured(
                player, stopped, ActionInterval.Read(player), timeline, openedAt, closedAt)));
        }
    }
}
