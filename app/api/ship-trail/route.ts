import { NextResponse } from 'next/server'
import { getDb } from '../../db'

interface TrailPoint {
  lat: number
  lon: number
  timestamp: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const shipId = searchParams.get('shipId')
  const mmsi = searchParams.get('mmsi')
  const dataSource = searchParams.get('dataSource') || 'real'

  if (!shipId && !mmsi) {
    return NextResponse.json(
      { error: 'shipId or mmsi parameter is required' },
      { status: 400 }
    )
  }

  try {
    if (dataSource === 'synthetic') {
      // For synthetic data, try to get data from synthetic_data.json
      let fileContent: string
      
      if (typeof Bun !== 'undefined') {
        const file = Bun.file('data_sources/ais/db_synthetic/synthetic_data.json')
        fileContent = await file.text()
      } else {
        const { readFile } = await import('fs/promises')
        const { join } = await import('path')
        const filePath = join(process.cwd(), 'data_sources', 'ais', 'db_synthetic', 'synthetic_data.json')
        fileContent = await readFile(filePath, 'utf-8')
      }
      
      const data = JSON.parse(fileContent)
      
      // Filter by MMSI if provided, otherwise use shipId as MMSI
      const targetMmsi = mmsi ? parseInt(mmsi) : (shipId ? parseInt(shipId) : null)
      
      if (!targetMmsi) {
        return NextResponse.json([])
      }

      // Get current time and 24 hours ago
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Extract trajectory points for the specified ship within last 24 hours
      const trail: TrailPoint[] = data
        .filter((item: any) => {
          const itemMmsi = item.MetaData?.MMSI
          const itemTime = item.MetaData?.time_utc
          if (!itemMmsi || !itemTime || !item.MetaData?.latitude || !item.MetaData?.longitude) {
            return false
          }
          if (itemMmsi !== targetMmsi) {
            return false
          }
          const itemDate = new Date(itemTime)
          return itemDate >= twentyFourHoursAgo && itemDate <= now
        })
        .map((item: any) => ({
          lat: item.MetaData.latitude,
          lon: item.MetaData.longitude,
          timestamp: item.MetaData.time_utc || ''
        }))
        .sort((a: TrailPoint, b: TrailPoint) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )

      return NextResponse.json(trail)
    }

    // Query real data from postgres
    const db = getDb()
    
    // Determine MMSI to query - use mmsi param if provided, otherwise try to get from shipId
    let targetMmsi: number | null = null
    
    if (mmsi) {
      targetMmsi = parseInt(mmsi)
    } else if (shipId) {
      // Try to find MMSI from ships table or use shipId as MMSI
      // For now, assume shipId might be MMSI in some cases
      // In a real scenario, you'd want to look up the ship's MMSI from a ships table
      targetMmsi = parseInt(shipId)
    }
    
    if (!targetMmsi) {
      return NextResponse.json([])
    }

    // Get position reports for the last 24 hours for this MMSI
    const positionReports = await db`
      SELECT 
        ST_Y(pr.location) as latitude,
        ST_X(pr.location) as longitude,
        pr.time_utc
      FROM position_reports pr
      WHERE pr.mmsi = ${targetMmsi}
        AND pr.time_utc >= NOW() - INTERVAL '24 hours'
      ORDER BY pr.time_utc ASC
    `

    // Transform to TrailPoint format
    const trail: TrailPoint[] = positionReports.map((report: any) => ({
      lat: parseFloat(report.latitude) || 0,
      lon: parseFloat(report.longitude) || 0,
      timestamp: report.time_utc?.toISOString() || new Date().toISOString()
    }))

    return NextResponse.json(trail)
  } catch (error) {
    console.error('Error fetching ship trail:', error)
    return NextResponse.json(
      { error: 'Failed to load ship trail data' },
      { status: 500 }
    )
  }
}

