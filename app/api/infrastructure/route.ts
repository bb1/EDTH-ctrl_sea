import { NextResponse } from 'next/server'
import { getBalticCablesWithSegments, closeDb } from '../../../data_sources/infrastructure/db/db'

export async function GET() {
  try {
    const cables = await getBalticCablesWithSegments()
    
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
    return NextResponse.json(
      { error: 'Failed to fetch infrastructure data' },
      { status: 500 }
    )
  } finally {
    await closeDb()
  }
}
