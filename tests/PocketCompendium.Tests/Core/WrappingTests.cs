using PocketCompendium.Core.Text;
using Xunit;

namespace PocketCompendium.Tests.Core;

/// <summary>A wrapped line never ends with one word alone.</summary>
public class WrappingTests
{
    [Fact]
    public void EachLineKeepsItsLastTwoWordsTogether()
    {
        Assert.Equal("Spawns when Large Shade Beast\u00A0dies.\nLarge Shade Beast is out of\u00A0sight.",
            Wrapping.KeepLastWordsTogether("Spawns when Large Shade Beast dies.\nLarge Shade Beast is out of sight."));
    }

    [Fact]
    public void TagsBelongToTheirWord()
    {
        Assert.Equal("Next spawn in\u00A0<b>12:04</b>.\n<color=#A3B0BF>Spawn point</color> 206 yd\u00A0northwest",
            Wrapping.KeepLastWordsTogether("Next spawn in <b>12:04</b>.\n<color=#A3B0BF>Spawn point</color> 206 yd northwest"));
        Assert.Equal("The next roll is in\u00A0<b>18:44</b>.",
            Wrapping.KeepLastWordsTogether("The next roll is in <b>18:44</b>."));
    }

    [Fact]
    public void LinesWithoutTwoWordsStayAsTheyAre()
    {
        const string text = "Up now.\n<size=50%> </size>\n<b>???</b>\nDue ";
        Assert.Equal("Up\u00A0now.\n<size=50%> </size>\n<b>???</b>\nDue ", Wrapping.KeepLastWordsTogether(text));
    }

    [Fact]
    public void BoundWordsStayBoundOnASecondPass()
    {
        string once = Wrapping.KeepLastWordsTogether("Show the list of herbs, ores, fish and sparks.");
        Assert.Equal("Show the list of herbs, ores, fish and\u00A0sparks.", once);
        Assert.Equal(once, Wrapping.KeepLastWordsTogether(once));
    }
}
