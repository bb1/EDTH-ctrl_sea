'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchMaritimeData, checkBackendConnection } from '../lib/api';
import { useDataSource } from '../contexts/DataSourceContext';
import type { MaritimeData, Ship } from '../lib/types';

const REFRESH_INTERVAL = 5000; // 5 seconds

export function useMaritimeData() {
  const { dataSource } = useDataSource();
  const [data, setData] = useState<MaritimeData>({
    ships: [],
    infrastructure: [],
    alerts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check connection
      const isConnected = await checkBackendConnection();
      setConnected(isConnected);

      if (!isConnected) {
        setError('Backend disconnected');
        setLoading(false);
        return;
      }

      // Fetch data with current data source
      let newData = await fetchMaritimeData(dataSource);
      
      // In synthetic mode, create ships from trajectory data
      if (dataSource === 'synthetic') {
        try {
          const trajectoryResponse = await fetch(`/api/trajectory?dataSource=synthetic`, {
            cache: 'no-store',
          });
          if (trajectoryResponse.ok) {
            const trajectory = await trajectoryResponse.json();
            // Group trajectory points by MMSI and create ships
            // Use MMSI as ship ID for consistency with alerts
            const shipsMap = new Map<number, Ship>();
            trajectory.forEach((point: any, index: number) => {
              const mmsi = point.mmsi || 0;
              if (!shipsMap.has(mmsi)) {
                // Create a ship from the first occurrence of this MMSI
                // Use MMSI as ID to ensure consistency with alerts
                shipsMap.set(mmsi, {
                  id: mmsi, // Use MMSI as ID for consistency
                  mmsi: mmsi.toString(),
                  name: point.shipName || 'Unknown',
                  flag: 'Unknown',
                  origin: 'Unknown',
                  destination: 'Unknown',
                  lat: point.lat || 0,
                  long: point.lon || 0,
                  velocity: 0,
                  risk_percentage: 0,
                  last_position_time: point.timestamp || new Date().toISOString(),
                  data_source: 'AIS',
                });
              } else {
                // Update ship with latest position
                const ship = shipsMap.get(mmsi)!;
                ship.lat = point.lat || ship.lat;
                ship.long = point.lon || ship.long;
                ship.last_position_time = point.timestamp || ship.last_position_time;
              }
            });
            newData.ships = Array.from(shipsMap.values());
            
            // Also create ships from alerts that don't have corresponding trajectory data
            // This handles cases where alerts exist but ships aren't in trajectory yet
            newData.alerts.forEach(alert => {
              if (alert.ship_id > 0 && !shipsMap.has(alert.ship_id)) {
                // Create a ship from alert data
                shipsMap.set(alert.ship_id, {
                  id: alert.ship_id,
                  mmsi: alert.ship_id.toString(),
                  name: alert.vessel_name || 'Unknown',
                  flag: 'Unknown',
                  origin: 'Unknown',
                  destination: 'Unknown',
                  lat: 0, // Position unknown, will be updated when trajectory data arrives
                  long: 0,
                  velocity: 0,
                  risk_percentage: alert.risk_percentage,
                  last_position_time: alert.timestamp,
                  data_source: 'AIS',
                });
              }
            });
            
            // Update ships array with any ships created from alerts
            newData.ships = Array.from(shipsMap.values());
          }
        } catch (trajectoryError) {
          console.error('Error fetching trajectory for synthetic ships:', trajectoryError);
        }
      }
      
      setData(newData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [dataSource]);

  useEffect(() => {
    // Initial fetch
    refreshData();

    // Set up auto-refresh
    const interval = setInterval(refreshData, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [refreshData]);

  const getShipById = useCallback(
    (id: number): Ship | undefined => {
      return data.ships.find((ship) => ship.id === id);
    },
    [data.ships]
  );

  return {
    data,
    loading,
    error,
    connected,
    lastUpdate,
    refreshData,
    getShipById,
  };
}

