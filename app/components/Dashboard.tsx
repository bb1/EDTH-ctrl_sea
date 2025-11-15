'use client'

import { useState, useEffect } from 'react'
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

interface Alert {
  id: number
  ship_id: number
  vessel_name: string
  alert_type: string
  description: string
  risk_percentage: number
  timestamp: string
}

export default function Dashboard() {
  const [ships, setShips] = useState<Ship[]>([])
  const [infrastructure, setInfrastructure] = useState<Infrastructure[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [shipsRes, infraRes, alertsRes] = await Promise.all([
          fetch('/api/ships'),
          fetch('/api/infrastructure'),
          fetch('/api/alerts')
        ])
        setShips(await shipsRes.json())
        setInfrastructure(await infraRes.json())
        setAlerts(await alertsRes.json())
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
