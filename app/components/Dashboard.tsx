'use client'

import { useState, useEffect, useRef } from 'react'
import MaritimeMap from './MaritimeMap'
import AlertsFeed from './AlertsFeed'
import VesselDetails from './VesselDetails'
import Header from './Header'

interface Ship {
  id: number
  mmsi: number
  name: string
  flag: string
  origin: string
  destination: string
  lat: number
  long: number
  velocity: number
  risk_percentage: number
  last_position_time: string
  data_source: string
}

interface Infrastructure {
  id: number
  name: string
  type: string
  lat: number
  lng: number
  radius: number
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: any[]
}

interface Alert {
  id: number
  ship_id: number
  vessel_name: string
  alert_type: string
  description: string
  risk_percentage: number
  timestamp: string
}

// Deep comparison function to check if data has changed
function hasDataChanged<T>(oldData: T[], newData: T[]): boolean {
  if (oldData.length !== newData.length) return true
  
  // Create a map for quick lookup
  const oldMap = new Map(oldData.map(item => [(item as any).id, item]))
  
  for (const newItem of newData) {
    const id = (newItem as any).id
    const oldItem = oldMap.get(id)
    
    if (!oldItem) return true // New item found
    
    // Compare relevant fields that would affect the map
    if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
      return true
    }
  }
  
  return false
}

export default function Dashboard() {
  const [ships, setShips] = useState<Ship[]>([])
  const [infrastructure, setInfrastructure] = useState<Infrastructure[] | GeoJSONFeatureCollection>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null)
  
  // Keep refs to previous data for comparison
  const prevShipsRef = useRef<Ship[]>([])
  const prevInfrastructureRef = useRef<Infrastructure[] | GeoJSONFeatureCollection>([])
  const prevAlertsRef = useRef<Alert[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipsRes, infraRes, alertsRes] = await Promise.all([
          fetch('/api/ships'),
          fetch('/api/infrastructure'),
          fetch('/api/alerts')
        ])
        
        const newShips = await shipsRes.json()
        const newInfrastructure = await infraRes.json()
        const newAlerts = await alertsRes.json()
        
        // Only update state if data has actually changed
        if (hasDataChanged(prevShipsRef.current, newShips)) {
          setShips(newShips)
          prevShipsRef.current = newShips
        }
        
        // Check if infrastructure is GeoJSON or array
        const infraChanged = Array.isArray(newInfrastructure) 
          ? hasDataChanged(prevInfrastructureRef.current as Infrastructure[], newInfrastructure as Infrastructure[])
          : JSON.stringify(prevInfrastructureRef.current) !== JSON.stringify(newInfrastructure)
        
        if (infraChanged) {
          setInfrastructure(newInfrastructure)
          prevInfrastructureRef.current = newInfrastructure
        }
        
        if (hasDataChanged(prevAlertsRef.current, newAlerts)) {
          setAlerts(newAlerts)
          prevAlertsRef.current = newAlerts
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <AlertsFeed alerts={alerts} ships={ships} onSelectShip={setSelectedShip} />
        <MaritimeMap ships={ships} infrastructure={infrastructure} onVesselClick={setSelectedShip} />
        {selectedShip && <VesselDetails ship={selectedShip} onClose={() => setSelectedShip(null)} />}
      </div>
    </div>
  )
}
