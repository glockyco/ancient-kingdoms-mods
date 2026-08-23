using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

/// <summary>
/// The grammar here is taken from the live bottle's own <c>content_log.txt</c>, which is the
/// only place the two dispositions can be observed together.
/// </summary>
public class SteamLogsTests
{
    private const string AppId = "2241380";

    [Fact]
    public void SchedulerResult_IsFoundWhenSteamDropsTheApplication()
    {
        const string log =
            "[2026-08-23 15:02:17] AppID 2241380 App update changed : Running Update,Verifying Installed,\n"
            + "[2026-08-23 15:02:29] AppID 2241380 App update changed : None\n"
            + "[2026-08-23 15:02:29] AppID 2241380 scheduler finished : removed from schedule (result No Error, state 0xc) \n";

        Assert.Equal("No Error", SteamLogs.FindSchedulerResult(log, AppId));
    }

    /// <summary>
    /// A suspended download reports that it is staying in the schedule and later resumes. It
    /// finished a pass, not the work, so it must not end the wait.
    /// </summary>
    [Fact]
    public void SchedulerResult_IgnoresARunThatStaysInTheSchedule()
    {
        const string log =
            "[2026-08-08 17:00:10] AppID 2241380 update canceled : Priority (Suspended)\n"
            + "[2026-08-08 17:00:10] AppID 2241380 scheduler finished : staying in schedule (result Suspended, state 0x40a) \n";

        Assert.Null(SteamLogs.FindSchedulerResult(log, AppId));
    }

    [Fact]
    public void SchedulerResult_ReportsAFailureResultRatherThanHidingIt()
    {
        const string log =
            "[2026-08-08 17:00:10] AppID 2241380 scheduler finished : removed from schedule (result Suspended, state 0x40a) \n";

        Assert.Equal("Suspended", SteamLogs.FindSchedulerResult(log, AppId));
    }

    [Fact]
    public void SchedulerResult_IgnoresOtherApplicationsInTheSameBottle()
    {
        const string log =
            "[2026-08-23 15:02:30] AppID 228980 scheduler finished : removed from schedule (result No Error, state 0xc) \n"
            + "[2026-08-23 15:02:30] AppID 2382520 scheduler finished : removed from schedule (result No Error, state 0xc) \n";

        Assert.Null(SteamLogs.FindSchedulerResult(log, AppId));
        Assert.Equal("No Error", SteamLogs.FindSchedulerResult(log, "228980"));
    }

    [Fact]
    public void SchedulerResult_TakesTheLastPassWhenSteamRunsSeveral()
    {
        const string log =
            "[2026-08-08 17:00:10] AppID 2241380 scheduler finished : staying in schedule (result Suspended, state 0x40a) \n"
            + "[2026-08-08 17:06:06] AppID 2241380 scheduler finished : removed from schedule (result No Error, state 0xc) \n";

        Assert.Equal("No Error", SteamLogs.FindSchedulerResult(log, AppId));
    }

    [Fact]
    public void SchedulerResult_IsAbsentWhileSteamIsStillWorking()
    {
        const string log =
            "[2026-08-08 16:59:47] AppID 2241380 App update changed : Running Update,Downloading,Staging,\n"
            + "[2026-08-08 16:59:47] AppID 2241380 preallocated 79 files (6969 MB) \n";

        Assert.Null(SteamLogs.FindSchedulerResult(log, AppId));
    }

    [Fact]
    public void Logon_IsRecognisedFromTheConnectionLog()
    {
        Assert.True(SteamLogs.ShowsLogon(
            "[2026-08-23 10:37:40] [Logging On, 4, 7] [U:1:147039128] RecvMsgClientLogOnResponse() : [U:1:147039128] 'OK'\n"));
        Assert.False(SteamLogs.ShowsLogon("[2026-08-23 10:37:39] [Logging On, 4, 7] connecting\n"));
    }
}
