import React from 'react';
import './SurveillanceCommandCenterGlobalMap.css';

export interface CityMarker {
  id: string;
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface SurveillanceCommandCenterGlobalMapProps {
  mapImageUrl?: string;
  cities?: CityMarker[];
  selectedCityId?: string;
  onSelectCity?: (id: string) => void;
  logs?: string[];
  className?: string;
}

const SurveillanceCommandCenterGlobalMap: React.FC<SurveillanceCommandCenterGlobalMapProps> = ({
  mapImageUrl,
  cities = [],
  selectedCityId,
  onSelectCity,
  logs = [],
  className = '',
}) => {
  return (
    <div className={`surv-map p-6 ${className}`}>
      <h3 className="text-lg font-headline mb-3">SURVEILLANCE COMMAND CENTER — GLOBAL MAP</h3>

      <div className="map-wrapper">
        {mapImageUrl ? (
          <div className="map" style={{ backgroundImage: `url(${mapImageUrl})` }}>
            {cities.map((c) => (
              <button
                key={c.id}
                className={`city-marker ${selectedCityId === c.id ? 'selected' : ''}`}
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
                onClick={() => onSelectCity?.(c.id)}
                title={c.name}
              />
            ))}
          </div>
        ) : (
          <div className="map placeholder">Map not available</div>
        )}
      </div>

      <div className="mt-4 terminal-log">
        {logs.length === 0 ? (
          <div className="text-muted">No surveillance updates</div>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="terminal-line">
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SurveillanceCommandCenterGlobalMap;
