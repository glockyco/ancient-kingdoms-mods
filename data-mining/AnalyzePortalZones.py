#!/usr/bin/env python3
"""
Analyze portal destinations and match them to zones based on bounds.
"""

import json
import sys
from pathlib import Path

def load_json(filepath):
    """Load JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def is_point_in_zone(x, y, z, zone_bounds):
    """Check if a point falls within zone bounds."""
    return (zone_bounds['min_x'] <= x <= zone_bounds['max_x'] and
            zone_bounds['min_y'] <= y <= zone_bounds['max_y'] and
            zone_bounds['min_z'] <= z <= zone_bounds['max_z'])

def distance_to_point(x1, y1, z1, x2, y2, z2):
    """Calculate 3D distance between two points."""
    return ((x2 - x1)**2 + (y2 - y1)**2 + (z2 - z1)**2)**0.5

def main():
    # Paths to exported data
    data_dir = Path(__file__).parent.parent / 'exported-data'

    if not data_dir.exists():
        print(f"Error: exported-data directory not found at {data_dir}")
        print("Please run the DataExporter mod first (Shift+F9 in-game)")
        sys.exit(1)

    # Load data
    print("Loading exported data...")
    portals = load_json(data_dir / 'portals.json')
    zones = load_json(data_dir / 'zones.json')
    zone_triggers = load_json(data_dir / 'zone_triggers.json')

    print(f"Loaded {len(portals)} portals, {len(zones)} zones, and {len(zone_triggers)} zone triggers\n")

    # Filter out unknown zones
    known_zones = [z for z in zones if z['id'] != 'unknown']
    print(f"Found {len(known_zones)} known zones (excluding 'unknown')\n")

    # Analyze portals using zone bounds
    matched_bounds = 0
    unmatched_bounds = 0

    # Analyze portals using zone triggers (nearest)
    matched_triggers = 0
    unmatched_triggers = 0

    print("=" * 80)
    print("METHOD 1: Using Zone Bounds (monster/NPC bounding boxes)")
    print("=" * 80 + "\n")

    for portal in portals:
        dest = portal['destination']

        # Skip portals without destinations
        if dest['x'] == 0 and dest['y'] == 0 and dest['z'] == 0:
            continue

        # Find matching zone
        matching_zones = []
        for zone in known_zones:
            if is_point_in_zone(dest['x'], dest['y'], dest['z'], zone['bounds']):
                matching_zones.append(zone['id'])

        if matching_zones:
            matched_bounds += 1
        else:
            unmatched_bounds += 1

    print(f"Summary (Zone Bounds):")
    print(f"  Matched destinations: {matched_bounds}")
    print(f"  Unmatched destinations: {unmatched_bounds}")
    if matched_bounds + unmatched_bounds > 0:
        print(f"  Match rate: {matched_bounds / (matched_bounds + unmatched_bounds) * 100:.1f}%")

    # Now try zone triggers (find nearest trigger to destination)
    print("\n" + "=" * 80)
    print("METHOD 2: Using Zone Triggers (nearest trigger to destination)")
    print("=" * 80 + "\n")

    trigger_results = []

    for portal in portals:
        dest = portal['destination']

        # Skip portals without destinations
        if dest['x'] == 0 and dest['y'] == 0 and dest['z'] == 0:
            continue

        # Find nearest zone trigger
        nearest_trigger = None
        nearest_distance = float('inf')

        for trigger in zone_triggers:
            tpos = trigger['position']
            dist = distance_to_point(dest['x'], dest['y'], dest['z'],
                                    tpos['x'], tpos['y'], tpos['z'])
            if dist < nearest_distance:
                nearest_distance = dist
                nearest_trigger = trigger

        if nearest_trigger:
            # Get zone name from trigger
            zone_name = nearest_trigger['name']
            zone_id_normalized = zone_name.lower().replace(' ', '_')
            matched_triggers += 1
            trigger_results.append({
                'portal': portal['id'],
                'from': portal['from_zone_id'],
                'to_trigger': zone_id_normalized,
                'distance': nearest_distance
            })
        else:
            unmatched_triggers += 1

    # Show results for triggers
    for result in trigger_results[:20]:  # Show first 20
        print(f"Portal: {result['portal']}")
        print(f"  From: {result['from']}")
        print(f"  To (nearest trigger): {result['to_trigger']}")
        print(f"  Distance: {result['distance']:.2f} units")
        print()

    if len(trigger_results) > 20:
        print(f"... and {len(trigger_results) - 20} more\n")

    print(f"Summary (Zone Triggers):")
    print(f"  Matched destinations: {matched_triggers}")
    print(f"  Unmatched destinations: {unmatched_triggers}")
    if matched_triggers + unmatched_triggers > 0:
        print(f"  Match rate: {matched_triggers / (matched_triggers + unmatched_triggers) * 100:.1f}%")

    # Check for overlapping zones
    print("\n" + "=" * 80)
    print("Checking for overlapping zone bounds...")
    print("=" * 80 + "\n")

    overlaps = []
    for i, zone1 in enumerate(known_zones):
        for zone2 in known_zones[i+1:]:
            # Check if bounds overlap
            x_overlap = not (zone1['bounds']['max_x'] < zone2['bounds']['min_x'] or
                           zone2['bounds']['max_x'] < zone1['bounds']['min_x'])
            y_overlap = not (zone1['bounds']['max_y'] < zone2['bounds']['min_y'] or
                           zone2['bounds']['max_y'] < zone1['bounds']['min_y'])
            z_overlap = not (zone1['bounds']['max_z'] < zone2['bounds']['min_z'] or
                           zone2['bounds']['max_z'] < zone1['bounds']['min_z'])

            if x_overlap and y_overlap and z_overlap:
                overlaps.append((zone1['id'], zone2['id']))

    if overlaps:
        print(f"Found {len(overlaps)} overlapping zone pairs:")
        for z1, z2 in overlaps:
            print(f"  - {z1} <-> {z2}")
    else:
        print("No overlapping zones found!")

    print("\nNote: Overlapping zones mean some portal destinations may match multiple zones.")

if __name__ == '__main__':
    main()
