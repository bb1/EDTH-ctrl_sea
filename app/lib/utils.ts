// Utility functions for maritime dashboard

import type { Ship, RiskLevel, Alert } from './types';

/**
 * Get risk level color based on percentage
 */
export function getRiskColor(riskPercentage: number): string {
  if (riskPercentage < 40) return '#22c55e'; // green
  if (riskPercentage < 70) return '#f97316'; // orange
  return '#ef4444'; // red
}

/**
 * Get risk level category
 */
export function getRiskLevel(riskPercentage: number): RiskLevel {
  if (riskPercentage < 40) return 'low';
  if (riskPercentage < 70) return 'medium';
  return 'high';
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format timestamp to readable string
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format velocity from knots to readable string
 */
export function formatVelocity(velocity: number): string {
  return `${velocity.toFixed(1)} knots`;
}

/**
 * Get infrastructure type icon
 */
export function getInfrastructureIcon(type: 'pipeline' | 'cable' | 'platform'): string {
  switch (type) {
    case 'pipeline':
      return '⚙️';
    case 'cable':
      return '🔌';
    case 'platform':
      return '⛽';
    default:
      return '📍';
  }
}

/**
 * Export alerts to CSV format
 */
export function exportAlertsToCSV(alerts: Alert[]): string {
  const headers = ['ID', 'Vessel Name', 'Alert Type', 'Description', 'Risk %', 'Timestamp'];
  const rows = alerts.map(alert => [
    alert.id.toString(),
    alert.vessel_name,
    alert.alert_type,
    alert.description.replace(/,/g, ';'), // Replace commas in description
    alert.risk_percentage.toString(),
    alert.timestamp
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Calculate distance from a point to a line segment
 * Returns distance in degrees (approximate)
 */
export function pointToSegmentDistance(
  point: { lat: number; lon: number },
  segment: { p1: { lat: number; lon: number }; p2: { lat: number; lon: number } }
): number {
  const { p1, p2 } = segment
  const A = point.lon - p1.lon
  const B = point.lat - p1.lat
  const C = p2.lon - p1.lon
  const D = p2.lat - p1.lat

  const dot = A * C + B * D
  const lenSq = C * C + D * D

  if (lenSq === 0) {
    const dx = point.lon - p1.lon
    const dy = point.lat - p1.lat
    return Math.sqrt(dx * dx + dy * dy)
  }

  const param = dot / lenSq

  let xx: number, yy: number

  if (param < 0) {
    xx = p1.lon
    yy = p1.lat
  } else if (param > 1) {
    xx = p2.lon
    yy = p2.lat
  } else {
    xx = p1.lon + param * C
    yy = p1.lat + param * D
  }

  const dx = point.lon - xx
  const dy = point.lat - yy
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Get minimum distance from a point to any segment of a cable
 */
export function getMinDistanceToCable(
  point: { lat: number; lon: number },
  cableSegments: { coordinates: number[][] }[]
): number {
  let minDistance = Infinity

  for (const segment of cableSegments) {
    const coords = segment.coordinates
    for (let i = 0; i < coords.length - 1; i++) {
      const dist = pointToSegmentDistance(
        point,
        {
          p1: { lat: coords[i][1], lon: coords[i][0] },
          p2: { lat: coords[i + 1][1], lon: coords[i + 1][0] }
        }
      )
      minDistance = Math.min(minDistance, dist)
    }
  }

  return minDistance
}

/**
 * Determine vessel color based on proximity to cables
 * Returns: 'green' | 'yellow' | 'red'
 */
export function getVesselColor(
  point: { lat: number; lon: number },
  cables: Map<string, { coordinates: number[][] }[]>
): 'green' | 'yellow' | 'red' {
  const TARGET_CABLES = {
    GERMANY_DENMARK_3: 'germany-denmark-3',
    ELEKTRA_GC1: 'elektra-globalconnect-1-gc1',
    GLOBALCONNECT_KPN: 'globalconnect-kpn'
  }

  const APPROACH_THRESHOLD = 0.05 // degrees (~5.5 km)
  const OVER_CABLE_THRESHOLD = 0.01 // degrees (~1.1 km)
  const EXIT_THRESHOLD = 0.1 // degrees (~11 km)

  // Check distance to each target cable
  const distances = {
    germanyDenmark3: cables.has(TARGET_CABLES.GERMANY_DENMARK_3)
      ? getMinDistanceToCable(point, cables.get(TARGET_CABLES.GERMANY_DENMARK_3)!)
      : Infinity,
    elektraGc1: cables.has(TARGET_CABLES.ELEKTRA_GC1)
      ? getMinDistanceToCable(point, cables.get(TARGET_CABLES.ELEKTRA_GC1)!)
      : Infinity,
    globalconnectKpn: cables.has(TARGET_CABLES.GLOBALCONNECT_KPN)
      ? getMinDistanceToCable(point, cables.get(TARGET_CABLES.GLOBALCONNECT_KPN)!)
      : Infinity
  }

  const minDistance = Math.min(distances.germanyDenmark3, distances.elektraGc1, distances.globalconnectKpn)

  // Red: passing over any of the 3 cables
  if (minDistance < OVER_CABLE_THRESHOLD) {
    return 'red'
  }

  // Yellow: approaching germany-denmark-3 or in the area (but not directly over)
  if (distances.germanyDenmark3 < APPROACH_THRESHOLD || 
      distances.elektraGc1 < APPROACH_THRESHOLD || 
      distances.globalconnectKpn < APPROACH_THRESHOLD) {
    return 'yellow'
  }

  // Green: beyond exit threshold from globalconnect-kpn (leaving the area)
  if (distances.globalconnectKpn > EXIT_THRESHOLD) {
    return 'green'
  }

  // Default green
  return 'green'
}


