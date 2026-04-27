using BuildTool.HotRepl;
using Xunit;

namespace BuildTool.Tests;

public class HotReplSmokeTests
{
    [Fact]
    public void BasicSmokeCommands_AreMainMenuSafe()
    {
        var commands = HotReplSmokeRunner.BuildSmokeCommands(includeWorldChecks: false, url: "ws://localhost:18590");

        Assert.Contains(commands, c => c.Arguments.Contains("info"));
        Assert.Contains(commands, c => c.Arguments.Contains("ping"));
        Assert.Contains(commands, c => c.Arguments.Contains("1 + 1"));
        Assert.Contains(commands, c => c.Arguments.Contains("UnityEngine.Application.version"));
        Assert.DoesNotContain(commands, c => c.Arguments.Contains("Il2Cpp.Monster"));
    }

    [Fact]
    public void WorldSmokeCommands_IncludeIl2CppAndSceneGraphChecks()
    {
        var commands = HotReplSmokeRunner.BuildSmokeCommands(includeWorldChecks: true, url: "ws://localhost:18590");

        Assert.Contains(commands, c => c.Arguments.Contains("Il2Cpp.Monster"));
        Assert.Contains(commands, c => c.Arguments.Contains("Il2CppHelpers.FindObjects"));
        Assert.Contains(commands, c => c.Arguments.Contains("UnityHelpers.SceneGraph"));
    }
}
