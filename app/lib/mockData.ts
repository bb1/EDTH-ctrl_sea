export const mockShips = [
  {
    id: 1,
    mmsi: 123456789,
    name: 'Merchant Alpha',
    flag: 'DK',
    origin: 'Copenhagen',
    destination: 'Hamburg',
    lat: 55.5,
    long: 14.2,
    velocity: 12.5,
    risk_percentage: 25,
    last_position_time: new Date().toISOString(),
    data_source: 'AIS'
  },
  {
    id: 2,
    mmsi: 234567890,
    name: 'Unknown Vessel',
    flag: 'XX',
    origin: 'Unknown',
    destination: 'Unknown',
    lat: 59.7,
    long: 18.8,
    velocity: 8.2,
    risk_percentage: 85,
    last_position_time: new Date().toISOString(),
    data_source: 'Radar'
  }
]

export const mockInfrastructure = [
  { id: 1, name: 'Nord Stream Pipeline', type: 'pipeline', lat: 59.8, lng: 18.5, radius: 2.0 },
  { id: 2, name: 'Wind Farm A', type: 'platform', lat: 54.8, lng: 13.2, radius: 1.5 }
]

export const mockAlerts = [
  {
    id: 1,
    ship_id: 2,
    vessel_name: 'Unknown Vessel',
    alert_type: 'geofence_breach',
    description: 'Vessel within 1.2nm of Nord Stream Pipeline',
    risk_percentage: 85,
    timestamp: new Date().toISOString()
  }
]
