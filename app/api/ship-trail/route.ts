import { NextResponse } from 'next/server'
import { getDb } from '../../db'

interface TrailPoint {
  lat: number
  lon: number
  timestamp: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mmsiParam = searchParams.get('mmsi')
  const dataSource = searchParams.get('dataSource') || 'real'

  if (!mmsiParam) {
    return NextResponse.json(
      { error: 'mmsi parameter is required (comma-separated list for bulk requests)' },
      { status: 400 }
    )
  }

  // Parse comma-separated MMSI list
  const mmsiList = mmsiParam
    .split(',')
    .map(m => m.trim())
    .filter(m => m.length > 0)
    .map(m => parseInt(m))
    .filter(m => !isNaN(m))

  if (mmsiList.length === 0) {
    return NextResponse.json(
      { error: 'Invalid mmsi parameter. Must be a comma-separated list of numbers.' },
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

      // Get current time and 24 hours ago
      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Group trails by MMSI (using string keys for JSON compatibility)
      const trailsByMmsi: Record<string, TrailPoint[]> = {}
      
      // Initialize empty arrays for all requested MMSIs
      mmsiList.forEach(mmsi => {
        trailsByMmsi[mmsi.toString()] = []
      })

      // Extract trajectory points for all specified ships within last 24 hours
      data
        .filter((item: any) => {
          const itemMmsi = item.MetaData?.MMSI
          const itemTime = item.MetaData?.time_utc
          if (!itemMmsi || !itemTime || !item.MetaData?.latitude || !item.MetaData?.longitude) {
            return false
          }
          if (!mmsiList.includes(itemMmsi)) {
            return false
          }
          const itemDate = new Date(itemTime)
          return itemDate >= twentyFourHoursAgo && itemDate <= now
        })
        .forEach((item: any) => {
          const itemMmsi = item.MetaData.MMSI.toString()
          if (!trailsByMmsi[itemMmsi]) {
            trailsByMmsi[itemMmsi] = []
          }
          trailsByMmsi[itemMmsi].push({
            lat: item.MetaData.latitude,
            lon: item.MetaData.longitude,
            timestamp: item.MetaData.time_utc || ''
          })
        })

      // Sort each trail by timestamp
      Object.keys(trailsByMmsi).forEach(mmsi => {
        trailsByMmsi[mmsi].sort((a: TrailPoint, b: TrailPoint) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
      })

      // If single MMSI requested, return array for backward compatibility
      // Otherwise return object with MMSI as keys
      if (mmsiList.length === 1) {
        return NextResponse.json(trailsByMmsi[mmsiList[0].toString()] || [])
      }

      return NextResponse.json(trailsByMmsi)
    }

    // Query real data from postgres
    const db = getDb()

    // Get position reports for the last 24 hours for all MMSIs at once
    const positionReports = await db`
      SELECT 
        pr.mmsi,
        ST_Y(pr.location) as latitude,
        ST_X(pr.location) as longitude,
        pr.time_utc
      FROM position_reports pr
      WHERE pr.mmsi = ANY(${mmsiList})
        AND pr.time_utc >= NOW() - INTERVAL '24 hours'
      ORDER BY pr.mmsi, pr.time_utc ASC
    `

    // Group trails by MMSI (using string keys for JSON compatibility)
    const trailsByMmsi: Record<string, TrailPoint[]> = {}
    
    // Initialize empty arrays for all requested MMSIs
    mmsiList.forEach(mmsi => {
      trailsByMmsi[mmsi.toString()] = []
    })

    // Transform and group by MMSI
    positionReports.forEach((report: any) => {
      const mmsi = report.mmsi.toString()
      if (!trailsByMmsi[mmsi]) {
        trailsByMmsi[mmsi] = []
      }
      trailsByMmsi[mmsi].push({
        lat: parseFloat(report.latitude) || 0,
        lon: parseFloat(report.longitude) || 0,
        timestamp: report.time_utc?.toISOString() || new Date().toISOString()
      })
    })

    // If single MMSI requested, return array for backward compatibility
    // Otherwise return object with MMSI as keys
    if (mmsiList.length === 1) {
      return NextResponse.json(trailsByMmsi[mmsiList[0].toString()] || [])
    }

    return NextResponse.json(trailsByMmsi)
  } catch (error) {
    console.error('Error fetching ship trail:', error)
    return NextResponse.json(
      { error: 'Failed to load ship trail data' },
      { status: 500 }
    )
  }
}

