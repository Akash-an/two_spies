import React from 'react';
import './MissionDeploymentHub.css';

export interface UnitInfo {
  id: string;
  name: string;
  type?: string;
}

export interface MissionDeploymentHubProps {
  missionName?: string;
  availableUnits?: UnitInfo[];
  onDeploy?: (unitId: string) => void;
  targetCity?: string;
  backgroundImageUrl?: string;
  logs?: string[];
  className?: string;
  loading?: boolean;
}

const MissionDeploymentHub: React.FC<MissionDeploymentHubProps> = ({
  missionName = 'UNNAMED',
  availableUnits = [],
  onDeploy,
  targetCity = '—',
  backgroundImageUrl,
  logs = [],
  className = '',
  loading = false,
}) => {
  return (
    <div
      className={`mission-deployment min-h-screen flex items-center justify-center p-8 ${className}`}
      style={{
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="w-full max-w-5xl panel p-6 rounded-2xl">
        <h2 className="headline text-xl mb-3">MISSION DEPLOYMENT HUB — {missionName}</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <h3 className="subtle mb-2">Available Units</h3>
            <ul className="unit-list">
              {availableUnits.length === 0 ? (
                <li className="unit-empty">No units available</li>
              ) : (
                availableUnits.map((u) => (
                  <li key={u.id} className="unit-item">
                    <div>
                      <div className="unit-name">{u.name}</div>
                      <div className="unit-type">{u.type ?? 'INF'}</div>
                    </div>
                    <div>
                      <button
                        className="primary-cta"
                        onClick={() => onDeploy?.(u.id)}
                        disabled={loading}
                      >
                        {loading ? 'Deploying…' : 'DEPLOY'}
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <h3 className="subtle mb-2">Mission Target</h3>
            <div className="target-box mb-4">{targetCity}</div>

            <h3 className="subtle mb-2">Mission Log</h3>
            <div className="terminal-log">
              {logs.length === 0 ? (
                <div className="text-muted">No mission activity</div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className="terminal-line">
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionDeploymentHub;
