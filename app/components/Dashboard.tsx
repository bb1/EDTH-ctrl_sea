'use client';

import { useState, useCallback } from 'react';
import { Header } from './Header';
import MaritimeMap from './MaritimeMap';
import { AlertsFeed } from './AlertsFeed';
import { VesselDetails } from './VesselDetails';
import { useMaritimeData } from '../hooks/useMaritimeData';
import { exportAlertsToCSV, downloadCSV } from '../lib/utils';
import type { Ship, Alert } from '../lib/types';

export function Dashboard() {
  const { data, loading, error, connected, lastUpdate, refreshData, getShipById } =
    useMaritimeData();
  const [selectedShipId, setSelectedShipId] = useState<number | null>(null);
  const [trajectoryAlerts, setTrajectoryAlerts] = useState<Alert[]>([]);

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
    const allAlerts = [...data.alerts, ...trajectoryAlerts];
    const csvContent = exportAlertsToCSV(allAlerts);
    downloadCSV(csvContent, `maritime-alerts-${new Date().toISOString().split('T')[0]}.csv`);
  }, [data.alerts, trajectoryAlerts]);

  const handleVesselColorChange = useCallback((vesselAlert: { id: string; type: 'yellow' | 'red'; message: string; timestamp: string; vesselName: string; mmsi: number; count: number }) => {
    // Convert VesselAlert to Alert format
    const alert: Alert = {
      id: trajectoryAlerts.length + 1,
      ship_id: 0, // Will be set if we can find the ship by MMSI
      vessel_name: vesselAlert.vesselName,
      alert_type: vesselAlert.type === 'red' ? 'geofence_breach' : 'trajectory_anomaly',
      description: vesselAlert.message,
      risk_percentage: vesselAlert.type === 'red' ? 90 : 60,
      timestamp: vesselAlert.timestamp
    };

    // Try to find ship by MMSI
    const ship = data.ships.find(s => s.mmsi === vesselAlert.mmsi.toString());
    if (ship) {
      alert.ship_id = ship.id;
    }

    setTrajectoryAlerts(prev => {
      // Check if alert already exists (by id)
      const existingIndex = prev.findIndex(a => a.id.toString() === vesselAlert.id);
      if (existingIndex >= 0) {
        // Update existing alert
        const updated = [...prev];
        updated[existingIndex] = { ...alert, id: prev[existingIndex].id };
        return updated;
      }
      // Add new alert
      return [...prev, alert];
    });
  }, [data.ships, trajectoryAlerts.length]);

  const selectedShip = selectedShipId ? getShipById(selectedShipId) : null;

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <Header
        connected={connected}
        lastUpdate={lastUpdate}
        onRefresh={refreshData}
        onExport={handleExport}
        alertsCount={data.alerts.length + trajectoryAlerts.length}
        shipsCount={data.ships.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Alerts Feed (25%) */}
        <div className="w-96 flex-shrink-0">
          <AlertsFeed
            alerts={[...data.alerts, ...trajectoryAlerts]}
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
            ships={data.ships.map(s => ({ id: s.id, name: s.name, lat: s.lat, long: s.long, risk_percentage: s.risk_percentage }))}
            infrastructure={data.infrastructure}
            onVesselClick={(ship) => {
              const fullShip = data.ships.find(s => s.id === ship.id);
              if (fullShip) setSelectedShipId(fullShip.id);
            }}
            onVesselColorChange={handleVesselColorChange}
          />
        </div>

        {/* Right Sidebar - Vessel Details (25%) */}
        <div className="w-96 flex-shrink-0">
          <VesselDetails
            ship={selectedShip}
            alerts={[...data.alerts, ...trajectoryAlerts]}
            onClose={handleCloseVesselDetails}
          />
        </div>
      </div>
    </div>
  );
}
