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


