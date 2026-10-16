using BuildTool.Game;
using Xunit;

namespace BuildTool.Tests;

public sealed class GameProcessesTests
{
    [Fact]
    public void SelectsOnlyPositiveGameProcessIdsWithTheExactLaunchTag()
    {
        var snapshot = """
            11 ancientkingdoms.exe --ak-game-session=owned
            12 /wine/winewrapper.exe --run -- ancientkingdoms.exe --ak-game-session=owned
            13 ancientkingdoms.exe
            14 ancientkingdoms.exe --ak-game-session=someone-else
            15 ancientkingdoms.exe --ak-game-session=owned-suffix
            16 another.exe --ak-game-session=owned
            17 ancientkingdoms.exe --not--ak-game-session=owned
             0 ancientkingdoms.exe --ak-game-session=owned
            """;

        Assert.Equal(new[] { 11, 12 }, GameProcesses.OwnedProcessIds(snapshot, "owned"));
    }
}
