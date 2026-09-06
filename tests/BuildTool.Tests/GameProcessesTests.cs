using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public sealed class GameProcessesTests
{
    [Fact]
    public void SelectsOnlyPositiveGameProcessIdsWithTheExactLaunchTag()
    {
        var snapshot = """
            11 ancientkingdoms.exe --ak-verification-session=owned
            12 /wine/winewrapper.exe --run -- ancientkingdoms.exe --ak-verification-session=owned
            13 ancientkingdoms.exe
            14 ancientkingdoms.exe --ak-verification-session=someone-else
            15 ancientkingdoms.exe --ak-verification-session=owned-suffix
            16 another.exe --ak-verification-session=owned
            17 ancientkingdoms.exe --not--ak-verification-session=owned
             0 ancientkingdoms.exe --ak-verification-session=owned
            """;

        Assert.Equal(new[] { 11, 12 }, GameProcesses.OwnedProcessIds(snapshot, "owned"));
    }
}
