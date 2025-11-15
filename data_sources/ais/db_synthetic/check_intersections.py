#!/usr/bin/env python3
"""
Script to check if trajectory crosses any infrastructure cables

Trajectory coordinates (lat, lon):
- 54.3374597, 12.0771658
- 54.3310199, 11.9667175
- 54.3353132, 11.8415427
"""

import json
import math
from typing import List, Tuple, Dict, Optional

Point = Tuple[float, float]  # (lon, lat)
LineSegment = Tuple[Point, Point]


def cross_product(o: Point, a: Point, b: Point) -> float:
    """Calculate cross product of vectors oa and ob"""
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def on_segment(p: Point, q: Point, r: Point) -> bool:
    """Check if point q lies on segment pr"""
    return (
        q[0] <= max(p[0], r[0]) and
        q[0] >= min(p[0], r[0]) and
        q[1] <= max(p[1], r[1]) and
        q[1] >= min(p[1], r[1])
    )


def segments_intersect(seg1: LineSegment, seg2: LineSegment) -> bool:
    """Check if two line segments intersect using cross product method"""
    a, b = seg1
    c, d = seg2

    # Calculate cross products
    o1 = cross_product(a, c, d)
    o2 = cross_product(b, c, d)
    o3 = cross_product(c, a, b)
    o4 = cross_product(d, a, b)

    # General case: segments intersect if points are on opposite sides
    if o1 * o2 < 0 and o3 * o4 < 0:
        return True

    # Special cases: check if endpoints are collinear and on the segment
    if o1 == 0 and on_segment(c, a, d):
        return True
    if o2 == 0 and on_segment(c, b, d):
        return True
    if o3 == 0 and on_segment(a, c, b):
        return True
    if o4 == 0 and on_segment(a, d, b):
        return True

    return False


def distance(p1: Point, p2: Point) -> float:
    """Calculate distance between two points"""
    dlon = p2[0] - p1[0]
    dlat = p2[1] - p1[1]
    return math.sqrt(dlon * dlon + dlat * dlat)


def point_to_segment_distance(point: Point, segment: LineSegment) -> float:
    """Calculate minimum distance from point to line segment"""
    p1, p2 = segment
    
    A = point[0] - p1[0]
    B = point[1] - p1[1]
    C = p2[0] - p1[0]
    D = p2[1] - p1[1]

    dot = A * C + B * D
    len_sq = C * C + D * D
    
    if len_sq == 0:
        return distance(point, p1)
    
    param = dot / len_sq

    if param < 0:
        xx, yy = p1
    elif param > 1:
        xx, yy = p2
    else:
        xx = p1[0] + param * C
        yy = p1[1] + param * D

    dx = point[0] - xx
    dy = point[1] - yy
    return math.sqrt(dx * dx + dy * dy)


def check_intersections():
    """Main function to check for intersections"""
    print("🔍 Checking for infrastructure intersections with trajectory...\n")

    # Load infrastructure data
    with open('../../infrastructure/internet_cables_coordinates.json', 'r') as f:
        infrastructure_data = json.load(f)

    # Define trajectory segments (converted from lat,lon to lon,lat)
    trajectory_points: List[Point] = [
        (12.0771658, 54.3374597),
        (11.9667175, 54.3310199),
        (11.8415427, 54.3353132),
    ]

    trajectory_segments: List[LineSegment] = [
        (trajectory_points[0], trajectory_points[1]),
        (trajectory_points[1], trajectory_points[2]),
    ]

    print("Trajectory segments:")
    for i, seg in enumerate(trajectory_segments):
        print(f"  Segment {i + 1}: ({seg[0][0]}, {seg[0][1]}) → ({seg[1][0]}, {seg[1][1]})")
    print()

    intersections: List[Dict] = []
    nearby_cables: List[Dict] = []

    # Check each cable
    for feature in infrastructure_data['features']:
        cable_name = feature['properties']['name']
        cable_id = feature['properties']['id']
        geometry = feature['geometry']

        if geometry['type'] != 'MultiLineString':
            continue

        # Check each line string in the MultiLineString
        for seg_idx, line_string in enumerate(geometry['coordinates']):
            # Check each segment in the line string
            for i in range(len(line_string) - 1):
                cable_segment: LineSegment = (
                    (line_string[i][0], line_string[i][1]),
                    (line_string[i + 1][0], line_string[i + 1][1])
                )

                # Check intersection with each trajectory segment
                for traj_idx, traj_segment in enumerate(trajectory_segments):
                    if segments_intersect(traj_segment, cable_segment):
                        intersections.append({
                            'cableName': cable_name,
                            'cableId': cable_id,
                            'segmentIndex': seg_idx,
                            'trajectorySegment': traj_idx + 1,
                        })

                # Also check if trajectory points are near this cable segment
                for traj_point in trajectory_points:
                    dist = point_to_segment_distance(traj_point, cable_segment)
                    # 0.05 degrees ≈ 5.5 km
                    if dist < 0.05:
                        nearby_cables.append({
                            'cableName': cable_name,
                            'cableId': cable_id,
                            'minDistance': dist,
                            'closestPoint': traj_point,
                        })

    # Report results
    print("📊 Results:\n")

    if intersections:
        print(f"✅ Found {len(intersections)} intersection(s):\n")
        unique_cables = {}
        for intersection in intersections:
            key = f"{intersection['cableId']}-{intersection['segmentIndex']}"
            if key not in unique_cables:
                unique_cables[key] = intersection

        for intersection in unique_cables.values():
            print(f"  🔴 {intersection['cableName']} ({intersection['cableId']})")
            print(f"     Intersects with trajectory segment {intersection['trajectorySegment']}")
            print(f"     Cable segment index: {intersection['segmentIndex']}\n")
    else:
        print("❌ No direct intersections found.\n")

    # Check for nearby cables (within 0.05 degrees ≈ 5.5 km)
    unique_nearby = {}
    if nearby_cables:
        print(f"⚠️  Found {len(nearby_cables)} nearby cable detection(s) (within ~5.5 km):\n")
        for cable in nearby_cables:
            key = cable['cableId']
            if key not in unique_nearby or unique_nearby[key]['minDistance'] > cable['minDistance']:
                unique_nearby[key] = cable

        for cable in unique_nearby.values():
            # Convert degrees to km (roughly 111 km per degree)
            dist_km = cable['minDistance'] * 111
            print(f"  ⚠️  {cable['cableName']} ({cable['cableId']})")
            print(f"     Minimum distance: ~{dist_km:.2f} km\n")

    return {
        'intersections': list(unique_cables.values()) if intersections else [],
        'nearbyCables': list(unique_nearby.values()),
    }


if __name__ == '__main__':
    try:
        result = check_intersections()
        print("\n✅ Analysis complete.")
    except Exception as error:
        print(f"❌ Error: {error}")
        import traceback
        traceback.print_exc()
        exit(1)

