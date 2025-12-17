#!/usr/bin/env python3
"""
Analyze the stitched world map to determine black border sizes on each edge.

This script scans the world map from each edge to find where actual content begins,
helping identify how much empty space exists and if any content is being cut off.
"""

import os
from pathlib import Path
from PIL import Image
import numpy as np

# Disable PIL decompression bomb check for large game maps
Image.MAX_IMAGE_PIXELS = None

def find_content_bounds(img_array, threshold=10):
    """
    Find the bounding box of non-black content in the image.

    Args:
        img_array: numpy array of image (height, width, channels)
        threshold: pixel value threshold - pixels below this are considered black

    Returns:
        (top, bottom, left, right) pixel coordinates of content bounds
    """
    # Convert to grayscale by averaging RGB channels
    if len(img_array.shape) == 3:
        gray = np.mean(img_array, axis=2)
    else:
        gray = img_array

    # Find rows and columns with non-black pixels
    non_black_rows = np.any(gray > threshold, axis=1)
    non_black_cols = np.any(gray > threshold, axis=0)

    # Find first and last non-black row/column
    non_black_row_indices = np.where(non_black_rows)[0]
    non_black_col_indices = np.where(non_black_cols)[0]

    if len(non_black_row_indices) == 0 or len(non_black_col_indices) == 0:
        return None  # Image is entirely black

    top = non_black_row_indices[0]
    bottom = non_black_row_indices[-1]
    left = non_black_col_indices[0]
    right = non_black_col_indices[-1]

    return (top, bottom, left, right)

def analyze_edge_content(img_array, edge, sample_size=100, threshold=10):
    """
    Analyze content density along an edge.

    Args:
        img_array: numpy array of image
        edge: 'top', 'bottom', 'left', or 'right'
        sample_size: number of pixels from edge to analyze
        threshold: pixel value threshold for non-black

    Returns:
        Dictionary with analysis results
    """
    height, width = img_array.shape[:2]

    if len(img_array.shape) == 3:
        gray = np.mean(img_array, axis=2)
    else:
        gray = img_array

    if edge == 'top':
        sample = gray[:sample_size, :]
        non_black_pixels = np.sum(sample > threshold)
        total_pixels = sample_size * width
    elif edge == 'bottom':
        sample = gray[-sample_size:, :]
        non_black_pixels = np.sum(sample > threshold)
        total_pixels = sample_size * width
    elif edge == 'left':
        sample = gray[:, :sample_size]
        non_black_pixels = np.sum(sample > threshold)
        total_pixels = height * sample_size
    elif edge == 'right':
        sample = gray[:, -sample_size:]
        non_black_pixels = np.sum(sample > threshold)
        total_pixels = height * sample_size
    else:
        raise ValueError(f"Invalid edge: {edge}")

    return {
        'non_black_pixels': non_black_pixels,
        'total_pixels': total_pixels,
        'content_percentage': (non_black_pixels / total_pixels) * 100
    }

def main():
    # Paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    screenshots_dir = Path(os.environ.get('DATA_EXPORT_PATH', project_dir / 'exported-data')) / 'screenshots'
    stitched_dir = screenshots_dir / 'stitched'
    world_map_path = stitched_dir / 'world.png'

    if not world_map_path.exists():
        print(f"Error: World map not found at {world_map_path}")
        return

    print(f"Analyzing: {world_map_path}")
    print()

    # Load image
    img = Image.open(world_map_path)
    img_array = np.array(img)
    height, width = img_array.shape[:2]

    print(f"Image size: {width} × {height} pixels")
    print()

    # Find content bounds
    print("Finding content boundaries...")
    bounds = find_content_bounds(img_array)

    if bounds is None:
        print("Error: Image appears to be entirely black!")
        return

    top, bottom, left, right = bounds

    # Calculate border sizes
    top_border = top
    bottom_border = height - bottom - 1
    left_border = left
    right_border = width - right - 1

    content_width = right - left + 1
    content_height = bottom - top + 1

    print("=" * 60)
    print("BORDER ANALYSIS")
    print("=" * 60)
    print()
    print(f"Top border:    {top_border:5d} pixels ({top_border / height * 100:5.2f}% of image height)")
    print(f"Bottom border: {bottom_border:5d} pixels ({bottom_border / height * 100:5.2f}% of image height)")
    print(f"Left border:   {left_border:5d} pixels ({left_border / width * 100:5.2f}% of image width)")
    print(f"Right border:  {right_border:5d} pixels ({right_border / width * 100:5.2f}% of image width)")
    print()
    print(f"Content bounds: ({left}, {top}) to ({right}, {bottom})")
    print(f"Content size:   {content_width} × {content_height} pixels")
    print()

    # Analyze edge content density (first/last 100 pixels)
    print("=" * 60)
    print("EDGE CONTENT DENSITY (first/last 100 pixels from each edge)")
    print("=" * 60)
    print()

    for edge in ['top', 'bottom', 'left', 'right']:
        analysis = analyze_edge_content(img_array, edge, sample_size=100)
        print(f"{edge.capitalize():6s}: {analysis['content_percentage']:5.2f}% non-black "
              f"({analysis['non_black_pixels']:,} / {analysis['total_pixels']:,} pixels)")

    print()

    # Tile size context (from metadata)
    tile_size = 200  # world units per tile
    pixels_per_tile = 2048  # pixels per tile
    pixels_per_world_unit = pixels_per_tile / tile_size

    # Convert pixel borders to world units
    print("=" * 60)
    print("BORDER SIZES IN WORLD UNITS")
    print("=" * 60)
    print()
    print(f"Top border:    {top_border / pixels_per_world_unit:6.1f} world units")
    print(f"Bottom border: {bottom_border / pixels_per_world_unit:6.1f} world units")
    print(f"Left border:   {left_border / pixels_per_world_unit:6.1f} world units")
    print(f"Right border:  {right_border / pixels_per_world_unit:6.1f} world units")
    print()

    # Recommendations
    print("=" * 60)
    print("RECOMMENDATIONS")
    print("=" * 60)
    print()

    # Check if edges have significant content (might be cut off)
    edge_threshold = 5.0  # % of pixels that indicate content near edge

    warnings = []
    for edge in ['top', 'bottom', 'left', 'right']:
        analysis = analyze_edge_content(img_array, edge, sample_size=100)
        if analysis['content_percentage'] > edge_threshold:
            warnings.append(f"  WARNING: {edge.capitalize()} edge has {analysis['content_percentage']:.1f}% content - may be cut off!")

    if warnings:
        print("Potential issues detected:")
        for warning in warnings:
            print(warning)
        print()

    # Calculate optimal bounds adjustment
    print("To minimize empty space while avoiding cutoff:")
    print()

    if top_border > 100 and analyze_edge_content(img_array, 'top', 100)['content_percentage'] < 1:
        print(f"  • Increase min Y by ~{top_border / pixels_per_world_unit:.0f} units (reduce top border)")

    if bottom_border > 100 and analyze_edge_content(img_array, 'bottom', 100)['content_percentage'] < 1:
        print(f"  • Decrease max Y by ~{bottom_border / pixels_per_world_unit:.0f} units (reduce bottom border)")

    if left_border > 100 and analyze_edge_content(img_array, 'left', 100)['content_percentage'] < 1:
        print(f"  • Increase min X by ~{left_border / pixels_per_world_unit:.0f} units (reduce left border)")

    if right_border > 100 and analyze_edge_content(img_array, 'right', 100)['content_percentage'] < 1:
        print(f"  • Decrease max X by ~{right_border / pixels_per_world_unit:.0f} units (reduce right border)")

    print()

if __name__ == '__main__':
    main()
