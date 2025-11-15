'use client';

import { useState, useCallback } from 'react';
import { Header } from './Header';
import { MaritimeMap } from './MaritimeMap';
import { AlertsFeed } from './AlertsFeed';
import { VesselDetails } from './VesselDetails';
import { useMaritimeData } from '../hooks/useMaritimeData';
import { exportAlertsToCSV, downloadCSV } from '../lib/utils';
import type { Ship, Alert } from '../lib/types';

export function Dashboard() {
  const { data, loading, error, connected, lastUpdate, refreshData, getShipById } =
    useMaritimeData();
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);

  const handleShipClick = useCallback((ship: Ship) => {
    setSelectedShipId(ship.id);
  }, []);

  const handleAlertClick = useCallback(
    (alert: Alert) => {
      // Find the ship associated with this alert and select it
      const ship = getShipById(alert.ship_id);
      if (ship) {
        setSelectedShipId(ship.id);
      }
    },
    [getShipById]
  );

  const handleCloseVesselDetails = useCallback(() => {
    setSelectedShipId(null);
  }, []);

  const handleExport = useCallback(() => {
    const csvContent = exportAlertsToCSV(data.alerts);
    downloadCSV(csvContent, `maritime-alerts-${new Date().toISOString().split('T')[0]}.csv`);
  }, [data.alerts]);

  const selectedShip = selectedShipId ? getShipById(selectedShipId) : null;

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <Header
        connected={connected}
        lastUpdate={lastUpdate}
        onRefresh={refreshData}
        onExport={handleExport}
        alertsCount={data.alerts.length}
        shipsCount={data.ships.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Alerts Feed (25%) */}
        <div className="w-96 flex-shrink-0">
          <AlertsFeed
            alerts={data.alerts}
            ships={data.ships}
            onAlertClick={handleAlertClick}
          />
        </div>

        {/* Center - Map (50%) */}
        <div className="flex-1 relative">
          {loading && !connected && (
            <div className="absolute inset-0 bg-slate-900/80 z-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
                <p className="text-slate-400">Connecting to backend...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg">
              {error}
            </div>
          )}

          <MaritimeMap
            ships={data.ships}
            infrastructure={data.infrastructure}
            selectedShipId={selectedShipId}
            onShipClick={handleShipClick}
          />
        </div>

        {/* Right Sidebar - Vessel Details (25%) */}
        <div className="w-96 flex-shrink-0">
          <VesselDetails
            ship={selectedShip}
            alerts={data.alerts}
            onClose={handleCloseVesselDetails}
          />
        </div>
      </div>
    </div>
  );
}

