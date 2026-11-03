// Oblivious, because Pocket Compendium's game references hide the compiler's nullable attributes.
#nullable disable
using System;

namespace AncientKingdomsMods.Shared.Updates;

/// <summary>What the updater did in this start.</summary>
internal enum UpdateOutcome
{
    UpToDate,
    Installed,
    Downloading,
    Downloaded,
    CheckFailed,
    InstallFailed,
}

/// <summary>The updater's last report in this game process.</summary>
internal sealed class UpdateReport
{
    public UpdateReport(UpdateOutcome outcome, byte[] list, string signature, string version, string reason)
    {
        Outcome = outcome;
        List = list;
        Signature = signature;
        Version = version;
        Reason = reason;
    }

    public UpdateOutcome Outcome { get; }

    /// <summary>The verified mod list's bytes, when the check got that far.</summary>
    public byte[] List { get; }
    public string Signature { get; }

    /// <summary>The version the outcome is about: the one installed, downloading or failed.</summary>
    public string Version { get; }
    public string Reason { get; }
}

/// <summary>
/// Passes the updater's report to Pocket Compendium in the same game process. The two are separate
/// assemblies that each compile this file, so the report travels as framework types only.
/// </summary>
internal static class UpdateHandoff
{
    private const string Key = "AncientKingdomsMods.Updates.Report";

    public static void Publish(UpdateOutcome outcome, VerifiedList list = null, string version = null, string reason = null) =>
        AppDomain.CurrentDomain.SetData(Key, new object[] { outcome.ToString(), list?.Bytes, list?.Signature, version, reason });

    /// <summary>The updater's report, or null when no updater ran in this process.</summary>
    public static UpdateReport Read()
    {
        if (AppDomain.CurrentDomain.GetData(Key) is not object[] { Length: 5 } data) return null;
        if (data[0] is not string name || !Enum.TryParse(name, out UpdateOutcome outcome)) return null;
        return new UpdateReport(outcome, data[1] as byte[], data[2] as string, data[3] as string, data[4] as string);
    }
}
