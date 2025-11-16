'use client';

import { Ship, Radio, Satellite, Plane } from 'lucide-react';

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
  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never';
    const diffMs = Date.now() - lastUpdate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    return `${diffMins}m ago`;
  };

  interface DataSourceButtonProps {
    name: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    active: boolean;
  }

  function DataSourceButton({ name, icon: Icon, active }: DataSourceButtonProps) {
    return (
      <button
        className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
          active
            ? 'bg-green-600/20 border border-green-500/50 text-green-400'
            : 'bg-slate-700/50 border border-slate-600/50 text-slate-400'
        }`}
        title={active ? `${name} - Active` : `${name} - Inactive`}
      >
        <Icon size={20} />
        <span className="text-xs font-medium">{name}</span>
      </button>
    );
  }

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

        <div className="flex items-center gap-2">
          <DataSourceButton
            name="AIS"
            icon={Ship}
            active={true}
          />
          <DataSourceButton
            name="Radar"
            icon={Radio}
            active={true}
          />
          <DataSourceButton
            name="Satellite"
            icon={Satellite}
            active={false}
          />
          <DataSourceButton
            name="Drone"
            icon={Plane}
            active={false}
          />
        </div>
      </div>
    </header>
  );
}
