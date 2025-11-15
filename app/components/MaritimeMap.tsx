'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getVesselColor } from '../lib/utils'

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

interface TrajectoryPoint {
  lat: number
  lon: number
  timestamp: string
  mmsi: number
  shipName: string
}

interface VesselAlert {
  id: string
  type: 'yellow' | 'red'
  message: string
  timestamp: string
  vesselName: string
  mmsi: number
  count: number
}

interface MaritimeMapProps {
  ships: Ship[]
  infrastructure: Infrastructure[] | GeoJSONFeatureCollection
  onVesselClick: (ship: Ship) => void
  onVesselColorChange?: (alert: VesselAlert) => void
}

export default function MaritimeMap({ ships, infrastructure, onVesselClick, onVesselColorChange }: MaritimeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const shipMarkersRef = useRef<Map<number, maplibregl.Marker>>(new Map())
  const infrastructureMarkersRef = useRef<Map<number, maplibregl.Marker>>(new Map())
  const cableSourceRef = useRef<string | null>(null)
  const cablePopupRef = useRef<maplibregl.Popup | null>(null)
  const isInitializedRef = useRef(false)
  const trajectoryMarkerRef = useRef<maplibregl.Marker | null>(null)
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentTrajectoryIndexRef = useRef<number>(0)
  const previousColorRef = useRef<'green' | 'yellow' | 'red' | null>(null)
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([])
  const cablesMapRef = useRef<Map<string, { coordinates: number[][] }[]>>(new Map())

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

  // Build cables map for proximity checking
  useEffect(() => {
    if (infrastructure && 'type' in infrastructure && infrastructure.type === 'FeatureCollection') {
      const geoJson = infrastructure as GeoJSONFeatureCollection
      const cablesMap = new Map<string, { coordinates: number[][] }[]>()
      
      // Group segments by cable_id
      geoJson.features.forEach(feature => {
        const cableId = feature.properties.cable_id
        if (!cablesMap.has(cableId)) {
          cablesMap.set(cableId, [])
        }
        cablesMap.get(cableId)!.push({
          coordinates: feature.geometry.coordinates
        })
      })
      
      cablesMapRef.current = cablesMap
    }
  }, [infrastructure])

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

  // Fetch trajectory data
  useEffect(() => {
    const fetchTrajectory = async () => {
      try {
        const response = await fetch('/api/trajectory')
        if (response.ok) {
          const data = await response.json()
          setTrajectory(data)
        }
      } catch (error) {
        console.error('Error fetching trajectory:', error)
      }
    }
    fetchTrajectory()
  }, [])

  // Create ship icon SVG - boat shape
  const createShipIcon = (color: 'green' | 'yellow' | 'red'): HTMLElement => {
    const el = document.createElement('div')
    el.style.width = '40px'
    el.style.height = '40px'
    el.style.cursor = 'pointer'
    el.style.display = 'flex'
    el.style.alignItems = 'center'
    el.style.justifyContent = 'center'
    
    const colorMap = {
      green: '#22c55e',
      yellow: '#eab308',
      red: '#ef4444'
    }
    
    // Boat shape SVG - realistic boat/ship from side view
    const svg = `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Boat hull (curved bottom) -->
        <path d="M4 28C4 28 6 26 8 26C10 26 12 27 14 27C16 27 18 26 20 26C22 26 24 27 26 27C28 27 30 26 32 26C34 26 36 28 36 28L36 32L4 32L4 28Z" 
              fill="${colorMap[color]}" 
              stroke="white" 
              stroke-width="1.5" 
              stroke-linejoin="round"/>
        <!-- Boat deck line -->
        <path d="M6 26L8 24L10 25L12 24L14 25L16 24L18 25L20 24L22 25L24 24L26 25L28 24L30 25L32 24L34 26" 
              stroke="white" 
              stroke-width="1.5" 
              stroke-linecap="round" 
              stroke-linejoin="round"/>
        <!-- Boat cabin/superstructure -->
        <path d="M12 24L12 18L20 18L20 24L12 24Z" 
              fill="${colorMap[color]}" 
              stroke="white" 
              stroke-width="1.5" 
              opacity="0.9"/>
        <!-- Boat cabin window -->
        <rect x="14" y="20" width="4" height="2" fill="white" opacity="0.6"/>
        <!-- Boat bow (front point) -->
        <path d="M4 28L6 26L4 24Z" 
              fill="${colorMap[color]}" 
              stroke="white" 
              stroke-width="1.5"/>
        <!-- Boat stern (back) -->
        <path d="M36 28L34 26L36 24Z" 
              fill="${colorMap[color]}" 
              stroke="white" 
              stroke-width="1.5"/>
      </svg>
    `
    el.innerHTML = svg
    return el
  }

  // Animate single ship icon along trajectory
  useEffect(() => {
    if (!map.current || !isInitializedRef.current || trajectory.length === 0) {
      return
    }

    // Don't restart animation if it's already running - infrastructure changes just update color calculation
    // The cablesMapRef is already updated by the separate useEffect, so the running animation will use it
    if (animationIntervalRef.current && trajectoryMarkerRef.current) {
      return
    }

    // Clean up any existing animation
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
      animationIntervalRef.current = null
    }
    if (trajectoryMarkerRef.current) {
      trajectoryMarkerRef.current.remove()
      trajectoryMarkerRef.current = null
    }

    // Create initial marker at first point
    const initialPoint = trajectory[0]
    // Use green as default if cables aren't loaded yet
    const initialColor = cablesMapRef.current.size > 0 
      ? getVesselColor({ lat: initialPoint.lat, lon: initialPoint.lon }, cablesMapRef.current)
      : 'green'
    const icon = createShipIcon(initialColor)
    const marker = new maplibregl.Marker({ element: icon })
      .setLngLat([initialPoint.lon, initialPoint.lat])
      .addTo(map.current!)
    
    trajectoryMarkerRef.current = marker
    currentTrajectoryIndexRef.current = 0
    previousColorRef.current = initialColor

    // Animation function - moves ship along trajectory
    const animate = () => {
      if (!map.current || !trajectoryMarkerRef.current || trajectory.length === 0) return

      const currentIndex = currentTrajectoryIndexRef.current
      const point = trajectory[currentIndex]
      
      // Update color based on proximity (use green as default if cables aren't loaded)
      const color = cablesMapRef.current.size > 0
        ? getVesselColor({ lat: point.lat, lon: point.lon }, cablesMapRef.current)
        : 'green'
      const previousColor = previousColorRef.current
      
      // Check for color transitions and trigger alerts
      if (previousColor !== null && color !== previousColor && onVesselColorChange) {
        // Only alert on transitions TO yellow or red (not from them)
        if (color === 'yellow' && previousColor !== 'yellow') {
          onVesselColorChange({
            id: `alert-yellow-${point.shipName || 'Vessel'}`,
            type: 'yellow',
            message: 'Vessel approaching cable area',
            timestamp: new Date().toISOString(),
            vesselName: point.shipName || 'Vessel',
            mmsi: point.mmsi || 0,
            count: 1
          })
        } else if (color === 'red' && previousColor !== 'red') {
          onVesselColorChange({
            id: `alert-red-${point.shipName || 'Vessel'}`,
            type: 'red',
            message: 'Vessel passing over cable',
            timestamp: new Date().toISOString(),
            vesselName: point.shipName || 'Vessel',
            mmsi: point.mmsi || 0,
            count: 1
          })
        }
      }
      
      // Update marker position
      trajectoryMarkerRef.current.setLngLat([point.lon, point.lat])
      
      // Update icon color
      const currentElement = trajectoryMarkerRef.current.getElement()
      const currentSvg = currentElement.querySelector('svg')
      if (currentSvg) {
        const colorMap = {
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444'
        }
        // Update all fill colors in SVG (hull, deck, superstructure)
        const coloredElements = currentSvg.querySelectorAll('path[fill], rect[fill]')
        coloredElements.forEach((element) => {
          const fill = element.getAttribute('fill')
          // Only update if it's one of our color values (not white or transparent)
          if (fill && fill !== 'white' && fill !== 'none' && fill !== 'transparent') {
            element.setAttribute('fill', colorMap[color])
          }
        })
      }

      // Update previous color
      previousColorRef.current = color

      // Move to next point (stop at end, don't loop)
      const nextIndex = currentIndex + 1
      if (nextIndex >= trajectory.length) {
        // Stop animation when reaching the end
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current)
          animationIntervalRef.current = null
        }
        // Keep marker visible at final position
        return
      } else {
        currentTrajectoryIndexRef.current = nextIndex
      }
    }

    // Start animation loop (100ms delay between points - adjust for speed)
    animationIntervalRef.current = setInterval(animate, 100)

    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
      if (trajectoryMarkerRef.current) {
        trajectoryMarkerRef.current.remove()
        trajectoryMarkerRef.current = null
      }
    }
  }, [trajectory, infrastructure])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}
