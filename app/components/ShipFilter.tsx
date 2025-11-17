'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import type { Ship } from '../lib/types';

export interface ShipFilterState {
  flag: string;
  shipName: string;
  destination: string;
  classification: string;
  mmsi: string;
}

interface ShipFilterProps {
  ships: Ship[];
  filters?: ShipFilterState;
  onFiltersChange?: (filters: ShipFilterState) => void;
  showTrails?: boolean;
  onShowTrailsChange?: (show: boolean) => void;
}

const defaultFilters: ShipFilterState = {
  flag: '',
  shipName: '',
  destination: '',
  classification: '',
  mmsi: '',
};

export function ShipFilter({
  ships,
  filters = defaultFilters,
  onFiltersChange,
  showTrails = false,
  onShowTrailsChange,
}: ShipFilterProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get unique values for dropdowns
  const uniqueFlags = useMemo(() => {
    const flags = new Set(ships.map(s => s.flag).filter(Boolean));
    return Array.from(flags).sort();
  }, [ships]);

  const uniqueDestinations = useMemo(() => {
    const destinations = new Set(ships.map(s => s.destination).filter(Boolean));
    return Array.from(destinations).sort();
  }, [ships]);

  const uniqueClassifications = useMemo(() => {
    const classifications = new Set(ships.map(s => s.classification).filter(Boolean));
    return Array.from(classifications).sort();
  }, [ships]);

  // Filter ships based on current filters
  const filteredShips = useMemo(() => {
    return ships.filter(ship => {
      if (filters.flag && ship.flag !== filters.flag) return false;
      if (filters.shipName && !ship.name.toLowerCase().includes(filters.shipName.toLowerCase())) return false;
      if (filters.destination && ship.destination !== filters.destination) return false;
      if (filters.classification && ship.classification !== filters.classification) return false;
      if (filters.mmsi && !ship.mmsi.includes(filters.mmsi)) return false;
      return true;
    });
  }, [ships, filters]);

  const handleFilterChange = (key: keyof ShipFilterState, value: string) => {
    if (!onFiltersChange) return;
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    if (!onFiltersChange) return;
    onFiltersChange({
      flag: '',
      shipName: '',
      destination: '',
      classification: '',
      mmsi: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="bg-slate-800 border-b border-slate-700 flex-shrink-0">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-300" />
          <h3 className="text-sm font-semibold text-slate-100">
            Filters
            {hasActiveFilters && (
              <span className="ml-2 text-xs text-blue-400">
                ({filteredShips.length} vessels)
              </span>
            )}
          </h3>
        </div>
        {isExpanded ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {/* Filter Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Flag Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">
              Flag
            </label>
            <select
              value={filters.flag}
              onChange={(e) => handleFilterChange('flag', e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-700 text-slate-100 rounded border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Flags</option>
              {uniqueFlags.map(flag => (
                <option key={flag} value={flag}>{flag}</option>
              ))}
            </select>
          </div>

          {/* Ship Name Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">
              Ship Name
            </label>
            <input
              type="text"
              value={filters.shipName}
              onChange={(e) => handleFilterChange('shipName', e.target.value)}
              placeholder="Search by name..."
              className="w-full px-3 py-1.5 bg-slate-700 text-slate-100 rounded border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Destination Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">
              Destination
            </label>
            <select
              value={filters.destination}
              onChange={(e) => handleFilterChange('destination', e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-700 text-slate-100 rounded border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Destinations</option>
              {uniqueDestinations.map(dest => (
                <option key={dest} value={dest}>{dest}</option>
              ))}
            </select>
          </div>

          {/* Classification Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">
              Classification
            </label>
            <select
              value={filters.classification}
              onChange={(e) => handleFilterChange('classification', e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-700 text-slate-100 rounded border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classifications</option>
              {uniqueClassifications.map(classification => (
                <option key={classification} value={classification}>{classification}</option>
              ))}
            </select>
          </div>

          {/* MMSI Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">
              MMSI
            </label>
            <input
              type="text"
              value={filters.mmsi}
              onChange={(e) => handleFilterChange('mmsi', e.target.value)}
              placeholder="Search by MMSI..."
              className="w-full px-3 py-1.5 bg-slate-700 text-slate-100 rounded border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded border border-slate-600 transition-colors"
            >
              Clear All Filters
            </button>
          )}

          {/* Show Trails Toggle */}
          {filteredShips.length < 200 && (
            <div className="pt-2 border-t border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrails}
                  onChange={(e) => onShowTrailsChange?.(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-xs font-semibold text-slate-300">
                  Show trails for all filtered ships ({filteredShips.length})
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

