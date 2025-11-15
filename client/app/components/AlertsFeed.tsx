'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, Clock, Filter } from 'lucide-react';
import type { Alert, AlertFilter, Ship } from '../lib/types';
import { getRiskColor, formatTimestamp, getRiskLevel } from '../lib/utils';

interface AlertsFeedProps {
  alerts: Alert[];
  ships: Ship[];
  onAlertClick: (alert: Alert) => void;
}

export function AlertsFeed({ alerts, ships, onAlertClick }: AlertsFeedProps) {
  const [filter, setFilter] = useState<AlertFilter>({
    timeRange: '24h',
    riskLevel: 'all',
  });

  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Filter by time range
    const now = new Date();
    const timeRanges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };

    const timeLimit = timeRanges[filter.timeRange];
    filtered = filtered.filter(
      (alert) => now.getTime() - new Date(alert.timestamp).getTime() <= timeLimit
    );

    // Filter by risk level
    if (filter.riskLevel !== 'all') {
      filtered = filtered.filter((alert) => {
        const level = getRiskLevel(alert.risk_percentage);
        return level === filter.riskLevel;
      });
    }

    // Sort by timestamp (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return filtered;
  }, [alerts, filter]);

  const getAlertTypeLabel = (type: string): string => {
    switch (type) {
      case 'geofence_breach':
        return 'Geofence Breach';
      case 'ais_gap':
        return 'AIS Gap';
      case 'trajectory_anomaly':
        return 'Trajectory Anomaly';
      default:
        return type;
    }
  };

  const getAlertTypeColor = (type: string): string => {
    switch (type) {
      case 'geofence_breach':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'ais_gap':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'trajectory_anomaly':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 border-r border-slate-700">
      {/* Header */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle size={20} />
            Active Alerts ({filteredAlerts.length})
          </h2>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">
              Time Range
            </label>
            <select
              value={filter.timeRange}
              onChange={(e) =>
                setFilter({ ...filter, timeRange: e.target.value as AlertFilter['timeRange'] })
              }
              className="w-full px-3 py-1.5 bg-slate-700 text-slate-100 rounded border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">
              Risk Level
            </label>
            <select
              value={filter.riskLevel}
              onChange={(e) =>
                setFilter({ ...filter, riskLevel: e.target.value as AlertFilter['riskLevel'] })
              }
              className="w-full px-3 py-1.5 bg-slate-700 text-slate-100 rounded border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="high">High (≥70%)</option>
              <option value="medium">Medium (40-70%)</option>
              <option value="low">Low (&lt;40%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No alerts found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAlerts.map((alert) => {
              const riskColor = getRiskColor(alert.risk_percentage);
              const ship = ships.find((s) => s.id === alert.ship_id);

              return (
                <button
                  key={alert.id}
                  onClick={() => onAlertClick(alert)}
                  className="w-full text-left p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600/50 hover:border-slate-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-100 text-sm mb-1">
                        {alert.vessel_name || `MMSI: ${ship?.mmsi || 'Unknown'}`}
                      </div>
                      <div
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getAlertTypeColor(
                          alert.alert_type
                        )}`}
                      >
                        {getAlertTypeLabel(alert.alert_type)}
                      </div>
                    </div>
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: riskColor }}
                    >
                      {Math.round(alert.risk_percentage)}%
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                    {alert.description}
                  </p>

                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={12} />
                    {formatTimestamp(alert.timestamp)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Statistics */}
      <div className="px-4 py-3 border-t border-slate-700 bg-slate-900/50">
        <div className="text-xs text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Total Vessels:</span>
            <span className="text-slate-200 font-semibold">{ships.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Active Alerts:</span>
            <span className="text-slate-200 font-semibold">{alerts.length}</span>
          </div>
          <div className="flex justify-between">
            <span>High Risk:</span>
            <span className="text-red-400 font-semibold">
              {alerts.filter((a) => a.risk_percentage >= 70).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

