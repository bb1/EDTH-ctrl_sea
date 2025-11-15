// API client functions for fetching maritime data
// Uses Next.js API routes as proxy to backend

import type { Ship, Infrastructure, Alert } from './types';

// Use Next.js API routes (which proxy to backend) or direct backend URL
const API_BASE = typeof window !== 'undefined' 
  ? '' // Use relative URLs on client side (Next.js API routes)
  : (process.env.BACKEND_URL || 'http://localhost:3001'); // Server-side: direct backend

/**
 * Fetch all ships from backend API
 */
export async function fetchShips(): Promise<Ship[]> {
  try {
    const response = await fetch('/api/ships', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ships: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching ships:', error);
    return [];
  }
}

/**
 * Fetch all infrastructure zones from backend API
 */
export async function fetchInfrastructure(): Promise<Infrastructure[]> {
  try {
    const response = await fetch('/api/infrastructure', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch infrastructure: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching infrastructure:', error);
    return [];
  }
}

/**
 * Fetch all alerts from backend API
 */
export async function fetchAlerts(): Promise<Alert[]> {
  try {
    const response = await fetch('/api/alerts', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch alerts: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

/**
 * Fetch all maritime data (ships, infrastructure, alerts)
 */
export async function fetchMaritimeData(): Promise<{
  ships: Ship[];
  infrastructure: Infrastructure[];
  alerts: Alert[];
}> {
  try {
    const [ships, infrastructure, alerts] = await Promise.all([
      fetchShips(),
      fetchInfrastructure(),
      fetchAlerts(),
    ]);

    return { ships, infrastructure, alerts };
  } catch (error) {
    console.error('Error fetching maritime data:', error);
    return { ships: [], infrastructure: [], alerts: [] };
  }
}

/**
 * Check if backend is connected
 */
export async function checkBackendConnection(): Promise<boolean> {
  try {
    const response = await fetch('/api/ships', {
      method: 'HEAD',
      cache: 'no-store',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

