// TypeScript interfaces for maritime data

export interface Ship {
  id: number;
  mmsi: string;
  name: string;
  flag: string;
  origin: string;
  destination: string;
  lat: number;
  long: number;
  velocity: number;
  risk_percentage: number;
  last_position_time: string;
  data_source: 'AIS' | 'RADAR' | 'SATELLITE';
}

export interface Infrastructure {
  id: number;
  name: string;
  type: 'pipeline' | 'cable' | 'platform';
  lat: number;
  lng: number;
  radius: number;
}

export interface Alert {
  id: number;
  ship_id: number;
  vessel_name: string;
  alert_type: 'geofence_breach' | 'ais_gap' | 'trajectory_anomaly';
  description: string;
  risk_percentage: number;
  timestamp: string;
}

export interface AlertFilter {
  timeRange: '1h' | '6h' | '24h' | '7d';
  riskLevel: 'all' | 'high' | 'medium' | 'low';
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface MaritimeData {
  ships: Ship[];
  infrastructure: Infrastructure[];
  alerts: Alert[];
}

