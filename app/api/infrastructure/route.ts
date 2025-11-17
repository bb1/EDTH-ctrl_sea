import { NextResponse } from 'next/server'
import { getDb } from '../../db'

export async function GET() {
  try {
    const db = getDb()
    
    const BALTIC_MIN_LAT = 53.0
    const BALTIC_MAX_LAT = 66.0
    const BALTIC_MIN_LON = 10.0
    const BALTIC_MAX_LON = 30.0

    // Get all segments and filter in JavaScript
    const allSegments = await db`
      SELECT 
        iseg.id,
        iseg.cable_id,
        iseg.segment_index,
        iseg.coordinates,
        i.cable_id as cable_id_string,
        i.name,
        i.color,
        i.feature_id,
        i.representative_latitude,
        i.representative_longitude
      FROM infrastructure_segments iseg
      JOIN infrastructure i ON iseg.cable_id = i.id
      ORDER BY i.name, iseg.segment_index
    `

    // Filter cables that have segments in Baltic region
    const cablesMap = new Map<string, {
      id: number
      cable_id: string
      name: string
      color: string | null
      feature_id: string
      representative_latitude: number | null
      representative_longitude: number | null
      segments: Array<{
        segment_index: number
        coordinates: number[][]
      }>
    }>()

    for (const segment of allSegments) {
      // Parse coordinates
      let coords: number[][]
      if (typeof segment.coordinates === 'string') {
        try {
          coords = JSON.parse(segment.coordinates)
        } catch (e) {
          continue
        }
      } else {
        coords = segment.coordinates as number[][]
      }
      
      if (!Array.isArray(coords)) continue
      
      // Check if any point is in Baltic region
      const hasBalticPoint = coords.some((point: number[]) => {
        if (!Array.isArray(point) || point.length < 2) return false
        const lon = Number(point[0])
        const lat = Number(point[1])
        return !isNaN(lon) && !isNaN(lat) &&
               lon >= BALTIC_MIN_LON && lon <= BALTIC_MAX_LON &&
               lat >= BALTIC_MIN_LAT && lat <= BALTIC_MAX_LAT
      })

      if (hasBalticPoint) {
        const cableId = segment.cable_id_string as string
        if (!cablesMap.has(cableId)) {
          cablesMap.set(cableId, {
            id: segment.cable_id as number,
            cable_id: cableId,
            name: segment.name as string,
            color: segment.color as string | null,
            feature_id: segment.feature_id as string,
            representative_latitude: segment.representative_latitude as number | null,
            representative_longitude: segment.representative_longitude as number | null,
            segments: []
          })
        }
        
        const cable = cablesMap.get(cableId)!
        cable.segments.push({
          segment_index: segment.segment_index as number,
          coordinates: coords
        })
      }
    }

    const cables = Array.from(cablesMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
    
    // Transform to GeoJSON format for map rendering
    const features = cables.flatMap(cable => {
      return cable.segments.map(segment => ({
        type: 'Feature' as const,
        properties: {
          id: cable.id,
          cable_id: cable.cable_id,
          name: cable.name,
          color: cable.color || '#3b82f6',
          segment_index: segment.segment_index
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: segment.coordinates
        }
      }))
    })

    const geoJson = {
      type: 'FeatureCollection' as const,
      features
    }

    return NextResponse.json(geoJson)
  } catch (error) {
    console.error('Error fetching Baltic cables:', error)
    // Return empty GeoJSON instead of error so the app can still function
    return NextResponse.json({
      type: 'FeatureCollection',
      features: []
    })
  }
}
