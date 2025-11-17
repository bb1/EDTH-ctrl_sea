import { NextResponse } from 'next/server'
import { getDb } from '../../db'

interface TrajectoryPoint {
  lat: number
  lon: number
  timestamp: string
  mmsi: number
  shipName: string
}

/**
 * Calculate distance from a point to a line segment
 * Returns distance in degrees (approximate)
 */
function pointToSegmentDistance(
  point: { lat: number; lon: number },
  segment: { p1: { lat: number; lon: number }; p2: { lat: number; lon: number } }
): number {
  const { p1, p2 } = segment
  const A = point.lon - p1.lon
  const B = point.lat - p1.lat
  const C = p2.lon - p1.lon
  const D = p2.lat - p1.lat

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  if (lenSq === 0) {
    const dx = point.lon - p1.lon
    const dy = point.lat - p1.lat
    return Math.sqrt(dx * dx + dy * dy)
  }

  const param = dot / lenSq

  let xx: number, yy: number

  if (param < 0) {
    xx = p1.lon
    yy = p1.lat
  } else if (param > 1) {
    xx = p2.lon
    yy = p2.lat
  } else {
    xx = p1.lon + param * C
    yy = p1.lat + param * D
  }

  const dx = point.lon - xx
  const dy = point.lat - yy
  return Math.sqrt(dx * dx + dy * dy)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dataSource = searchParams.get('dataSource') || 'real'

  try {
    if (dataSource === 'synthetic') {
      // Use synthetic data from file
      let fileContent: string
      
      // Try Bun first (if available)
      if (typeof Bun !== 'undefined') {
        const file = Bun.file('data_sources/ais/db_synthetic/synthetic_data.json')
        fileContent = await file.text()
      } else {
        // Fallback to Node.js fs
        const { readFile } = await import('fs/promises')
        const { join } = await import('path')
        const filePath = join(process.cwd(), 'data_sources', 'ais', 'db_synthetic', 'synthetic_data.json')
        fileContent = await readFile(filePath, 'utf-8')
      }
      
      const data = JSON.parse(fileContent)

      // Extract trajectory points
      const trajectory: TrajectoryPoint[] = data
        .filter((item: any) => item.MetaData?.latitude && item.MetaData?.longitude)
        .map((item: any) => ({
          lat: item.MetaData.latitude,
          lon: item.MetaData.longitude,
          timestamp: item.MetaData.time_utc || '',
          mmsi: item.MetaData.MMSI || 0,
          shipName: item.MetaData.ShipName?.trim() || 'Unknown'
        }))
        .sort((a: TrajectoryPoint, b: TrajectoryPoint) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )

      return NextResponse.json(trajectory)
    }

    // Query real data from postgres
    const db = getDb()
    
    // Get recent position reports with ship names
    const positionReports = await db`
      SELECT 
        pr.mmsi,
        ST_Y(pr.location) as latitude,
        ST_X(pr.location) as longitude,
        pr.time_utc,
        COALESCE(sm.ship_name, o.object_name, 'Unknown') as ship_name
      FROM position_reports pr
      JOIN object o ON pr.object_id = o.id
      LEFT JOIN ship_metadata sm ON pr.mmsi = sm.mmsi
      WHERE pr.time_utc >= NOW() - INTERVAL '24 hours'
      ORDER BY pr.time_utc ASC
    `

    // Transform to TrajectoryPoint format
    const trajectory: TrajectoryPoint[] = positionReports.map((report: any) => ({
      lat: parseFloat(report.latitude) || 0,
      lon: parseFloat(report.longitude) || 0,
      timestamp: report.time_utc?.toISOString() || new Date().toISOString(),
      mmsi: report.mmsi || 0,
      shipName: report.ship_name || 'Unknown'
    }))

    return NextResponse.json(trajectory)
  } catch (error) {
    console.error('Error loading trajectory:', error)
    return NextResponse.json(
      { error: 'Failed to load trajectory data' },
      { status: 500 }
    )
  }
}

// Export utility function for use in other modules
export { pointToSegmentDistance }

