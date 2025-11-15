'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchMaritimeData, checkBackendConnection } from '../lib/api';
import type { MaritimeData, Ship } from '../lib/types';

const REFRESH_INTERVAL = 5000; // 5 seconds

export function useMaritimeData() {
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

      // Fetch data
      const newData = await fetchMaritimeData();
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
  }, []);

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

