using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;

namespace BuildTool.HotRepl;

internal static class HotReplLauncher
{
    public static ProcessStartInfo CreateMacLaunchInfo(string gamePath, string winePath, string winePrefix)
    {
        var bottleName = Path.GetFileName(winePrefix);
        var psi = new ProcessStartInfo
        {
            FileName = winePath,
            Arguments = "ancientkingdoms.exe",
            WorkingDirectory = gamePath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = false,
        };
        psi.Environment["CX_BOTTLE"] = bottleName;
        psi.Environment["WINEPREFIX"] = winePrefix;
        psi.Environment["DOTNET_ROOT"] = @"C:\Program Files\dotnet";
        return psi;
    }

    public static ProcessStartInfo CreateWindowsLaunchInfo(string gamePath)
    {
        return new ProcessStartInfo
        {
            FileName = Path.Combine(gamePath, "ancientkingdoms.exe"),
            Arguments = "",
            WorkingDirectory = gamePath,
            UseShellExecute = false,
            RedirectStandardOutput = false,
            RedirectStandardError = false,
        };
    }

    public static bool WaitForPort(string host, int port, TimeSpan timeout)
    {
        var deadline = DateTimeOffset.UtcNow + timeout;
        while (DateTimeOffset.UtcNow < deadline)
        {
            try
            {
                using var client = new TcpClient();
                var connectTask = client.ConnectAsync(host, port);
                if (connectTask.Wait(TimeSpan.FromMilliseconds(500)) && client.Connected)
                    return true;
            }
            catch
            {
            }

            Thread.Sleep(500);
        }

        return false;
    }
}
