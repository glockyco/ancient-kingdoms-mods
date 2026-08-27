#nullable disable
using CombatVerification.Engine;
using HotRepl.Control;
using Il2Cpp;

namespace CombatVerification.Commands
{
    /// <summary>
    /// The two things every measurement needs before it can start.
    /// </summary>
    /// <remarks>
    /// Shared because the refusals are text a caller reads, and three copies of a sentence drift into
    /// three different sentences for one condition. A coroutine cannot catch around a yield, so each
    /// check reports through a result rather than raising.
    /// </remarks>
    internal static class Subject
    {
        /// <summary>The local player, or the refusal to hand back.</summary>
        public static bool TryRead<T>(
            ControlCommandContext<T> context,
            out Player player,
            out ControlCommandResult<T> refused)
        {
            player = Player.localPlayer;
            if (player != null)
            {
                refused = default;
                return true;
            }

            refused = context.PreconditionFailed(
                "noLocalPlayer", "No local player exists. Enter the world before reading.");
            return false;
        }

        /// <summary>
        /// The game's own clock, or the refusal to hand back.
        /// </summary>
        /// <remarks>
        /// Read before a measurement rather than during it. Every moment a probe reports is stated in
        /// this clock, so a run that cannot read it produces timestamps that mean nothing, and finding
        /// that out at the end wastes the window.
        /// </remarks>
        public static bool TryReadClock<T>(
            ControlCommandContext<T> context,
            out double now,
            out ControlCommandResult<T> refused)
        {
            if (ServerClock.TryRead(out now))
            {
                refused = default;
                return true;
            }

            refused = context.PreconditionFailed(
                "noServerClock",
                "No network manager holds the time offset, so no moment can be stated.");
            return false;
        }
    }
}
