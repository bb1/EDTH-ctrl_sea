'use client';

import { useState, useCallback, useMemo } from 'react';
import { Header } from './Header';
import MaritimeMap from './MaritimeMap';
import { AlertsFeed } from './AlertsFeed';
import { VesselDetails } from './VesselDetails';
import { useMaritimeData } from '../hooks/useMaritimeData';
import { exportAlertsToCSV, downloadCSV } from '../lib/utils';
import type { Ship, Alert } from '../lib/types';

// Helper function to deduplicate alerts by ship_id and alert_type
function deduplicateAlerts(alerts: Alert[]): Alert[] {
  const alertMap = new Map<string, Alert>();
  
  alerts.forEach(alert => {
    // Create a key from ship_id and alert_type
    const key = `${alert.ship_id}-${alert.alert_type}`;
    const existing = alertMap.get(key);
    
    if (existing) {
      // Increment count if alert already exists
      // Add the counts together (incoming alert count + existing count)
      const incomingCount = alert.count || 1;
      const existingCount = existing.count || 1;
      alertMap.set(key, {
        ...existing,
        count: existingCount + incomingCount,
        timestamp: alert.timestamp > existing.timestamp ? alert.timestamp : existing.timestamp // Keep latest timestamp
      });
    } else {
      // Add new alert with count = 1 (or preserve existing count if present)
      alertMap.set(key, {
        ...alert,
        count: alert.count || 1
      });
    }
  });
  
  return Array.from(alertMap.values());
}

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

  // Deduplicate backend alerts and combine with trajectory alerts
  const allAlerts = useMemo(() => {
    const deduplicatedBackendAlerts = deduplicateAlerts(data.alerts);
    const combined = [...deduplicatedBackendAlerts, ...trajectoryAlerts];
    // Deduplicate the combined list as well
    return deduplicateAlerts(combined);
  }, [data.alerts, trajectoryAlerts]);

  const handleExport = useCallback(() => {
    const csvContent = exportAlertsToCSV(allAlerts);
    downloadCSV(csvContent, `maritime-alerts-${new Date().toISOString().split('T')[0]}.csv`);
  }, [allAlerts]);

  const handleVesselColorChange = useCallback((vesselAlert: { id: string; type: 'yellow' | 'red'; message: string; timestamp: string; vesselName: string; mmsi: number; count: number }) => {
    // Convert VesselAlert to Alert format
    const alertType = vesselAlert.type === 'red' ? 'geofence_breach' : 'trajectory_anomaly';
    const riskPercentage = vesselAlert.type === 'red' ? 90 : 50;

    // Try to find ship by MMSI
    const ship = data.ships.find(s => s.mmsi === vesselAlert.mmsi.toString());
    const shipId = ship ? ship.id : 0;

    setTrajectoryAlerts(prev => {
      // Check if alert already exists for the same ship and same alert type
      const existingIndex = prev.findIndex(
        a => a.ship_id === shipId && a.alert_type === alertType
      );
      
      if (existingIndex >= 0) {
        // Increment count for existing alert
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          count: (updated[existingIndex].count || 1) + 1,
          timestamp: vesselAlert.timestamp // Update to latest timestamp
        };
        return updated;
      }
      
      // Add new alert with count = 1
      const newAlert: Alert = {
        id: Date.now(), // Use timestamp as ID for uniqueness
        ship_id: shipId,
        vessel_name: vesselAlert.vesselName,
        alert_type: alertType,
        description: vesselAlert.message,
        risk_percentage: riskPercentage,
        timestamp: vesselAlert.timestamp,
        count: 1
      };
      return [...prev, newAlert];
    });
  }, [data.ships]);

  const selectedShip = selectedShipId ? (getShipById(selectedShipId) ?? null) : null;

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      <Header
        connected={connected}
        lastUpdate={lastUpdate}
        onRefresh={refreshData}
        onExport={handleExport}
        alertsCount={allAlerts.length}
        shipsCount={data.ships.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Alerts Feed (25%) */}
        <div className="w-96 flex-shrink-0">
          <AlertsFeed
            alerts={allAlerts}
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
            alerts={allAlerts}
            onClose={handleCloseVesselDetails}
          />
        </div>
      </div>
    </div>
  );
}
