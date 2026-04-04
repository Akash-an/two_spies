import React, { useState, useEffect } from 'react';
import './SurveillanceCommandCenterGlobal.css';

export interface CityNode {
  id: string;
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  isActive?: boolean;
  isAlly?: boolean;
}

export interface SurveillanceCommandCenterGlobalProps {
  operativeName?: string;
  sector?: string;
  location?: string;
  coverLevel?: number;
  turnCycle?: string;
  operativeStatus?: string;
  cities?: CityNode[];
  selectedCityId?: string;
  onSelectCity?: (cityId: string) => void;
  onInfiltrate?: () => void;
  onTerminateLink?: () => void;
  logs?: string[];
  className?: string;
  loading?: boolean;
  latitude?: string;
  longitude?: string;
}

const SurveillanceCommandCenterGlobal: React.FC<SurveillanceCommandCenterGlobalProps> = ({
  operativeName = 'OPERATIVE_01',
  sector = 'BERLIN_VOID',
  location = 'Berlin',
  coverLevel = 92,
  turnCycle = '05/12',
  operativeStatus = 'Standby',
  cities = [
    { id: 'nyc', name: 'NEW YORK CITY', x: 25, y: 35 },
    { id: 'berlin', name: 'BERLIN_VOID', x: 48, y: 30, isActive: true, isAlly: true },
    { id: 'london', name: 'LONDON', x: 44, y: 28 },
    { id: 'tokyo', name: 'TOKYO', x: 85, y: 38 },
    { id: 'moscow', name: 'MOSCOW', x: 58, y: 25 },
    { id: 'cairo', name: 'CAIRO', x: 52, y: 45 },
    { id: 'buenos-aires', name: 'BUENOS AIRES', x: 30, y: 80 },
  ],
  selectedCityId,
  onSelectCity,
  onInfiltrate,
  onTerminateLink,
  logs = [],
  className = '',
  loading = false,
  latitude = '52.5200° N',
  longitude = '13.4050° E',
}) => {
  const [selected, setSelected] = useState<string | undefined>(selectedCityId);

  useEffect(() => {
    setSelected(selectedCityId);
  }, [selectedCityId]);

  const handleSelectCity = (cityId: string) => {
    setSelected(cityId);
    onSelectCity?.(cityId);
  };

  return (
    <div className={`surv-command-center bg-surface text-on-surface min-h-screen flex flex-col ${className}`}>
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1000]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 255, 255, 0.03) 0px, rgba(0, 255, 255, 0.03) 1px, transparent 1px, transparent 2px)',
        pointerEvents: 'none',
      }} />

      {/* Top AppBar */}
      <header className="fixed top-0 w-full z-50 border-b border-[#00ffff]/20 bg-[#0c0e0f]/80 backdrop-blur-xl flex justify-between items-center px-6 h-16">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black text-[#00ffff] drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] font-['Space_Grotesk'] tracking-widest uppercase">MISSION: NEON_PHANTOM</span>
          <div className="h-4 w-[1px] bg-outline-variant mx-2" />
          <h1 className="text-on-surface font-['Space_Grotesk'] font-bold tracking-widest uppercase text-lg">SURVEILLANCE COMMAND</h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-6 font-['Space_Grotesk'] tracking-widest uppercase text-sm">
            <a className="text-[#00ffff] border-b-2 border-[#00ffff] pb-1 transition-all cursor-pointer">Strategic Map</a>
            <a className="text-[#c1fffe]/60 hover:bg-[#00ffff]/10 hover:text-[#00ffff] transition-all cursor-pointer">Asset Tracker</a>
            <a className="text-[#c1fffe]/60 hover:bg-[#00ffff]/10 hover:text-[#00ffff] transition-all cursor-pointer">Archive</a>
          </nav>
          <div className="bg-primary-container/10 px-4 py-1 border border-primary/30">
            <span className="text-[#00ffff] font-['Space_Grotesk'] font-bold text-xs tracking-tighter">STATUS: ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Layout: Sidebar + Canvas */}
      <div className="flex flex-1 mt-16">
        {/* Left Sidebar */}
        <aside className="w-72 border-r border-[#00ffff]/10 bg-surface-container-low flex flex-col p-6 space-y-8 overflow-y-auto">
          {/* Operative Info */}
          <div className="space-y-1">
            <p className="text-primary/40 text-[10px] font-['Space_Grotesk'] tracking-[0.2em] uppercase">Current Operative</p>
            <h2 className="text-primary font-['Space_Grotesk'] font-bold tracking-tighter text-xl">{operativeName}</h2>
            <p className="text-on-surface-variant font-['Inter'] text-xs">SECTOR: {sector}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-grow flex flex-col font-['Space_Grotesk'] text-sm uppercase">
            <div className="bg-[#00ffff]/10 text-[#00ffff] border-l-4 border-[#00ffff] py-4 px-6 flex items-center gap-4 cursor-pointer active:translate-x-1">
              <span className="text-lg">🗺️</span>
              <span>Strategic Map</span>
            </div>
            <div className="text-[#c1fffe]/40 py-4 px-6 flex items-center gap-4 hover:bg-[#00ffff]/5 hover:text-[#c1fffe] cursor-pointer transition-colors">
              <span className="text-lg">📡</span>
              <span>Asset Tracker</span>
            </div>
            <div className="text-[#c1fffe]/40 py-4 px-6 flex items-center gap-4 hover:bg-[#00ffff]/5 hover:text-[#c1fffe] cursor-pointer transition-colors">
              <span className="text-lg">🔓</span>
              <span>Signal Decryption</span>
            </div>
            <div className="text-[#c1fffe]/40 py-4 px-6 flex items-center gap-4 hover:bg-[#00ffff]/5 hover:text-[#c1fffe] cursor-pointer transition-colors">
              <span className="text-lg">⚠️</span>
              <span>Threat Analysis</span>
            </div>
            <div className="text-[#c1fffe]/40 py-4 px-6 flex items-center gap-4 hover:bg-[#00ffff]/5 hover:text-[#c1fffe] cursor-pointer transition-colors">
              <span className="text-lg">📜</span>
              <span>Archive</span>
            </div>
          </nav>

          {/* Terminate Button */}
          <button
            onClick={onTerminateLink}
            className="w-full py-3 border border-error/50 text-error font-['Space_Grotesk'] text-xs tracking-widest hover:bg-error/10 transition-all active:scale-95"
          >
            TERMINATE LINK
          </button>
        </aside>

        {/* Main Canvas */}
        <main className="flex-1 relative overflow-hidden bg-surface-container-lowest">
          {/* World Map Background */}
          <div className="absolute inset-0 opacity-30 mix-blend-screen">
            <svg viewBox="0 0 1200 600" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
              {/* Grid background */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="1" fill="#00ffff" opacity="0.3" />
                </pattern>
              </defs>
              <rect width="1200" height="600" fill="url(#grid)" />

              {/* Connection lines */}
              <line x1="25%" y1="35%" x2="44%" y2="28%" stroke="#00ffff" strokeDasharray="4" strokeWidth="1" opacity="0.4" />
              <line x1="44%" y1="28%" x2="48%" y2="30%" stroke="#fe9800" strokeWidth="2" opacity="0.6" />
              <line x1="48%" y1="30%" x2="58%" y2="25%" stroke="#00ffff" strokeDasharray="4" strokeWidth="1" opacity="0.4" />
              <line x1="48%" y1="30%" x2="52%" y2="45%" stroke="#00ffff" strokeDasharray="4" strokeWidth="1" opacity="0.4" />
              <line x1="85%" y1="38%" x2="58%" y2="25%" stroke="#00ffff" strokeDasharray="2" strokeWidth="0.5" opacity="0.2" />
            </svg>
          </div>

          {/* Grid overlay */}
          <div className="absolute inset-0 scanlines z-10 opacity-20"></div>

          {/* City Nodes */}
          <div className="absolute inset-0 z-20">
            {cities.map((city) => (
              <div
                key={city.id}
                className="absolute flex flex-col items-center cursor-pointer group"
                style={{ left: `${city.x}%`, top: `${city.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {/* Node Circle */}
                <div
                  className={`transition-all duration-200 ${
                    city.isActive
                      ? 'w-4 h-4 bg-secondary rounded-full shadow-[0_0_15px_#fe9800] border-2 border-white animate-pulse'
                      : selected === city.id
                        ? 'w-3.5 h-3.5 bg-primary rounded-full shadow-[0_0_12px_#00ffff]'
                        : 'w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_#00ffff]'
                  }`}
                  onClick={() => handleSelectCity(city.id)}
                />

                {/* City Label */}
                <span
                  className={`text-[9px] font-['Space_Grotesk'] mt-1 bg-[#0c0e0f]/80 px-1 py-0.5 whitespace-nowrap transition-all ${
                    city.isActive
                      ? 'text-secondary font-bold border border-secondary/30'
                      : selected === city.id
                        ? 'text-primary border border-primary/30'
                        : 'text-primary/60'
                  }`}
                >
                  {city.name}
                </span>
              </div>
            ))}
          </div>

          {/* Left Status Panels */}
          <div className="absolute top-8 left-8 z-30 w-56 flex flex-col gap-4">
            {/* Operational Status */}
            <div className="bg-surface-container/60 backdrop-blur-md p-4 border-l-2 border-secondary shadow-lg">
              <div className="text-[10px] font-['Space_Grotesk'] text-secondary tracking-[0.2em] mb-1">OPERATIONAL STATUS</div>
              <div className="flex justify-between items-end">
                <span className="text-2xl font-black font-['Space_Grotesk'] tracking-tighter">{coverLevel}%</span>
                <span className="text-[10px] text-on-surface-variant font-['Space_Grotesk'] mb-1">COVER: HIGH</span>
              </div>
              <div className="w-full h-1 bg-surface-variant mt-2">
                <div className="bg-secondary h-full" style={{ width: `${coverLevel}%` }}></div>
              </div>
            </div>

            {/* Localization */}
            <div className="bg-surface-container/60 backdrop-blur-md p-4 border-l-2 border-[#00ffff] shadow-lg">
              <div className="text-[10px] font-['Space_Grotesk'] text-[#00ffff] tracking-[0.2em] mb-1">LOCALIZATION</div>
              <div className="text-lg font-bold font-['Space_Grotesk'] mb-1">{location}</div>
              <div className="text-[10px] font-['Courier_New'] text-[#00ffff]/60">{latitude}, {longitude}</div>
            </div>

            {/* Network Uplink */}
            <div className="bg-surface-container/60 backdrop-blur-md p-4 border-l-2 border-green-500 shadow-lg">
              <div className="text-[10px] font-['Space_Grotesk'] text-green-500 tracking-[0.2em] mb-1">NETWORK UPLINK</div>
              <div className="text-lg font-bold font-['Space_Grotesk'] mb-1">SECURE</div>
              <div className="text-[10px] text-on-surface-variant font-['Space_Grotesk']">TURN: {turnCycle}</div>
            </div>
          </div>

          {/* Right Intel Panel */}
          <div className="absolute bottom-32 right-8 z-30 w-80 bg-[#0c0e0f]/90 border border-[#00ffff]/20 backdrop-blur-xl">
            <div className="bg-surface-container-high px-3 py-2 flex justify-between items-center border-b border-[#00ffff]/10">
              <span className="text-[10px] font-['Space_Grotesk'] font-bold text-[#00ffff] tracking-widest uppercase">RECENT INTEL</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-error/40"></div>
                <div className="w-2 h-2 rounded-full bg-[#00ffff]/40"></div>
              </div>
            </div>
            <div className="p-3 font-['Courier_New'] text-[10px] text-[#c1fffe]/80 leading-relaxed max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="opacity-40">&gt; AWAITING INPUT_</div>
              ) : (
                logs.slice(-10).map((log, i) => (
                  <div key={i} className="mb-2">
                    <span className="text-secondary">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-[#0c0e0f]/90 backdrop-blur-md border-t border-[#00ffff]/30 flex justify-around items-center px-4 z-50">
        <button className="group flex flex-col items-center justify-center text-[#c1fffe]/50 hover:text-secondary transition-all active:scale-95">
          <span className="text-2xl">🔐</span>
          <span className="text-[10px] font-bold font-['Space_Grotesk'] tracking-tighter uppercase mt-1">DECRYPT</span>
        </button>
        <button
          onClick={onInfiltrate}
          disabled={loading}
          className="clipped-corner flex flex-col items-center justify-center bg-secondary text-on-secondary px-12 py-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          <span className="text-2xl">🚀</span>
          <span className="text-[12px] font-bold font-['Space_Grotesk'] tracking-widest uppercase mt-1">
            {loading ? 'INFILTRATING...' : 'INFILTRATE'}
          </span>
        </button>
        <button className="group flex flex-col items-center justify-center text-[#c1fffe]/50 hover:text-error transition-all active:scale-95">
          <span className="text-2xl">🚪</span>
          <span className="text-[10px] font-bold font-['Space_Grotesk'] tracking-tighter uppercase mt-1">EXFILTRATE</span>
        </button>
        <button
          onClick={onTerminateLink}
          className="group flex flex-col items-center justify-center text-[#c1fffe]/50 hover:text-[#00ffff] transition-all active:scale-95"
        >
          <span className="text-2xl">✕</span>
          <span className="text-[10px] font-bold font-['Space_Grotesk'] tracking-tighter uppercase mt-1">ABORT</span>
        </button>
      </div>

      {/* Vignette Overlay */}
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-[60]"></div>
    </div>
  );
};

export default SurveillanceCommandCenterGlobal;
