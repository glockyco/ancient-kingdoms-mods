using System.Collections.Generic;

namespace DataExporter.Models;

public class Position
{
    public float x { get; set; }
    public float y { get; set; }
    public float z { get; set; }

    public Position(float x, float y, float z)
    {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

public class Point2
{
    public float x { get; set; }
    public float y { get; set; }

    public Point2(float x, float y)
    {
        this.x = x;
        this.y = y;
    }
}

/// <summary>
/// The world-space shape of a trigger collider. A circle has a center and radius. A polygon lists
/// its vertices in authored order, which also covers a box collider's four corners.
/// </summary>
public class TriggerArea
{
    public string shape { get; set; }
    public Point2 center { get; set; }
    public float? radius { get; set; }
    public List<Point2> points { get; set; }
}
