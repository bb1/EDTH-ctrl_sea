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

interface MaritimeMapProps {
  ships: Ship[]
  infrastructure: Infrastructure[]
  onVesselClick: (ship: Ship) => void
}

export default function MaritimeMap({ ships, infrastructure, onVesselClick }: MaritimeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [18.5, 55],
      zoom: 6
    })

    map.current.on('load', () => {
      if (!map.current) return

      // Add vessel markers
      ships.forEach(ship => {
        const el = document.createElement('div')
        const risk = ship.risk_percentage
        const color = risk >= 70 ? '#ef4444' : risk >= 40 ? '#f97316' : '#22c55e'
        
        el.style.width = '20px'
        el.style.height = '20px'
        el.style.backgroundColor = color
        el.style.borderRadius = '50%'
        el.style.cursor = 'pointer'
        el.addEventListener('click', () => onVesselClick(ship))

        new maplibregl.Marker({ element: el })
          .setLngLat([ship.long, ship.lat])
          .addTo(map.current!)
      })

      // Add infrastructure zones
      infrastructure.forEach(zone => {
        const el = document.createElement('div')
        el.style.width = '30px'
        el.style.height = '30px'
        el.style.backgroundColor = 'rgba(59, 130, 246, 0.3)'
        el.style.border = '2px dashed #3b82f6'
        el.style.borderRadius = '50%'

        new maplibregl.Marker({ element: el })
          .setLngLat([zone.lng, zone.lat])
          .setPopup(new maplibregl.Popup().setText(zone.name))
          .addTo(map.current!)
      })
    })

    return () => {
      map.current?.remove()
    }
  }, [ships, infrastructure, onVesselClick])

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
}
