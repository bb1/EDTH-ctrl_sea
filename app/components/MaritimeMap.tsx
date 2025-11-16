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
  const [mapInitialized, setMapInitialized] = useState(false)
  const [trajectoryReady, setTrajectoryReady] = useState(false)
  const trajectoryMarkerRef = useRef<maplibregl.Marker | null>(null)
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentTrajectoryIndexRef = useRef<number>(0)
  const previousColorRef = useRef<'green' | 'yellow' | 'red' | null>(null)
  const previousTrajectoryLengthRef = useRef<number>(0)
  const trajectoryInitializedRef = useRef<boolean>(false)
  const trajectoryRef = useRef<TrajectoryPoint[]>([])
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
      setMapInitialized(true)
    })

    return () => {
      // Clean up markers
      shipMarkersRef.current.forEach(marker => marker.remove())
      shipMarkersRef.current.clear()
      infrastructureMarkersRef.current.forEach(marker => marker.remove())
      infrastructureMarkersRef.current.clear()
      // Clean up trajectory markers
      if (trajectoryMarkerRef.current) {
        trajectoryMarkerRef.current.remove()
        trajectoryMarkerRef.current = null
      }
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current)
        animationIntervalRef.current = null
      }
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
      setMapInitialized(false)
      setTrajectoryReady(false)
      // Reset trajectory initialization so it can restart on remount
      trajectoryInitializedRef.current = false
      currentTrajectoryIndexRef.current = 0
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

  // Fetch trajectory data periodically
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
    
    // Initial fetch
    fetchTrajectory()
    
    // Set up periodic refresh (every 5 seconds, same as maritime data)
    const interval = setInterval(fetchTrajectory, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Calculate bearing (angle) between two points in degrees
  // Returns angle in degrees where 0° = North, 90° = East, 180° = South, 270° = West
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const dLon = lon2 - lon1
    const y = Math.sin(dLon) * Math.cos(lat2)
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
    const bearing = Math.atan2(y, x)
    // Convert to degrees and normalize to 0-360
    return ((bearing * 180 / Math.PI) + 360) % 360
  }
  
  // Convert geographic bearing to SVG rotation angle
  // Geographic: 0°=N, 90°=E, 180°=S, 270°=W
  // SVG (clockwise): 0°=E(right), 90°=S(down), 180°=W(left), 270°=N(up)
  const bearingToRotation = (bearing: number): number => {
    // SVG rotation is clockwise, geographic bearing is clockwise from North
    // To convert: subtract 90° and negate (because SVG 0° is East, not North)
    // Formula: rotation = (90 - bearing) % 360, but we need to handle negatives
    let rotation = (90 - bearing) % 360
    if (rotation < 0) rotation += 360
    return rotation
  }

  // Create ship icon SVG - boat shape
  const createShipIcon = (color: 'green' | 'yellow' | 'red', rotation: number = 0): HTMLElement => {
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
    
    // Boat shape SVG - top-down Battleship style with recognizable front
    // The boat points right (0 degrees) by default, rotation will be applied
    const svg = `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotation}deg); transform-origin: center;">
        <!-- Boat hull (pointed front pointing right, rounded back - top-down view) -->
        <path d="M6 18 Q6 14 10 14 L24 14 L30 20 L24 26 L10 26 Q6 26 6 22 Z" 
              fill="${colorMap[color]}" 
              stroke="white" 
              stroke-width="2" 
              stroke-linejoin="round"/>
        <!-- Boat superstructure (positioned toward back/left to indicate direction) -->
        <rect x="8" y="17" width="8" height="6" 
              fill="${colorMap[color]}" 
              stroke="white" 
              stroke-width="1.5" 
              rx="1"
              opacity="0.8"/>
      </svg>
    `
    el.innerHTML = svg
    return el
  }

  // Initialize animation only once when both map and trajectory are ready
  useEffect(() => {
    // Wait for map to be initialized
    if (!map.current || !mapInitialized) {
      return
    }

    // Wait for trajectory data
    if (!trajectoryReady || trajectory.length === 0) {
      return
    }

    // Only initialize once
    if (trajectoryInitializedRef.current) {
      return
    }

    // Update trajectory ref
    trajectoryRef.current = trajectory

    // Create initial marker at first point
    const initialPoint = trajectory[0]
    // Use green as default if cables aren't loaded yet
    const initialColor = cablesMapRef.current.size > 0 
      ? getVesselColor({ lat: initialPoint.lat, lon: initialPoint.lon }, cablesMapRef.current)
      : 'green'
    
    // Fixed rotation to face WEST (180 degrees)
    const initialRotation = 180
    
    const icon = createShipIcon(initialColor, initialRotation)
    const marker = new maplibregl.Marker({ element: icon })
      .setLngLat([initialPoint.lon, initialPoint.lat])
      .addTo(map.current!)
    
    trajectoryMarkerRef.current = marker
    currentTrajectoryIndexRef.current = 0
    previousColorRef.current = initialColor
    previousTrajectoryLengthRef.current = trajectory.length
    trajectoryInitializedRef.current = true
    let previousPoint = initialPoint

    // Animation function - moves ship along trajectory
    // Uses trajectoryRef to always get the latest trajectory data
    const animate = () => {
      const currentTrajectory = trajectoryRef.current
      if (!map.current || !trajectoryMarkerRef.current || currentTrajectory.length === 0) return

      const currentIndex = currentTrajectoryIndexRef.current
      
      // Check if we're at or past the last point
      if (currentIndex >= currentTrajectory.length) {
        // Remove the ship marker and stop animation
        if (trajectoryMarkerRef.current) {
          trajectoryMarkerRef.current.remove()
          trajectoryMarkerRef.current = null
        }
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current)
          animationIntervalRef.current = null
        }
        return
      }

      const point = currentTrajectory[currentIndex]
      const isLastPoint = currentIndex === currentTrajectory.length - 1
      
      // If this is the last point, update position one final time and then remove immediately
      if (isLastPoint) {
        // Update to final position
        trajectoryMarkerRef.current.setLngLat([point.lon, point.lat])
        
        // Stop animation
        if (animationIntervalRef.current) {
          clearInterval(animationIntervalRef.current)
          animationIntervalRef.current = null
        }
        
        // Remove the ship marker immediately
        if (trajectoryMarkerRef.current) {
          trajectoryMarkerRef.current.remove()
          trajectoryMarkerRef.current = null
        }
        
        // Reset initialization so it can restart if new trajectory comes in
        trajectoryInitializedRef.current = false
        currentTrajectoryIndexRef.current = 0
        return
      }
      
      // Fixed rotation to face WEST (180 degrees)
      const rotation = 180
      
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
      
      // Update icon color and rotation
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
        // Update rotation
        currentSvg.style.transform = `rotate(${rotation}deg)`
        currentSvg.style.transformOrigin = 'center'
      }

      // Update previous color and point
      previousColorRef.current = color
      previousPoint = point
      
      // Move to next point
      currentTrajectoryIndexRef.current = currentIndex + 1
    }

    // Start animation loop (100ms delay between points - adjust for speed)
    // Only start if not already running
    if (!animationIntervalRef.current) {
      animationIntervalRef.current = setInterval(animate, 100)
    }

    return () => {
      // Don't clean up here - let it run until component unmounts
      // Only clean up on unmount
    }
  }, [mapInitialized, trajectoryReady]) // Depend on both map and trajectory readiness

  // Separate effect to update trajectory ref when trajectory changes (doesn't restart animation)
  useEffect(() => {
    trajectoryRef.current = trajectory
    // Update length reference for tracking
    if (trajectory.length > 0) {
      previousTrajectoryLengthRef.current = trajectory.length
      setTrajectoryReady(true)
    } else {
      setTrajectoryReady(false)
    }
  }, [trajectory])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}
