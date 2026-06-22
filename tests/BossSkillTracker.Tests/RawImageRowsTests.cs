using BossSkillTracker.Model;
using Xunit;

public sealed class RawImageRowsTests
{
    [Fact]
    public void Flip_vertical_in_place_reverses_row_order_without_changing_row_bytes()
    {
        byte[] pixels =
        {
            1, 2, 3, 4,
            5, 6, 7, 8,
            9, 10, 11, 12,
        };

        RawImageRows.FlipVerticalInPlace(pixels, width: 2, height: 3, bytesPerPixel: 2);

        Assert.Equal(new byte[]
        {
            9, 10, 11, 12,
            5, 6, 7, 8,
            1, 2, 3, 4,
        }, pixels);
    }
}
