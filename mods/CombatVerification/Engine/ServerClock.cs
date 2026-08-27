#nullable disable
using Il2Cpp;
using Il2CppMirror;

namespace CombatVerification.Engine
{
    /// <summary>
    /// The clock the game stamps its own combat timestamps with.
    /// </summary>
    /// <remarks>
    /// Every moment recorded in combat state comes from the game's corrected server time, which is
    /// network time plus the offset the manager holds. A probe that read any other clock would
    /// report intervals in one frame of reference and moments in another, and the two would drift
    /// apart by whatever the offset happens to be.
    /// </remarks>
    internal static class ServerClock
    {
        /// <summary>The game's server time, or false when no manager holds the offset.</summary>
        public static bool TryRead(out double now)
        {
            var manager = NetworkManager.singleton;
            var mmo = manager == null ? null : manager.TryCast<NetworkManagerMMO>();

            if (mmo == null)
            {
                now = 0;
                return false;
            }

            now = mmo.getServerTimeCorrected();
            return true;
        }
    }
}
