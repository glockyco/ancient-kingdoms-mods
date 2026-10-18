using System;

namespace DataExporter;

internal sealed class ZoneBoundary
{
    internal readonly record struct Point(double X, double Y);

    private readonly Point[] _points;
    private readonly double _minX;
    private readonly double _minY;
    private readonly double _maxX;
    private readonly double _maxY;

    public ZoneBoundary(Point[] points)
    {
        ArgumentNullException.ThrowIfNull(points);
        if (points.Length < 3)
            throw new ArgumentException("A zone boundary needs at least three vertices.", nameof(points));
        _minX = _minY = double.PositiveInfinity;
        _maxX = _maxY = double.NegativeInfinity;
        double area = 0;
        for (int i = 0, previous = points.Length - 1; i < points.Length; previous = i++)
        {
            var point = points[i];
            if (!double.IsFinite(point.X) || !double.IsFinite(point.Y))
                throw new ArgumentException("Zone boundary vertices must be finite.", nameof(points));
            _minX = Math.Min(_minX, point.X);
            _minY = Math.Min(_minY, point.Y);
            _maxX = Math.Max(_maxX, point.X);
            _maxY = Math.Max(_maxY, point.Y);
            area += points[previous].X * point.Y - point.X * points[previous].Y;
        }
        if (area == 0)
            throw new ArgumentException("A zone boundary must enclose an area.", nameof(points));
        _points = points;
    }

    public double BoundsDistanceSquared(double x, double y)
    {
        var dx = x < _minX ? _minX - x : x > _maxX ? x - _maxX : 0;
        var dy = y < _minY ? _minY - y : y > _maxY ? y - _maxY : 0;
        return dx * dx + dy * dy;
    }

    public double DistanceSquared(double x, double y)
    {
        if (!double.IsFinite(x) || !double.IsFinite(y))
            throw new ArgumentException("A zone lookup position must be finite.");
        bool inside = false;
        double nearest = double.PositiveInfinity;
        for (int i = 0, previous = _points.Length - 1; i < _points.Length; previous = i++)
        {
            var a = _points[previous];
            var b = _points[i];
            var dx = b.X - a.X;
            var dy = b.Y - a.Y;
            var lengthSquared = dx * dx + dy * dy;
            var t = lengthSquared == 0 ? 0 : Math.Clamp(((x - a.X) * dx + (y - a.Y) * dy) / lengthSquared, 0, 1);
            var offsetX = x - (a.X + t * dx);
            var offsetY = y - (a.Y + t * dy);
            nearest = Math.Min(nearest, offsetX * offsetX + offsetY * offsetY);
            if ((a.Y > y) != (b.Y > y) && x < (b.X - a.X) * (y - a.Y) / (b.Y - a.Y) + a.X)
                inside = !inside;
        }
        return inside ? 0 : nearest;
    }
}
