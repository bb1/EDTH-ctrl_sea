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
    // Return empty GeoJSON instead of error so the app can still function
    return NextResponse.json({
      type: 'FeatureCollection',
      features: []
    })
  } finally {
    try {
      await closeDb()
    } catch (closeError) {
      console.error('Error closing database:', closeError)
    }
  }
}
