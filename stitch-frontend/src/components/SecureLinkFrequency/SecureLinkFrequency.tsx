import React, { useState, useEffect } from 'react';
import './SecureLinkFrequency.css';

export interface SecureLinkFrequencyProps {
  frequency?: number | string;
  onTune?: (value: number | string) => void;
  autoTune?: boolean;
  logs?: string[];
  className?: string;
  loading?: boolean;
}

const SecureLinkFrequency: React.FC<SecureLinkFrequencyProps> = ({
  frequency = '000.0',
  onTune,
  autoTune = false,
  logs = [],
  className = '',
  loading = false,
}) => {
  const [value, setValue] = useState<string>(String(frequency));

  useEffect(() => setValue(String(frequency)), [frequency]);

  const tune = (e?: React.FormEvent) => {
    e?.preventDefault();
    onTune?.(value);
  };

  return (
    <div className={`secure-link p-6 rounded-lg ${className}`}>
      <h3 className="text-lg font-headline mb-2">SECURE LINK FREQUENCY</h3>

      <form onSubmit={tune} className="flex items-center gap-3 mb-4">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-neon"
          aria-label="frequency"
        />
        <button className="primary-cta" onClick={tune} disabled={loading}>
          {loading ? 'Tuning…' : autoTune ? 'AUTO TUNE' : 'TUNE'}
        </button>
      </form>

      <div className="terminal-log">
        {logs.length === 0 ? (
          <div className="text-muted">No activity</div>
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

export default SecureLinkFrequency;
