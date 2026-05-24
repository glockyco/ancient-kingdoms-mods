namespace BuildTool.Output;

public static class ExitCodes
{
    public const int Success = 0;
    public const int Internal = 1;
    public const int InvalidUsage = 2;
    public const int Unreachable = 3;
    public const int PermissionFailed = 4;  // OS/file permission failures (was AuthFailed)
    public const int ResourceConflict = 5;  // file lock, busy export (was LeaseConflict)
    public const int ReadinessFailed = 6;   // timed out waiting for game/command readiness (was Timeout)
    public const int CommandFailed = 7;
    public const int Cancelled = 8;

    public static int For(string kind) => kind switch
    {
        "server_unreachable" or "tool_unreachable" => Unreachable,
        "auth_failed" => PermissionFailed,
        "lease_conflict" or "lease_required" or "resource_conflict" => ResourceConflict,
        "timeout" => ReadinessFailed,
        "command_failed" => CommandFailed,
        "cancelled" => Cancelled,
        "invalid_request" or "validation_failed" => InvalidUsage,
        "internal" => Internal,
        _ => Internal,
    };
}
