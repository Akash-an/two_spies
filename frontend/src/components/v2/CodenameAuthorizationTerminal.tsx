import React, { useEffect, useState } from 'react';
import './CodenameAuthorizationTerminal.css';

export interface CodenameAuthorizationProps {
  operativeCodename?: string;
  sector?: string;
  latitude?: number | string;
  longitude?: number | string;
  threatLevel?: string;
  initializingText?: string;
  terminalLog?: string[];
  backgroundImageUrl?: string;
  onEstablish?: (codename: string) => void;
  onInputChange?: (value: string) => void;
  className?: string;
  loading?: boolean;
}

const CodenameAuthorizationTerminal: React.FC<CodenameAuthorizationProps> = ({
  operativeCodename = '',
  sector = '—',
  latitude,
  longitude,
  threatLevel = 'NORMAL',
  initializingText = 'INITIALIZING LINK...',
  terminalLog = [],
  backgroundImageUrl,
  onEstablish,
  onInputChange,
  className = '',
  loading = false,
}) => {
  const [input, setInput] = useState<string>(operativeCodename);

  useEffect(() => setInput(operativeCodename), [operativeCodename]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onEstablish?.(input);
  };

  return (
    <div
      className={`codename-terminal min-h-screen flex items-center justify-center p-8 ${className}`}
      style={{
        backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="relative w-full max-w-4xl rounded-2xl panel p-8">
        <h1 className="text-center font-headline text-2xl tracking-widest text-ts-primary mb-4">
          CODENAME AUTHORIZATION TERMINAL
        </h1>

        <div className="mb-4 font-mono text-sm text-ts-text-cyan">{initializingText}</div>

        <form onSubmit={submit} className="space-y-4">
          <input
            aria-label="Operative Codename"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              onInputChange?.(e.target.value);
            }}
            placeholder="Enter operative codename"
            className="w-full rounded-full py-4 px-6 input-neon"
          />

          <div className="flex justify-center">
            <button type="submit" disabled={loading} className="primary-cta">
              {loading ? 'Connecting…' : 'ESTABLISH CONNECTION'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-sm text-ts-muted">
          <div>
            Sector: <strong>{sector}</strong> — Threat: <strong>{threatLevel}</strong>
          </div>
          <div>
            Coordinates: <strong>{latitude ?? '—'}</strong>, <strong>{longitude ?? '—'}</strong>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-xs text-ts-muted uppercase tracking-widest">Terminal</h3>
          <div className="mt-2 terminal-log">
            {terminalLog.length === 0 ? (
              <div className="text-ts-muted">No logs</div>
            ) : (
              terminalLog.map((l, i) => (
                <div key={i} className="terminal-line">
                  {l}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodenameAuthorizationTerminal;
