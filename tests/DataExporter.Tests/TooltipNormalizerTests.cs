using DataExporter.Exporters;
using Xunit;

namespace DataExporter.Tests;

public class TooltipNormalizerTests
{
    [Fact]
    public void RequiredLevelExportsTheSameWithOrWithoutPlayerEmphasis()
    {
        const string plain = "Requires Level 50";
        const string emphasized = "<color=red>Requires Level 50</color>";

        Assert.Equal(
            TooltipNormalizer.WithoutPlayerEmphasis(plain, [plain]),
            TooltipNormalizer.WithoutPlayerEmphasis(emphasized, [plain]));
    }

    [Fact]
    public void RequiredClassExportsTheSameWithOrWithoutPlayerEmphasis()
    {
        const string requiredClass = "Warrior, Ranger";
        const string plain = $"Required class: {requiredClass}";
        const string emphasized =
            $"Required class: <color=red>{requiredClass}</color>";

        Assert.Equal(
            TooltipNormalizer.WithoutPlayerEmphasis(plain, [requiredClass]),
            TooltipNormalizer.WithoutPlayerEmphasis(emphasized, [requiredClass]));
    }

    [Fact]
    public void OtherTagsAndAuthoredRedTextStayUntouched()
    {
        const string level = "Requires Level 50";
        const string tooltip =
            "<b>Relic</b>\n"
            + "<color=#32FF00>Usable</color>\n"
            + "<color=red>A dangerous secret</color>\n"
            + "<color=red>Requires Level 50</color>";

        const string expected =
            "<b>Relic</b>\n"
            + "<color=#32FF00>Usable</color>\n"
            + "<color=red>A dangerous secret</color>\n"
            + "Requires Level 50";

        Assert.Equal(
            expected,
            TooltipNormalizer.WithoutPlayerEmphasis(tooltip, [level]));
    }
}
