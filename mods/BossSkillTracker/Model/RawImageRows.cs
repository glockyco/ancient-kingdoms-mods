using System;

namespace BossSkillTracker.Model;

public static class RawImageRows
{
    public static void FlipVerticalInPlace(byte[] pixels, int width, int height, int bytesPerPixel)
    {
        if (pixels == null) throw new ArgumentNullException(nameof(pixels));
        if (width <= 0) throw new ArgumentOutOfRangeException(nameof(width));
        if (height <= 0) throw new ArgumentOutOfRangeException(nameof(height));
        if (bytesPerPixel <= 0) throw new ArgumentOutOfRangeException(nameof(bytesPerPixel));

        int rowLength = checked(width * bytesPerPixel);
        int expectedLength = checked(rowLength * height);
        if (pixels.Length != expectedLength)
            throw new ArgumentException($"Expected {expectedLength} bytes for {width}x{height}x{bytesPerPixel}, got {pixels.Length}.", nameof(pixels));

        byte[] scratch = new byte[rowLength];
        for (int top = 0, bottom = height - 1; top < bottom; top++, bottom--)
        {
            int topOffset = top * rowLength;
            int bottomOffset = bottom * rowLength;
            Buffer.BlockCopy(pixels, topOffset, scratch, 0, rowLength);
            Buffer.BlockCopy(pixels, bottomOffset, pixels, topOffset, rowLength);
            Buffer.BlockCopy(scratch, 0, pixels, bottomOffset, rowLength);
        }
    }
}
