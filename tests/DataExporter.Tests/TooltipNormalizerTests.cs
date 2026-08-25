using DataExporter.Exporters;
using Xunit;

namespace DataExporter.Tests;

public class TooltipNormalizerTests
{
    [Fact]
    public void RequiredLevelExportsTheSameWithOrWithoutPlayerEmphasis()
    {
        const string level = "50";
        const string plain = "Requires Level 50";
        const string emphasized = "Requires Level <color=red>50</color>";

        Assert.Equal(
            TooltipNormalizer.WithoutPlayerEmphasis(plain, [level]),
            TooltipNormalizer.WithoutPlayerEmphasis(emphasized, [level]));
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
    public void DifferentPlayerBindPointsExportTheSameGenericDestination()
    {
        const string twilight = "Returns to your bind point.\n\n[Twilight Forest]";
        const string everfrost = "Returns to your bind point.\n\n[Everfrost]";
        const string expected = "Returns to your bind point.\n\n[Bind Point]";

        Assert.Equal(
            expected,
            TooltipNormalizer.WithGenericBindPoint(
                twilight,
                "Twilight Forest",
                "Bind Point"));
        Assert.Equal(
            expected,
            TooltipNormalizer.WithGenericBindPoint(
                everfrost,
                "Everfrost",
                "Bind Point"));
        Assert.Equal(
            twilight,
            TooltipNormalizer.WithGenericBindPoint(
                twilight,
                "Everfrost",
                "Bind Point"));
    }

    [Fact]
    public void FragmentProgressExportsZeroBaseline()
    {
        const string incomplete =
            "Fragments:  <b><color=#FF0000>0</color></b> / 5";
        const string partial =
            "Fragments:  <b><color=#FF0000>3</color></b> / 5";
        const string complete =
            "Fragments:  <b><color=#00FF00>5 / 5</color></b>";
        const string expected = "Fragments:  0 / 5";

        Assert.Equal(
            expected,
            TooltipNormalizer.WithZeroFragmentProgress(incomplete, "5"));
        Assert.Equal(
            expected,
            TooltipNormalizer.WithZeroFragmentProgress(partial, "5"));
        Assert.Equal(
            expected,
            TooltipNormalizer.WithZeroFragmentProgress(complete, "5"));
        Assert.Equal(
            incomplete,
            TooltipNormalizer.WithZeroFragmentProgress(incomplete, "6"));
    }

    [Fact]
    public void OtherTagsAndAuthoredRedTextStayUntouched()
    {
        const string level = "50";
        const string tooltip =
            "<b>Relic</b>\n"
            + "<color=#32FF00>Usable</color>\n"
            + "<color=red>A dangerous secret</color>\n"
            + "Requires Level <color=red>50</color>";

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
