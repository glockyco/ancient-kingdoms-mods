using System;
using DataExporter;
using Xunit;
using Point = DataExporter.ZoneBoundary.Point;

namespace DataExporter.Tests;

public class ZoneBoundaryTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void ConcaveBoundaryDoesNotTreatItsBoundingBoxAsTheZone(bool reverse)
    {
        Point[] vertices = { new(0, 0), new(4, 0), new(4, 1), new(1, 1), new(1, 4), new(0, 4) };
        if (reverse) Array.Reverse(vertices);
        var boundary = new ZoneBoundary(vertices);

        Assert.Equal(0, boundary.DistanceSquared(0.5, 3));
        Assert.Equal(0, boundary.DistanceSquared(3, 0.5));
        Assert.Equal(0, boundary.DistanceSquared(1, 2));
        Assert.Equal(0, boundary.BoundsDistanceSquared(2, 2));
        Assert.Equal(1, boundary.DistanceSquared(2, 2));
        Assert.Equal(2, boundary.BoundsDistanceSquared(5, 5));
        Assert.Equal(17, boundary.DistanceSquared(5, 5));
    }

    [Theory]
    [InlineData(0, 0, 0)]
    [InlineData(1, 1, 0)]
    [InlineData(2, 0, 0)]
    [InlineData(3, 0, 1)]
    [InlineData(3, 3, 8)]
    [InlineData(-3, -3, 8)]
    public void RotatedBoundaryUsesSegmentsRatherThanAxisAlignedBounds(double x, double y, double distance)
    {
        var boundary = new ZoneBoundary(new Point[] { new(0, 2), new(2, 0), new(0, -2), new(-2, 0) });
        Assert.Equal(distance, boundary.DistanceSquared(x, y), 10);
    }

    [Fact]
    public void RepeatedClosingVertexDoesNotCorruptOutsideDistance()
    {
        var boundary = new ZoneBoundary(new Point[] { new(100, -50), new(110, -50), new(110, -40), new(100, -40), new(100, -50) });
        Assert.Equal(0, boundary.DistanceSquared(105, -45));
        Assert.Equal(8, boundary.DistanceSquared(112, -38));
    }

    [Fact]
    public void DegenerateAndNonfiniteAuthoredBoundariesFail()
    {
        Assert.Throws<ArgumentException>(() => new ZoneBoundary(new Point[] { new(0, 0), new(1, 1) }));
        Assert.Throws<ArgumentException>(() => new ZoneBoundary(new Point[] { new(0, 0), new(1, 1), new(2, 2) }));
        Assert.Throws<ArgumentException>(() => new ZoneBoundary(new Point[] { new(0, 0), new(double.NaN, 1), new(2, 0) }));
        Assert.Throws<ArgumentException>(() => new ZoneBoundary(new Point[] { new(0, 0), new(1, double.PositiveInfinity), new(2, 0) }));
    }
}
