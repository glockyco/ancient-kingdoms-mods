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

public class BoundingBox
{
    public float min_x { get; set; }
    public float min_y { get; set; }
    public float max_x { get; set; }
    public float max_y { get; set; }

    public BoundingBox(float minX, float minY, float maxX, float maxY)
    {
        min_x = minX;
        min_y = minY;
        max_x = maxX;
        max_y = maxY;
    }
}
