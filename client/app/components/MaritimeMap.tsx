'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Ship, Infrastructure } from '../lib/types';
import { getRiskColor } from '../lib/utils';

interface MaritimeMapProps {
  ships: Ship[];
  infrastructure: Infrastructure[];
  selectedShipId: number | null;
  onShipClick: (ship: Ship) => void;
  onInfrastructureClick?: (infra: Infrastructure) => void;
}

export function MaritimeMap({
  ships,
  infrastructure,
  selectedShipId,
  onShipClick,
  onInfrastructureClick,
}: MaritimeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const markersRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const circlesRef = useRef<Map<number, maplibregl.CircleLayer>>(new Map());

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [18, 55], // Baltic Sea: longitude, latitude
      zoom: 6,
      attributionControl: true,
    });

    map.current.on('load', () => {
      setIsMapLoaded(true);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update vessel markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add new markers
    ships.forEach((ship) => {
      const color = getRiskColor(ship.risk_percentage);
      const isHighRisk = ship.risk_percentage >= 70;
      const isSelected = ship.id === selectedShipId;

      // Create marker element
      const el = document.createElement('div');
      el.className = 'vessel-marker';
      el.style.width = isSelected ? '16px' : '12px';
      el.style.height = isSelected ? '16px' : '12px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = `2px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.8)'}`;
      el.style.cursor = 'pointer';
      el.style.transition = 'all 0.2s';

      if (isHighRisk) {
        el.style.boxShadow = `0 0 0 0 ${color}`;
        el.style.animation = 'pulse 2s infinite';
      }

      // Add hover effect
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '1000';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
      });

      // Create tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'vessel-tooltip';
      tooltip.textContent = ship.name || `MMSI: ${ship.mmsi}`;
      tooltip.style.display = 'none';
      tooltip.style.position = 'absolute';
      tooltip.style.background = 'rgba(0, 0, 0, 0.8)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '4px 8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontSize = '12px';
      tooltip.style.whiteSpace = 'nowrap';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '10000';
      el.appendChild(tooltip);

      el.addEventListener('mouseenter', () => {
        tooltip.style.display = 'block';
      });
      el.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });

      // Create marker
      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([ship.long, ship.lat])
        .addTo(map.current!);

      el.addEventListener('click', () => {
        onShipClick(ship);
      });

      markersRef.current.set(ship.id, marker);
    });
  }, [ships, selectedShipId, isMapLoaded, onShipClick]);

  // Update infrastructure zones
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Remove old circles
    circlesRef.current.forEach((circle) => {
      if (map.current) {
        try {
          map.current.removeLayer(circle.id);
          map.current.removeSource(circle.id);
        } catch (e) {
          // Layer/source might not exist
        }
      }
    });
    circlesRef.current.clear();

    // Add infrastructure zones as circles
    infrastructure.forEach((infra) => {
      const sourceId = `infra-${infra.id}`;
      const layerId = `infra-circle-${infra.id}`;

      if (!map.current) return;

      // Add source
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [infra.lng, infra.lat],
          },
        },
      });

      // Calculate radius in meters (assuming radius is in km)
      const radiusMeters = infra.radius * 1000;

      // Convert meters to pixels at different zoom levels
      // At zoom 0: 1 meter ≈ 0.075 pixels
      // The formula scales with zoom: meters * 0.075 * (2^zoom)
      const radiusInPixels = {
        stops: [
          [0, (radiusMeters * 0.075)],
          [6, (radiusMeters * 0.075 * 64)], // Baltic Sea zoom level
          [12, (radiusMeters * 0.075 * 4096)],
          [18, (radiusMeters * 0.075 * 262144)],
        ],
        base: 2,
      };

      // Add circle layer
      map.current.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': radiusInPixels,
          'circle-color': '#3b82f6',
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3b82f6',
          'circle-stroke-opacity': 0.6,
        },
      });

      // Add click handler
      map.current.on('click', layerId, (e) => {
        if (onInfrastructureClick) {
          onInfrastructureClick(infra);
        }
      });

      map.current.on('mouseenter', layerId, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });

      map.current.on('mouseleave', layerId, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });

      circlesRef.current.set(infra.id, {
        id: layerId,
      } as maplibregl.CircleLayer);
    });
  }, [infrastructure, isMapLoaded, onInfrastructureClick]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <style jsx global>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        .vessel-marker {
          position: relative;
        }
        .vessel-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
}

