import React, { useEffect, useState } from 'react';
import './CodenameAuthorizationTerminal.css';

export interface CodenameAuthorizationProps {
  operativeCodename?: string;
  sector?: string;
  latitude?: number | string;
  longitude?: number | string;
  threatLevel?: 'High' | 'Normal' | 'Low' | 'HIGH' | 'NORMAL' | 'LOW' | 'STRANDED' | 'UNKNOWN';
  terminalLog?: string[];
  recentAccess?: string[];
  backgroundImageUrl?: string;
  onEstablish?: (codename: string) => void;
  onInputChange?: (value: string) => void;
  loading?: boolean;
}

const CodenameAuthorizationTerminal: React.FC<CodenameAuthorizationProps> = ({
  operativeCodename = '',
  sector = '07-B',
  latitude = '38.9072° N',
  longitude = '77.0369° W',
  threatLevel = 'High',
  terminalLog = [
    'INITIALIZING LINK...',
    'SCRUBBING METADATA...',
    'BOUNCING SIGNAL: SIN - LDN - DC',
  ],
  recentAccess = [
    '04:12 - OPERATIVE_09 SIGNED OFF',
    '02:45 - SYSTEM_PURGE COMPLETE',
    '23:59 - NEW MISSION UPLOADED',
  ],
  backgroundImageUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAqCYge2907Tr85ZM24WhzOY4YJsZ97Yv42lvCQVuXSp0ImvoLge43gKT5R2V7NFCCeTNcnRVvuoEJTJFlMgINe2-8hNcTrKooy2YGurWemqCUfQNNImgK0Zykup8Qp9pFcIVqnD6qJj9Zf9mSIxHLmFK4Xis4d8j-Oap7Z5nY-Kzh8Es28fxHZaZRocVVd-A1-0E2erGQnREc3lYvp6prDIvKukMLbqA6zF4sy7eiH1ATGlbLdzG9jVwNLxpueT8aFHuDoTcrUROc',
  onEstablish,
  onInputChange,
  loading = false,
}) => {
  const [input, setInput] = useState<string>(operativeCodename);

  useEffect(() => setInput(operativeCodename), [operativeCodename]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim()) {
      onEstablish?.(input);
    }
  };

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
      data-testid="terminal-container"
    >
      {/* Gradient overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to top, rgb(12, 14, 15) 0%, rgba(12, 14, 15, 0) 40%, rgb(12, 14, 15) 100%)',
          zIndex: 10,
        }}
      ></div>

      {/* Pulsing location marker */}
      <div className="absolute top-[38%] left-[24%] w-8 h-8" style={{ zIndex: 20 }}>
        <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
        <div className="absolute inset-2 bg-cyan-300 rounded-full shadow-[0_0_10px_rgba(0,255,255,1)]"></div>
      </div>

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.1) 0px, rgba(0, 0, 0, 0.1) 1px, transparent 1px, transparent 2px)',
          zIndex: 50,
        }}
      ></div>

      {/* Header - Fixed at top */}
      <header 
        className="flex justify-between items-center px-6 h-16 border-b flex-shrink-0"
        style={{
          borderColor: 'rgba(0, 255, 255, 0.2)',
          backgroundColor: 'rgba(12, 14, 15, 0.8)',
          backdropFilter: 'blur(20px)',
          zIndex: 40,
        }}
        data-testid="terminal-header"
      >
        <div 
          className="text-2xl font-black font-headline tracking-widest uppercase"
          style={{
            color: '#00ffff',
            textShadow: '0 0 8px rgba(0,255,255,0.5)',
          }}
          data-testid="mission-name"
        >
          MISSION: NEON_PHANTOM
        </div>
        <div className="flex gap-6 items-center">
          <div 
            className="font-headline tracking-widest text-xs"
            style={{ color: '#00ffff' }}
            data-testid="status-indicator"
          >
            STATUS: ACTIVE
          </div>
          <div className="flex gap-4">
            <span 
              className="material-symbols-outlined cursor-pointer transition-all text-xl"
              style={{ color: 'rgba(0, 230, 230, 0.6)' }}
            >
              settings_input_antenna
            </span>
            <span 
              className="material-symbols-outlined cursor-pointer transition-all text-xl"
              style={{ color: 'rgba(0, 230, 230, 0.6)' }}
            >
              security
            </span>
            <span 
              className="material-symbols-outlined cursor-pointer transition-all text-xl"
              style={{ color: '#fe9800' }}
            >
              emergency
            </span>
          </div>
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <main 
        className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto"
        style={{ zIndex: 20 }}
        data-testid="terminal-main"
      >
        <div className="mb-12 text-center">
          <h1 
            className="font-headline text-4xl md:text-6xl font-black tracking-[0.2em] mb-4"
            style={{
              color: '#00ffff',
              textShadow: '0 0 12px rgba(0,255,255,0.4)',
            }}
            data-testid="terminal-title"
          >
            CODENAME AUTHORIZATION TERMINAL
          </h1>
          <div 
            className="inline-flex items-center gap-3 px-4 py-1 border"
            style={{
              backgroundColor: 'rgba(29, 32, 33, 1)',
              borderColor: 'rgba(0, 255, 255, 0.1)',
            }}
            data-testid="init-indicator"
          >
            <span className="w-2 h-2 animate-pulse" style={{ backgroundColor: '#c1fffe' }}></span>
            <p 
              className="font-mono text-xs tracking-tighter uppercase"
              style={{ color: 'rgba(170, 171, 172, 1)' }}
            >
              Initializing secure uplink... Sector {sector} active
            </p>
          </div>
        </div>

        {/* Terminal Form */}
        <div 
          className="w-full max-w-xl p-10 relative overflow-hidden"
          style={{
            backgroundColor: 'rgba(24, 26, 27, 0.6)',
            borderColor: 'rgba(0, 255, 255, 0.1)',
            border: '1px solid rgba(0, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
          }}
          data-testid="terminal-form"
        >
          <div 
            className="absolute top-0 left-0 w-full h-[2px]"
            style={{
              backgroundImage: 'linear-gradient(to right, transparent, rgba(0, 230, 230, 0.5), transparent)',
            }}
          ></div>

          {/* Codename Input */}
          <div className="mb-8">
            <label 
              className="block font-headline text-xs tracking-[0.3em] mb-4 uppercase"
              style={{ color: 'rgba(0, 230, 230, 1)' }}
              data-testid="codename-label"
            >
              OPERATIVE CODENAME
            </label>
            <div className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  onInputChange?.(e.target.value);
                }}
                placeholder="ENTER CRYPTONYM..."
                style={{
                  color: '#00ffff',
                  borderBottomColor: 'rgba(0, 230, 230, 0.3)',
                  backgroundColor: 'rgba(23, 25, 27, 0.5)',
                  caretColor: '#00ffff',
                }}
                className="w-full border-b-2 focus:ring-0 font-mono text-2xl tracking-widest py-4 px-0 transition-all"
                onFocus={(e) => {
                  e.currentTarget.style.borderBottomColor = '#00ffff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderBottomColor = 'rgba(0, 230, 230, 0.3)';
                }}
                data-testid="codename-input"
              />
              <div 
                className="absolute bottom-0 left-0 h-[2px] w-0 transition-all duration-500 group-focus-within:w-full"
                style={{ backgroundColor: '#00ffff' }}
              ></div>
            </div>
          </div>

          {/* Protocol Info */}
          <div className="mb-10 space-y-4">
            <div 
              className="flex justify-between items-end pb-2"
              style={{ borderBottom: '1px solid rgba(70, 72, 73, 0.3)' }}
            >
              <span className="font-mono text-[10px]" style={{ color: 'rgba(170, 171, 172, 1)' }}>UPLINK_PROTOCOL</span>
              <span className="font-mono text-[10px]" style={{ color: '#00ffff' }}>AES-256_QUANTUM</span>
            </div>
            <div 
              className="flex justify-between items-end pb-2"
              style={{ borderBottom: '1px solid rgba(70, 72, 73, 0.3)' }}
            >
              <span className="font-mono text-[10px]" style={{ color: 'rgba(170, 171, 172, 1)' }}>SIGNAL_SOURCE</span>
              <span className="font-mono text-[10px]" style={{ color: '#fe9800' }}>DC_METRO_NODE_01</span>
            </div>
          </div>

          {/* Establish Connection Button */}
          <button
            onClick={submit}
            disabled={loading}
            className="w-full relative mb-8"
            data-testid="establish-button"
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <div
              className="relative py-6 px-10 flex items-center justify-center gap-4 transition-all"
              style={{ 
                clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
                border: '2px solid rgba(0, 255, 255, 0.3)',
                color: '#00ffff',
                backgroundColor: 'rgba(0, 230, 230, 0.1)',
              }}
            >
              <span className="font-headline font-bold text-xl tracking-[0.2em]">
                {loading ? 'CONNECTING...' : 'ESTABLISH CONNECTION'}
              </span>
              <span className="material-symbols-outlined">
                login
              </span>
            </div>
          </button>

          {/* Coordinates */}
          <div className="mt-8 flex justify-center gap-12" data-testid="coordinates-display">
            <div className="text-center">
              <div className="font-mono text-xs mb-1" style={{ color: 'rgba(170, 171, 172, 1)' }}>LATITUDE</div>
              <div className="font-mono text-sm" style={{ color: '#c1fffe' }} data-testid="latitude-value">{latitude}</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-xs mb-1" style={{ color: 'rgba(170, 171, 172, 1)' }}>LONGITUDE</div>
              <div className="font-mono text-sm" style={{ color: '#c1fffe' }} data-testid="longitude-value">{longitude}</div>
            </div>
          </div>
        </div>

        {/* Info Boxes */}
        <div className="mt-12 w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 pb-32" data-testid="info-boxes">
          {/* Threat Level Box */}
          <div 
            className="p-4 border-l-4"
            style={{
              backgroundColor: 'rgba(17, 20, 21, 0.8)',
              borderLeftColor: '#fe9800',
            }}
            data-testid="threat-box"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-sm" style={{ color: '#fe9800' }}>warning</span>
              <span className="font-headline text-[10px] tracking-widest uppercase" style={{ color: '#fe9800' }}>
                Threat Level: {threatLevel}
              </span>
            </div>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(170, 171, 172, 1)' }}>
              INTERCEPTED COMMS IN BERLIN_VOID INDICATE COMPROMISED NODE. EXERCISE EXTREME CAUTION DURING HANDSHAKE.
            </p>
          </div>

          {/* Terminal Output Box */}
          <div 
            className="p-4 border-l-4"
            style={{
              backgroundColor: 'rgba(17, 20, 21, 0.8)',
              borderLeftColor: 'rgba(0, 230, 230, 1)',
            }}
            data-testid="terminal-output-box"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-sm" style={{ color: 'rgba(0, 230, 230, 1)' }}>terminal</span>
              <span className="font-headline text-[10px] tracking-widest uppercase" style={{ color: 'rgba(0, 230, 230, 1)' }}>Terminal Output</span>
            </div>
            <p className="font-mono text-[10px] leading-relaxed animate-pulse" style={{ color: 'rgba(170, 171, 172, 1)' }} data-testid="terminal-log-content">
              {terminalLog.map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          </div>

          {/* Recent Access Box */}
          <div 
            className="p-4 border-l-4"
            style={{
              backgroundColor: 'rgba(17, 20, 21, 0.8)',
              borderLeftColor: 'rgba(116, 117, 119, 1)',
            }}
            data-testid="recent-access-box"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined text-sm" style={{ color: 'rgba(116, 117, 119, 1)' }}>history</span>
              <span className="font-headline text-[10px] tracking-widest uppercase" style={{ color: 'rgba(170, 171, 172, 1)' }}>Recent Access</span>
            </div>
            <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(170, 171, 172, 1)' }} data-testid="recent-access-content">
              {recentAccess.map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar - Fixed at bottom */}
      <div 
        className="flex justify-around items-center h-20 px-4 border-t flex-shrink-0"
        style={{
          backgroundColor: 'rgba(12, 14, 15, 0.9)',
          borderTopColor: 'rgba(0, 255, 255, 0.3)',
          backdropFilter: 'blur(12px)',
          zIndex: 40,
        }}
        data-testid="action-bar"
      >
        <div
          className="flex flex-col items-center justify-center p-3 transition-all duration-300 ease-out scale-110 cursor-pointer hover:scale-125"
          style={{ 
            clipPath: 'polygon(0% 0%,100% 0%,90% 100%,10% 100%)',
            backgroundColor: '#00ffff',
            color: '#0c0e0f',
          }}
          data-testid="deploy-button"
        >
          <span className="material-symbols-outlined">rocket_launch</span>
          <span className="font-headline font-bold text-[10px] tracking-tighter">DEPLOY ASSET</span>
        </div>
        <div 
          className="flex flex-col items-center justify-center p-3 transition-colors cursor-pointer"
          style={{ color: 'rgba(0, 230, 230, 0.5)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#fe9800';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(254, 152, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(0, 230, 230, 0.5)';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
          data-testid="scan-button"
        >
          <span className="material-symbols-outlined">radar</span>
          <span className="font-headline font-bold text-[10px] tracking-tighter uppercase">SCAN REGION</span>
        </div>
        <div 
          className="flex flex-col items-center justify-center p-3 transition-colors cursor-pointer"
          style={{ color: 'rgba(0, 230, 230, 0.5)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#fe9800';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(254, 152, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(0, 230, 230, 0.5)';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
          data-testid="encrypt-button"
        >
          <span className="material-symbols-outlined">enhanced_encryption</span>
          <span className="font-headline font-bold text-[10px] tracking-tighter uppercase">ENCRYPT</span>
        </div>
        <div 
          className="flex flex-col items-center justify-center p-3 transition-colors cursor-pointer"
          style={{ color: 'rgba(0, 230, 230, 0.5)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#fe9800';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(254, 152, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(0, 230, 230, 0.5)';
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
          data-testid="abort-button"
        >
          <span className="material-symbols-outlined">cancel</span>
          <span className="font-headline font-bold text-[10px] tracking-tighter uppercase">ABORT</span>
        </div>
      </div>
    </div>
  );
};

export default CodenameAuthorizationTerminal;
