// Utility functions for maritime dashboard

import type { Ship, RiskLevel, Alert } from './types';

/**
 * Get country flag code from MMSI (Maritime Mobile Service Identity)
 * The first 3 digits of MMSI represent the MID (Maritime Identification Digits)
 * which identifies the country of registration
 */
export function getFlagFromMMSI(mmsi: string | number): string {
  const mmsiStr = mmsi.toString();
  if (mmsiStr.length < 3) {
    return 'Unknown';
  }
  
  // Extract MID (first 3 digits)
  const mid = parseInt(mmsiStr.substring(0, 3));
  
  // MID to country code mapping (ISO 3166-1 alpha-2)
  // Common maritime countries
  const midToCountry: Record<number, string> = {
    // Russia
    273: 'RU',
    274: 'RU',
    275: 'RU',
    276: 'RU',
    277: 'RU',
    278: 'RU',
    279: 'RU',
    
    // China
    412: 'CN',
    413: 'CN',
    414: 'CN',
    415: 'CN',
    416: 'CN',
    417: 'CN',
    418: 'CN',
    419: 'CN',
    
    // United States
    338: 'US',
    339: 'US',
    340: 'US',
    341: 'US',
    342: 'US',
    343: 'US',
    344: 'US',
    345: 'US',
    346: 'US',
    347: 'US',
    348: 'US',
    349: 'US',
    350: 'US',
    351: 'US',
    352: 'US',
    353: 'US',
    354: 'US',
    355: 'US',
    356: 'US',
    357: 'US',
    
    // United Kingdom
    232: 'GB',
    233: 'GB',
    234: 'GB',
    235: 'GB',
    
    // Germany
    211: 'DE',
    212: 'DE',
    213: 'DE',
    214: 'DE',
    215: 'DE',
    216: 'DE',
    217: 'DE',
    218: 'DE',
    
    // Denmark
    219: 'DK',
    220: 'DK',
    221: 'DK',
    
    // France
    226: 'FR',
    227: 'FR',
    228: 'FR',
    
    // Netherlands
    244: 'NL',
    245: 'NL',
    246: 'NL',
    247: 'NL',
    248: 'NL',
    
    // Norway
    257: 'NO',
    258: 'NO',
    259: 'NO',
    
    // Sweden
    265: 'SE',
    266: 'SE',
    267: 'SE',
    
    // Spain
    224: 'ES',
    225: 'ES',
    
    // Italy
    247: 'IT',
    248: 'IT',
    249: 'IT',
    
    // Greece
    237: 'GR',
    238: 'GR',
    239: 'GR',
    240: 'GR',
    241: 'GR',
    
    // Japan
    431: 'JP',
    432: 'JP',
    433: 'JP',
    434: 'JP',
    435: 'JP',
    436: 'JP',
    437: 'JP',
    
    // South Korea
    440: 'KR',
    441: 'KR',
    442: 'KR',
    443: 'KR',
    444: 'KR',
    445: 'KR',
    446: 'KR',
    447: 'KR',
    
    // Singapore
    563: 'SG',
    564: 'SG',
    565: 'SG',
    566: 'SG',
    567: 'SG',
    
    // India
    419: 'IN',
    420: 'IN',
    421: 'IN',
    422: 'IN',
    423: 'IN',
    424: 'IN',
    425: 'IN',
    426: 'IN',
    427: 'IN',
    428: 'IN',
    
    // Brazil
    710: 'BR',
    711: 'BR',
    712: 'BR',
    713: 'BR',
    714: 'BR',
    715: 'BR',
    716: 'BR',
    717: 'BR',
    718: 'BR',
    719: 'BR',
    
    // Canada
    316: 'CA',
    
    // Australia
    503: 'AU',
    504: 'AU',
    505: 'AU',
    506: 'AU',
    507: 'AU',
    
    // Turkey
    271: 'TR',
    
    // Poland
    261: 'PL',
    262: 'PL',
    263: 'PL',
    
    // Finland
    230: 'FI',
    231: 'FI',
  };
  
  return midToCountry[mid] || 'Unknown';
}

/**
 * Get flag image URL from country code
 * Uses flagcdn.com for reliable flag images
 */
export function getFlagImageUrl(countryCode: string, size: 'w20' | 'w40' | 'w80' | 'w160' = 'w40'): string | null {
  if (!countryCode || countryCode === 'Unknown') {
    return null;
  }
  
  // Convert to lowercase for URL
  const code = countryCode.toLowerCase();
  
  // Use flagcdn.com - reliable and free flag image service
  return `https://flagcdn.com/${size}/${code}.png`;
}

/**
 * Get flag emoji from country code
 * Converts ISO 3166-1 alpha-2 country code to flag emoji
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode === 'Unknown') {
    return '🏳️'; // White flag emoji as fallback
  }
  
  // Convert country code to flag emoji using regional indicator symbols
  // Each letter is converted to its regional indicator symbol
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0)); // Regional Indicator Symbol Letter A (🇦) starts at 127397
  
  return String.fromCodePoint(...codePoints);
}

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
 * Map AIS ship type code to human-readable vessel classification
 * Based on IMO/ITU standard AIS vessel type codes
 */
export function getVesselClassification(shipType: number | null | undefined): string {
  if (shipType === null || shipType === undefined) {
    return 'Unknown';
  }

  // AIS vessel type codes (0-99) - Standard ITU-R M.1371-5
  const typeMap: Record<number, string> = {
    0: 'Not specified',
    1: 'Reserved',
    2: 'Wing in ground',
    3: 'Special craft',
    4: 'High speed craft',
    5: 'Special craft',
    6: 'Passenger',
    7: 'Cargo',
    8: 'Tanker',
    9: 'Other',
  };

  // Range-based classifications
  if (shipType >= 20 && shipType <= 29) {
    return 'Wing in ground';
  }
  if (shipType >= 30 && shipType <= 39) {
    return 'Fishing';
  }
  if (shipType >= 40 && shipType <= 49) {
    return 'Towing';
  }
  if (shipType >= 50 && shipType <= 59) {
    return 'Dredging or underwater operations';
  }
  if (shipType >= 60 && shipType <= 69) {
    return 'Diving operations';
  }
  if (shipType >= 70 && shipType <= 79) {
    return 'Military operations';
  }
  if (shipType >= 80 && shipType <= 89) {
    return 'Sailing';
  }
  if (shipType >= 90 && shipType <= 99) {
    return 'Pleasure craft';
  }
  
  // Specific mappings for 0-9
  if (typeMap[shipType]) {
    return typeMap[shipType];
  }
  
  // Default fallback
  return `Type ${shipType}`;
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


