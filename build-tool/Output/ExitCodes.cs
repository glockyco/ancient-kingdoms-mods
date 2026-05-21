namespace BuildTool.Output;

public static class ExitCodes
{
    public const int Success = 0;
    public const int Internal = 1;
    public const int InvalidUsage = 2;
    public const int Unreachable = 3;
    public const int AuthFailed = 4;
    public const int LeaseConflict = 5;
    public const int Timeout = 6;
    public const int CommandFailed = 7;
    public const int Cancelled = 8;

    public static int For(string kind) => kind switch
    {
        "server_unreachable" or "tool_unreachable" => Unreachable,
        "auth_failed" => AuthFailed,
        "lease_conflict" or "lease_required" or "resource_conflict" => LeaseConflict,
        "timeout" => Timeout,
        "command_failed" => CommandFailed,
        "cancelled" => Cancelled,
        "invalid_request" or "validation_failed" => InvalidUsage,
        "internal" => Internal,
        _ => Internal,
    };
}
