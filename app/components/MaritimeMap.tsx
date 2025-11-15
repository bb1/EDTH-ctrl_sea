'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface Infrastructure {
  id: number
  name: string
  type: string
  lat: number
  lng: number
  radius: number
}

interface Ship {
  id: number
  name: string
  lat: number
  long: number
  risk_percentage: number
}

interface GeoJSONFeature {
  type: 'Feature'
  properties: {
    id: number
    cable_id: string
    name: string
    color: string
    segment_index: number
  }
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

interface MaritimeMapProps {
  ships: Ship[]
  infrastructure: Infrastructure[] | GeoJSONFeatureCollection
  onVesselClick: (ship: Ship) => void
}

export default function MaritimeMap({ ships, infrastructure, onVesselClick }: MaritimeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const shipMarkersRef = useRef<Map<number, maplibregl.Marker>>(new Map())
  const infrastructureMarkersRef = useRef<Map<number, maplibregl.Marker>>(new Map())
  const cableSourceRef = useRef<string | null>(null)
  const cablePopupRef = useRef<maplibregl.Popup | null>(null)
  const isInitializedRef = useRef(false)

  // Initialize map only once
  useEffect(() => {
    if (!mapContainer.current || isInitializedRef.current) return

    // OSM style with martin server as vector tile source
    const osmStyle = {
      version: 8,
      sources: {
        'osm': {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        },
        'martin': {
          type: 'vector',
          tiles: ['http://localhost:3000/tiles/{z}/{x}/{y}'],
          minzoom: 0,
          maxzoom: 22
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 22
        }
      ],
      glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
      sprite: 'https://tiles.openfreemap.org/styles/liberty/sprite'
    }

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: osmStyle as any,
      center: [18.5, 55],
      zoom: 6
    })

    map.current.on('load', () => {
      isInitializedRef.current = true
    })

    return () => {
      // Clean up markers
      shipMarkersRef.current.forEach(marker => marker.remove())
      shipMarkersRef.current.clear()
      infrastructureMarkersRef.current.forEach(marker => marker.remove())
      infrastructureMarkersRef.current.clear()
      // Clean up cable source and popup
      if (cablePopupRef.current) {
        cablePopupRef.current.remove()
        cablePopupRef.current = null
      }
      if (map.current && cableSourceRef.current && map.current.getSource(cableSourceRef.current)) {
        if (map.current.getLayer('cable-lines')) {
          map.current.removeLayer('cable-lines')
        }
        map.current.removeSource(cableSourceRef.current)
      }
      map.current?.remove()
      isInitializedRef.current = false
    }
  }, [])

  // Update ship markers incrementally
  useEffect(() => {
    if (!map.current || !isInitializedRef.current) return

    const currentMarkers = shipMarkersRef.current
    const shipIds = new Set(ships.map(ship => ship.id))

    // Remove markers for ships that no longer exist
    currentMarkers.forEach((marker, id) => {
      if (!shipIds.has(id)) {
        marker.remove()
        currentMarkers.delete(id)
      }
    })

    // Add or update markers for current ships
    ships.forEach(ship => {
      const existingMarker = currentMarkers.get(ship.id)
      const risk = ship.risk_percentage
      const color = risk >= 70 ? '#ef4444' : risk >= 40 ? '#f97316' : '#22c55e'

      if (existingMarker) {
        // Update existing marker position and color if changed
        const [lng, lat] = existingMarker.getLngLat().toArray()
        if (lng !== ship.long || lat !== ship.lat) {
          existingMarker.setLngLat([ship.long, ship.lat])
        }
        // Update color if risk changed
        const el = existingMarker.getElement()
        if (el.style.backgroundColor !== color) {
          el.style.backgroundColor = color
        }
      } else {
        // Create new marker
        const el = document.createElement('div')
        el.style.width = '20px'
        el.style.height = '20px'
        el.style.backgroundColor = color
        el.style.borderRadius = '50%'
        el.style.cursor = 'pointer'
        el.addEventListener('click', () => onVesselClick(ship))

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([ship.long, ship.lat])
          .addTo(map.current!)
        
        currentMarkers.set(ship.id, marker)
      }
    })
  }, [ships, onVesselClick])

  // Update infrastructure (cables) from GeoJSON
  useEffect(() => {
    if (!map.current || !isInitializedRef.current) return

    // Check if infrastructure is GeoJSON FeatureCollection
    if (infrastructure && 'type' in infrastructure && infrastructure.type === 'FeatureCollection') {
      const geoJson = infrastructure as GeoJSONFeatureCollection
      const source = map.current.getSource('cables') as maplibregl.GeoJSONSource
      
      if (source) {
        // Update the GeoJSON data
        source.setData(geoJson as any)
      } else {
        // Source doesn't exist yet, add it
        map.current.addSource('cables', {
          type: 'geojson',
          data: geoJson as any
        })

        // Add layer if it doesn't exist
        if (!map.current.getLayer('cable-lines')) {
          map.current.addLayer({
            id: 'cable-lines',
            type: 'line',
            source: 'cables',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 2,
              'line-opacity': 0.8
            }
          })

          // Add cable labels on hover
          map.current.on('mouseenter', 'cable-lines', (e) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0]
              const name = feature.properties?.name || 'Unknown Cable'
              map.current!.getCanvas().style.cursor = 'pointer'
              
              // Remove existing popup if any
              if (cablePopupRef.current) {
                cablePopupRef.current.remove()
              }
              
              // Create and show new popup
              cablePopupRef.current = new maplibregl.Popup({
                closeOnClick: false,
                closeButton: false
              })
                .setLngLat(e.lngLat)
                .setHTML(`<strong>${name}</strong>`)
                .addTo(map.current!)
            }
          })

          map.current.on('mouseleave', 'cable-lines', () => {
            map.current!.getCanvas().style.cursor = ''
            // Remove popup when mouse leaves
            if (cablePopupRef.current) {
              cablePopupRef.current.remove()
              cablePopupRef.current = null
            }
          })

          cableSourceRef.current = 'cables'
        }
      }
    } else if (Array.isArray(infrastructure)) {
      // Legacy infrastructure markers (point-based)
    const currentMarkers = infrastructureMarkersRef.current
    const infraIds = new Set(infrastructure.map(zone => zone.id))

    // Remove markers for infrastructure that no longer exists
    currentMarkers.forEach((marker, id) => {
      if (!infraIds.has(id)) {
        marker.remove()
        currentMarkers.delete(id)
      }
    })

    // Add or update markers for current infrastructure
    infrastructure.forEach(zone => {
      const existingMarker = currentMarkers.get(zone.id)

      if (existingMarker) {
        // Update existing marker position if changed
        const [lng, lat] = existingMarker.getLngLat().toArray()
        if (lng !== zone.lng || lat !== zone.lat) {
          existingMarker.setLngLat([zone.lng, zone.lat])
        }
      } else {
        // Create new marker
        const el = document.createElement('div')
        el.style.width = '30px'
        el.style.height = '30px'
        el.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'
        el.style.border = '2px dashed #3b82f6'
        el.style.borderRadius = '50%'

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([zone.lng, zone.lat])
          .setPopup(new maplibregl.Popup().setText(zone.name))
          .addTo(map.current!)
        
        currentMarkers.set(zone.id, marker)
      }
    })
    }
  }, [infrastructure])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}
