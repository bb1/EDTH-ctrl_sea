/**
 * Script to check if trajectory crosses any infrastructure cables
 * 
 * Trajectory coordinates (lat, lon):
 * - 54.3374597, 12.0771658
 * - 54.3310199, 11.9667175
 * - 54.3353132, 11.8415427
 */

interface Point {
  lon: number;
  lat: number;
}

interface LineSegment {
  p1: Point;
  p2: Point;
}

/**
 * Check if two line segments intersect
 * Uses the cross product method for line segment intersection
 */
function segmentsIntersect(seg1: LineSegment, seg2: LineSegment): boolean {
  const { p1: a, p2: b } = seg1;
  const { p1: c, p2: d } = seg2;

  // Helper function to calculate cross product
  const crossProduct = (o: Point, a: Point, b: Point): number => {
    return (a.lon - o.lon) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lon - o.lon);
  };

  // Check if points are on opposite sides of each segment
  const o1 = crossProduct(a, c, d);
  const o2 = crossProduct(b, c, d);
  const o3 = crossProduct(c, a, b);
  const o4 = crossProduct(d, a, b);

  // General case: segments intersect if points are on opposite sides
  if (o1 * o2 < 0 && o3 * o4 < 0) {
    return true;
  }

  // Special cases: check if endpoints are collinear and on the segment
  if (o1 === 0 && onSegment(c, a, d)) return true;
  if (o2 === 0 && onSegment(c, b, d)) return true;
  if (o3 === 0 && onSegment(a, c, b)) return true;
  if (o4 === 0 && onSegment(a, d, b)) return true;

  return false;
}

/**
 * Check if point q lies on segment pr
 */
function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    q.lon <= Math.max(p.lon, r.lon) &&
    q.lon >= Math.min(p.lon, r.lon) &&
    q.lat <= Math.max(p.lat, r.lat) &&
    q.lat >= Math.min(p.lat, r.lat)
  );
}

/**
 * Calculate distance between two points (for proximity check)
 */
function distance(p1: Point, p2: Point): number {
  const dlon = p2.lon - p1.lon;
  const dlat = p2.lat - p1.lat;
  return Math.sqrt(dlon * dlon + dlat * dlat);
}

/**
 * Check if a point is within a certain distance of a line segment
 */
function pointNearSegment(point: Point, segment: LineSegment, threshold: number = 0.01): boolean {
  const { p1, p2 } = segment;
  
  // Calculate distance from point to line segment
  const A = point.lon - p1.lon;
  const B = point.lat - p1.lat;
  const C = p2.lon - p1.lon;
  const D = p2.lat - p1.lat;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number, yy: number;

  if (param < 0) {
    xx = p1.lon;
    yy = p1.lat;
  } else if (param > 1) {
    xx = p2.lon;
    yy = p2.lat;
  } else {
    xx = p1.lon + param * C;
    yy = p1.lat + param * D;
  }

  const dx = point.lon - xx;
  const dy = point.lat - yy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  return dist <= threshold;
}

async function checkIntersections() {
  console.log('🔍 Checking for infrastructure intersections with trajectory...\n');

  // Load infrastructure data
  const infrastructureFile = Bun.file(
    '../infrastructure/internet_cables_coordinates.json'
  );
  const infrastructureData = await infrastructureFile.json();

  // Define trajectory segments (converted from lat,lon to lon,lat)
  const trajectoryPoints: Point[] = [
    { lon: 12.0771658, lat: 54.3374597 },
    { lon: 11.9667175, lat: 54.3310199 },
    { lon: 11.8415427, lat: 54.3353132 },
  ];

  const trajectorySegments: LineSegment[] = [
    { p1: trajectoryPoints[0], p2: trajectoryPoints[1] },
    { p1: trajectoryPoints[1], p2: trajectoryPoints[2] },
  ];

  console.log('Trajectory segments:');
  trajectorySegments.forEach((seg, i) => {
    console.log(
      `  Segment ${i + 1}: (${seg.p1.lon}, ${seg.p1.lat}) → (${seg.p2.lon}, ${seg.p2.lat})`
    );
  });
  console.log('');

  const intersections: Array<{
    cableName: string;
    cableId: string;
    segmentIndex: number;
    trajectorySegment: number;
    intersectionPoint?: Point;
  }> = [];

  const nearbyCables: Array<{
    cableName: string;
    cableId: string;
    minDistance: number;
    closestPoint: Point;
  }> = [];

  // Check each cable
  for (const feature of infrastructureData.features) {
    const cableName = feature.properties.name;
    const cableId = feature.properties.id;
    const geometry = feature.geometry;

    if (geometry.type !== 'MultiLineString') {
      continue;
    }

    // Check each line string in the MultiLineString
    for (let segIdx = 0; segIdx < geometry.coordinates.length; segIdx++) {
      const lineString = geometry.coordinates[segIdx];

      // Check each segment in the line string
      for (let i = 0; i < lineString.length - 1; i++) {
        const cableSegment: LineSegment = {
          p1: { lon: lineString[i][0], lat: lineString[i][1] },
          p2: { lon: lineString[i + 1][0], lat: lineString[i + 1][1] },
        };

        // Check intersection with each trajectory segment
        for (let trajIdx = 0; trajIdx < trajectorySegments.length; trajIdx++) {
          const trajSegment = trajectorySegments[trajIdx];

          if (segmentsIntersect(trajSegment, cableSegment)) {
            intersections.push({
              cableName,
              cableId,
              segmentIndex: segIdx,
              trajectorySegment: trajIdx + 1,
            });
          }
        }

        // Also check if trajectory points are near this cable segment
        for (const trajPoint of trajectoryPoints) {
          if (pointNearSegment(trajPoint, cableSegment, 0.05)) {
            const dist = distance(trajPoint, cableSegment.p1);
            nearbyCables.push({
              cableName,
              cableId,
              minDistance: dist,
              closestPoint: trajPoint,
            });
          }
        }
      }
    }
  }

  // Report results
  console.log('📊 Results:\n');

  if (intersections.length > 0) {
    console.log(`✅ Found ${intersections.length} intersection(s):\n`);
    const uniqueCables = new Map<string, typeof intersections[0]>();
    intersections.forEach((intersection) => {
      const key = `${intersection.cableId}-${intersection.segmentIndex}`;
      if (!uniqueCables.has(key)) {
        uniqueCables.set(key, intersection);
      }
    });

    uniqueCables.forEach((intersection) => {
      console.log(`  🔴 ${intersection.cableName} (${intersection.cableId})`);
      console.log(
        `     Intersects with trajectory segment ${intersection.trajectorySegment}`
      );
      console.log(`     Cable segment index: ${intersection.segmentIndex}\n`);
    });
  } else {
    console.log('❌ No direct intersections found.\n');
  }

  // Check for nearby cables (within 0.05 degrees ≈ 5.5 km)
  const uniqueNearby = new Map<string, typeof nearbyCables[0]>();
  if (nearbyCables.length > 0) {
    console.log(`⚠️  Found ${nearbyCables.length} nearby cable(s) (within ~5.5 km):\n`);
    nearbyCables.forEach((cable) => {
      const key = cable.cableId;
      if (!uniqueNearby.has(key) || uniqueNearby.get(key)!.minDistance > cable.minDistance) {
        uniqueNearby.set(key, cable);
      }
    });

    uniqueNearby.forEach((cable) => {
      console.log(`  ⚠️  ${cable.cableName} (${cable.cableId})`);
      console.log(`     Minimum distance: ~${(cable.minDistance * 111).toFixed(2)} km\n`);
    });
  }

  return {
    intersections: Array.from(uniqueCables.values()),
    nearbyCables: Array.from(uniqueNearby.values()),
  };
}

// Run the check
checkIntersections()
  .then((result) => {
    console.log('\n✅ Analysis complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

