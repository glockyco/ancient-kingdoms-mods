using System.Text;
using AncientKingdomsMods.Shared.Updates;
using Xunit;

namespace PocketCompendium.Tests.Updates;

public sealed class UpdateHandoffTests
{
    [Fact]
    public void The_mod_reads_the_report_the_updater_published_in_the_same_process()
    {
        byte[] list = Encoding.UTF8.GetBytes("{}");
        UpdateHandoff.Publish(UpdateOutcome.InstallFailed, new VerifiedList(list, "signature", null!), "1.0.3", "denied");

        var report = UpdateHandoff.Read();

        Assert.NotNull(report);
        Assert.Equal(UpdateOutcome.InstallFailed, report.Outcome);
        Assert.Same(list, report.List);
        Assert.Equal("signature", report.Signature);
        Assert.Equal("1.0.3", report.Version);
        Assert.Equal("denied", report.Reason);

        // A later report replaces the earlier one, as a download that outlasted the wait reports again.
        UpdateHandoff.Publish(UpdateOutcome.Downloaded, version: "1.0.3");
        Assert.Equal(UpdateOutcome.Downloaded, UpdateHandoff.Read()!.Outcome);
        Assert.Null(UpdateHandoff.Read()!.List);
    }
}
