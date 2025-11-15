'use client';

import { RefreshCw, Download, Settings, BarChart3 } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  connected: boolean;
  lastUpdate: Date | null;
  onRefresh: () => void;
  onExport: () => void;
  alertsCount: number;
  shipsCount: number;
}

export function Header({
  connected,
  lastUpdate,
  onRefresh,
  onExport,
  alertsCount,
  shipsCount,
}: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never';
    const diffMs = Date.now() - lastUpdate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    return `${diffMins}m ago`;
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-bold text-slate-100">Maritime Monitor</h1>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-slate-300">
            {connected ? 'Connected to Backend' : 'Disconnected'}
          </span>
          {lastUpdate && (
            <span className="text-xs text-slate-500 ml-2">
              Updated {formatLastUpdate()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-400">
          <span className="font-semibold text-slate-200">{shipsCount}</span> vessels
          {' | '}
          <span className="font-semibold text-slate-200">{alertsCount}</span> alerts
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw
            size={18}
            className={isRefreshing ? 'animate-spin' : ''}
          />
          Refresh
        </button>

        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors"
        >
          <Download size={18} />
          Export
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors">
          <BarChart3 size={18} />
          Statistics
        </button>

        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg transition-colors">
          <Settings size={18} />
          Settings
        </button>
      </div>
    </header>
  );
}
