'use client';

import { X, MapPin, Navigation2, Clock, Flag, Ship as ShipIcon, AlertCircle, Tag } from 'lucide-react';
import type { Ship, Alert } from '../lib/types';
import { getRiskColor, formatTimestamp, formatVelocity, getRiskLevel } from '../lib/utils';

interface VesselDetailsProps {
  ship: Ship | null;
  alerts: Alert[];
  onClose: () => void;
  onDismissAlerts?: (shipId: number) => void;
}

export function VesselDetails({ ship, alerts, onClose, onDismissAlerts }: VesselDetailsProps) {
  if (!ship) {
    return (
      <div className="flex flex-col h-full bg-slate-800 border-l border-slate-700 items-center justify-center px-6">
        <ShipIcon size={48} className="text-slate-600 mb-4" />
        <p className="text-slate-400 text-center">
          Select a vessel from the map or alerts list to view details
        </p>
      </div>
    );
  }

  const riskColor = getRiskColor(ship.risk_percentage);
  const riskLevel = getRiskLevel(ship.risk_percentage);
  const riskLabel = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);

  const vesselAlerts = alerts
    .filter((alert) => alert.ship_id === ship.id)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-slate-800 border-l border-slate-700">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100 truncate flex-1">
          {ship.name || `MMSI: ${ship.mmsi}`}
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-700 rounded transition-colors"
        >
          <X size={20} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Risk Badge */}
        <div className="text-center">
          <div
            className="w-full py-6 rounded-lg mb-2"
            style={{ backgroundColor: riskColor }}
          >
            <div className="text-white text-4xl font-bold mb-1">
              {Math.round(ship.risk_percentage)}%
            </div>
            <div className="text-white/90 text-sm font-medium">{riskLabel} Risk</div>
          </div>
        </div>

        {/* Ship Information */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Ship Information
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ShipIcon size={16} className="text-slate-500" />
              <span className="text-slate-400">MMSI:</span>
              <span className="text-slate-100 font-medium">{ship.mmsi}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Flag size={16} className="text-slate-500" />
              <span className="text-slate-400">Flag:</span>
              <span className="text-slate-100 font-medium">{ship.flag || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Tag size={16} className="text-slate-500" />
              <span className="text-slate-400">Classification:</span>
              <span className="text-slate-100 font-medium">{ship.classification || 'Unknown'}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Origin:</span>
              <span className="text-slate-100 font-medium ml-2">{ship.origin || 'Unknown'}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Destination:</span>
              <span className="text-slate-100 font-medium ml-2">
                {ship.destination || 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Position & Movement */}
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Position & Movement
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={16} className="text-slate-500" />
              <span className="text-slate-400">Position:</span>
              <span className="text-slate-100 font-medium">
                {ship.lat.toFixed(4)}, {ship.long.toFixed(4)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Navigation2 size={16} className="text-slate-500" />
              <span className="text-slate-400">Velocity:</span>
              <span className="text-slate-100 font-medium">
                {formatVelocity(ship.velocity)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-slate-500" />
              <span className="text-slate-400">Last Update:</span>
              <span className="text-slate-100 font-medium">
                {formatTimestamp(ship.last_position_time)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Data Source:</span>
              <span className="text-slate-100 font-medium ml-2">{ship.data_source}</span>
            </div>
          </div>
        </div>

        {/* Alert History */}
        {vesselAlerts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide flex items-center gap-2">
              <AlertCircle size={16} />
              Recent Alerts ({vesselAlerts.length})
            </h3>
            <div className="space-y-2">
              {vesselAlerts.map((alert) => {
                const alertRiskColor = getRiskColor(alert.risk_percentage);
                return (
                  <div
                    key={alert.id}
                    className="p-3 bg-slate-700/50 rounded border border-slate-600/50"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-medium text-slate-300">
                          {alert.alert_type.replace(/_/g, ' ').replace(/\b\w/g, (l) =>
                            l.toUpperCase()
                          )}
                        </div>
                        {alert.count && alert.count > 1 && (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                            {alert.count}
                          </span>
                        )}
                      </div>
                      <div
                        className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: alertRiskColor }}
                      >
                        {Math.round(alert.risk_percentage)}%
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{alert.description}</p>
                    <div className="text-xs text-slate-500">
                      {formatTimestamp(alert.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
            Actions
          </h3>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
              Confirm Threat
            </button>
            <button 
              onClick={() => {
                if (ship && onDismissAlerts) {
                  onDismissAlerts(ship.id);
                }
              }}
              className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors text-sm font-medium"
            >
              Disregard Threat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
