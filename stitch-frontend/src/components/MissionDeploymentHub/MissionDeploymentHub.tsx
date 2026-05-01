import React, { useState, useEffect } from 'react';

export interface MissionDeploymentHubProps {
  operativeName?: string;
  sector?: string;
  networkStatus?: string;
  intelUpdate?: string;
  threatLevel?: string;
  environment?: string;
  onInitiateOperation?: () => void;
  onLinkToNetwork?: (frequency: string) => void;
  onTerminateLink?: () => void;
  latitude?: string;
  longitude?: string;
  logs?: string[];
  matchCode?: string | null;
  className?: string;
  loading?: boolean;
  onOpenHowToPlay?: () => void;
  setActionTooltip?: (val: string | null) => void;
}

const MissionDeploymentHub: React.FC<MissionDeploymentHubProps> = ({
  operativeName = 'OPERATIVE_01',
  sector = 'BERLIN_VOID',
  networkStatus = 'Secure',
  intelUpdate = 'Intercepting encrypted traffic from Sector 7...',
  threatLevel = 'Local authorities increasing patrol frequency.',
  environment = 'Heavy rain. Visual range reduced to 500m.',
  onInitiateOperation,
  onLinkToNetwork,
  onTerminateLink,
  latitude = '52.5200° N',
  longitude = '13.4050° E',
  matchCode = null,
  // logs = [],
  className = '',
  loading = false,
  onOpenHowToPlay,
  setActionTooltip,
}) => {
  const [showGeneratedFrequencyModal, setShowGeneratedFrequencyModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkedFrequency, setLinkedFrequency] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Show modal when matchCode is received from backend
  useEffect(() => {
    console.log('[MissionDeploymentHub] useEffect triggered');
    console.log('[MissionDeploymentHub] matchCode prop:', matchCode, '(type:', typeof matchCode, ')');
    if (matchCode) {
      console.log('[MissionDeploymentHub] ✓ Match code received:', matchCode);
      console.log('[MissionDeploymentHub] Setting showGeneratedFrequencyModal to true');
      setShowGeneratedFrequencyModal(true);
    } else {
      console.log('[MissionDeploymentHub] ✗ No matchCode, not showing modal');
      setShowGeneratedFrequencyModal(false);
    }
  }, [matchCode]);

  const handleInitiateOperation = () => {
    onInitiateOperation?.();
  };

  const handleLinkSubmit = () => {
    if (linkedFrequency.trim()) {
      onLinkToNetwork?.(linkedFrequency);
      setShowLinkModal(false);
      setLinkedFrequency('');
    }
  };

  const handleCloseFrequencyModal = () => {
    console.log('[MissionDeploymentHub] Closing frequency modal and terminating link');
    onTerminateLink?.();
    setShowGeneratedFrequencyModal(false);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        const orientation = screen.orientation as any;
        if (orientation && orientation.lock) {
          await orientation.lock('landscape').catch(() => {});
        }
      } else {
        const orientation = screen.orientation as any;
        if (orientation && orientation.unlock) {
          orientation.unlock();
        }
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };
  return (
    <div className={`bg-surface text-on-surface min-h-screen flex flex-col ${className}`}>
      {/* Scanline overlay */}
      <div className="fixed inset-0 pointer-events-none z-[1000]" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 255, 255, 0.03) 0px, rgba(0, 255, 255, 0.03) 1px, transparent 1px, transparent 2px)',
        pointerEvents: 'none',
      }} />

      {/* Top AppBar */}
      <header className="fixed top-0 w-full z-50 border-b border-[#00ffff]/20 bg-[#0c0e0f]/80 backdrop-blur-xl flex justify-between items-center px-4 md:px-6 h-16">
        <div className="flex items-center gap-3 md:gap-4">
          <button
            className="md:hidden text-[#00ffff] p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
          <span className="text-xl md:text-2xl font-black text-[#00ffff] drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] font-['Space_Grotesk'] tracking-widest uppercase hidden sm:block">MISSION: NEON_PHANTOM</span>
          <div className="h-4 w-[1px] bg-outline-variant mx-1 md:mx-2 hidden sm:block" />
          <h1 className="text-on-surface font-['Space_Grotesk'] font-bold tracking-widest uppercase text-sm md:text-lg">DEPLOYMENT HUB</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="bg-primary-container/10 px-4 py-1 border border-primary/30">
            <span className="text-[#00ffff] font-['Space_Grotesk'] font-bold text-xs tracking-tighter">STATUS: ACTIVE</span>
          </div>
          <button
            className="help-btn-header"
            onClick={toggleFullscreen}
            title="Toggle Tactical View"
          >
            <span className="material-symbols-outlined">
              {document.fullscreenElement ? 'screen_rotation' : 'fullscreen'}
            </span>
          </button>
          <button
            className="help-btn-header"
            onClick={onOpenHowToPlay}
            onMouseEnter={() => setActionTooltip?.('HOW TO PLAY: Open field manual and mission objectives.')}
            onMouseLeave={() => setActionTooltip?.(null)}
            title="How to Play"
          >
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed left-0 top-16 h-[calc(100vh-64px)] ${mobileMenuOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full'} md:w-60 lg:w-72 md:translate-x-0 border-r border-[#00ffff]/10 bg-surface-container-low flex flex-col p-6 md:p-6 space-y-8 z-40 overflow-y-auto transition-all duration-300`}>
        <div className="space-y-1">
          <p className="text-primary/40 text-[10px] font-['Space_Grotesk'] tracking-[0.2em] uppercase">Current Agent</p>
          <h2 className="text-primary font-['Space_Grotesk'] font-bold tracking-tighter text-xl">{operativeName.replace(/^(OPERATIVE|AGENT)_/i, '')}</h2>
          <p className="text-on-surface-variant font-['Inter'] text-xs">SECTOR: {sector}</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between group cursor-pointer hover:bg-primary/5 p-2 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-primary/60">🌐</span>
                <span className="text-on-surface text-sm font-['Inter'] tracking-tight uppercase">Network</span>
              </div>
              <span className="text-primary-dim font-bold text-xs uppercase">{networkStatus}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onTerminateLink}
          className="mt-auto w-full py-4 border border-error/30 text-error hover:bg-error/10 transition-all font-['Space_Grotesk'] font-bold text-xs tracking-[0.2em] uppercase"
        >
          TERMINATE LINK
        </button>
      </aside>

      {/* Main Canvas */}
      <main className="ml-0 md:ml-60 lg:ml-72 pt-16 pb-20 h-screen overflow-y-auto relative flex flex-col transition-all duration-300">
        {/* Strategic Background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-t from-surface via-transparent to-surface" />
        </div>

        <div className="relative z-10 min-h-full p-4 md:p-12 flex flex-col">
          {/* Hero Modules Container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto w-full my-auto">
            {/* INITIATE OPERATION */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-primary/20 blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
              <button
                onClick={handleInitiateOperation}
                disabled={loading}
                className="relative w-full aspect-video bg-surface-container-high/40 backdrop-blur-xl border border-primary/20 hover:border-primary/60 transition-all group active:scale-95 p-8 flex flex-col items-center justify-center gap-6 disabled:opacity-50 rounded-lg"
              >
                <div className="w-24 h-24 rounded-full border border-primary/30 flex items-center justify-center relative">
                  <span className="text-primary text-5xl group-hover:scale-110 transition-transform">🛰️</span>
                  <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-['Space_Grotesk'] font-black text-primary tracking-widest mb-2 uppercase">
                    INITIATE OPERATION
                  </h3>
                  <p className="text-on-surface-variant font-['Inter'] text-xs tracking-wider uppercase">
                    Generate secure frequency
                  </p>
                </div>
                <div className="absolute bottom-4 right-8 flex gap-1">
                  <div className="h-1 w-8 bg-primary" />
                  <div className="h-1 w-2 bg-primary/30" />
                  <div className="h-1 w-2 bg-primary/30" />
                </div>
              </button>
            </div>

            {/* LINK TO NETWORK */}
            <div className="group relative">
              <div className="absolute -inset-1 bg-secondary/20 blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200" />
              <button
                onClick={() => setShowLinkModal(true)}
                disabled={loading}
                className="relative w-full aspect-video bg-surface-container-high/40 backdrop-blur-xl border border-secondary/20 hover:border-secondary/60 transition-all group active:scale-95 p-8 flex flex-col items-center justify-center gap-6 disabled:opacity-50 rounded-lg"
              >
                <div className="w-24 h-24 border border-secondary/30 flex items-center justify-center relative">
                  <span className="text-secondary text-5xl group-hover:scale-110 transition-transform">📡</span>
                  <div className="absolute inset-[-10px] border border-secondary/10" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-['Space_Grotesk'] font-black text-secondary tracking-widest mb-2 uppercase">LINK TO NETWORK</h3>
                  <p className="text-on-surface-variant font-['Inter'] text-xs tracking-wider uppercase">Enter frequency</p>
                </div>
                <div className="absolute bottom-4 left-8 flex gap-1">
                  <div className="h-1 w-2 bg-secondary/30" />
                  <div className="h-1 w-2 bg-secondary/30" />
                  <div className="h-1 w-8 bg-secondary" />
                </div>
              </button>
            </div>
          </div>

          {/* Contextual Data Feed */}
          <div className="mt-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-surface-container/60 border border-outline-variant/20 p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-primary/60 font-bold uppercase tracking-widest">Active Intel</span>
                <span>⚡</span>
              </div>
              <p className="text-on-surface text-xs font-['JetBrains_Mono']">{intelUpdate}</p>
            </div>
            <div className="bg-surface-container/60 border border-outline-variant/20 p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-secondary/60 font-bold uppercase tracking-widest">Threat Level</span>
                <span>⚠️</span>
              </div>
              <p className="text-on-surface text-xs font-['JetBrains_Mono']">{threatLevel}</p>
            </div>
            <div className="bg-surface-container/60 border border-outline-variant/20 p-4">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Environment</span>
                <span>☁️</span>
              </div>
              <p className="text-on-surface text-xs font-['JetBrains_Mono']">{environment}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 w-full z-50 border-t border-[#00ffff]/30 bg-[#0c0e0f]/90 backdrop-blur-md h-auto min-h-20 py-4 px-6 md:px-12 flex flex-col md:row justify-between items-center ml-0 md:ml-60 lg:ml-72 transition-all duration-300">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.3em]">Status Monitor</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(0,255,255,1)]" />
              <span className="text-primary font-['Space_Grotesk'] font-black text-sm tracking-widest uppercase">AGENT: {operativeName.replace(/^(OPERATIVE|AGENT)_/i, '')} - STATUS: READY</span>
            </div>
          </div>
          <div className="h-10 w-[1px] bg-outline-variant/30" />
          <div className="flex gap-4">
            <div className="flex flex-col items-center opacity-50">
              <span className="text-primary text-xl">📡</span>
              <span className="text-[8px] font-bold text-primary uppercase">SCANNING</span>
            </div>
            <div className="flex flex-col items-center opacity-50">
              <span className="text-primary text-xl">🔐</span>
              <span className="text-[8px] font-bold text-primary uppercase">ENCRYPTED</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-primary/40">
          <span className="text-[10px] font-['JetBrains_Mono']">LAT: {latitude}</span>
          <span className="text-[10px] font-['JetBrains_Mono']">LNG: {longitude}</span>
        </div>
      </footer>

      {/* Link to Network Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowLinkModal(false)}
          />
          {/* Radar Background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute w-96 h-96 rounded-full border border-tertiary/20" />
            <div className="absolute w-80 h-80 rounded-full border border-tertiary/15" />
            <div className="absolute w-64 h-64 rounded-full border border-tertiary/10" />
            {/* Radar Sweep Animation */}
            <div
              className="absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]"
              style={{
                background: 'conic-gradient(from 0deg at 50% 50%, rgba(226, 255, 254, 0.1) 0deg, transparent 90deg)',
              }}
            />
          </div>
          {/* Modal */}
          <div className="relative z-10 bg-surface-container-high border-2 border-tertiary p-8 w-96 shadow-2xl rounded-lg"
          >
            <h2 className="text-2xl font-['Space_Grotesk'] font-black text-tertiary tracking-widest mb-6 uppercase">
              ENTER FREQUENCY
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Frequency (4 digits)"
                value={linkedFrequency}
                onChange={(e) => setLinkedFrequency(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full px-4 py-3 bg-surface border border-tertiary/50 text-tertiary placeholder-tertiary/40 font-['JetBrains_Mono'] text-lg tracking-widest focus:outline-none focus:border-tertiary rounded"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleLinkSubmit}
                  disabled={linkedFrequency.length !== 4 || loading}
                  className="flex-1 py-3 bg-tertiary text-surface font-['Space_Grotesk'] font-bold text-xs tracking-[0.2em] uppercase hover:bg-tertiary/90 disabled:opacity-50 transition-colors rounded"
                >
                  ESTABLISH LINK
                </button>
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkedFrequency('');
                  }}
                  className="flex-1 py-3 border border-tertiary/50 text-tertiary font-['Space_Grotesk'] font-bold text-xs tracking-[0.2em] uppercase hover:bg-tertiary/10 transition-colors rounded"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated Frequency Modal */}
      {showGeneratedFrequencyModal && matchCode && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCloseFrequencyModal}
          />
          {/* Modal with Radar */}
          <div className="relative z-10 w-96 h-96 flex items-center justify-center">
            {/* Radar Background Circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute w-96 h-96 rounded-full border border-primary/30" />
              <div className="absolute w-80 h-80 rounded-full border border-primary/20" />
              <div className="absolute w-64 h-64 rounded-full border border-primary/10" />
              {/* Radar Sweep Animation */}
              <div
                className="absolute inset-0 rounded-full animate-[spin_4s_linear_infinite]"
                style={{
                  background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 255, 255, 0.15) 0deg, transparent 90deg)',
                }}
              />
            </div>

            {/* Frequency Display Card */}
            <div className="relative z-10 bg-surface/90 backdrop-blur-xl border-2 border-primary p-12 w-80 flex flex-col items-center justify-center shadow-2xl rounded-lg"
            >
              <div className="text-center">
                <h3 className="text-xs font-['Space_Grotesk'] font-bold text-primary/60 tracking-[0.3em] uppercase mb-6">
                  SECURE FREQUENCY
                </h3>
                <div className="my-4 h-[2px] w-16 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
                <div className="text-8xl font-['Space_Grotesk'] font-black text-primary tracking-tighter drop-shadow-[0_0_15px_rgba(0,255,255,0.8)] mb-4">
                  {matchCode}
                </div>
                <div className="my-4 h-[2px] w-16 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
                <p className="text-[10px] font-['JetBrains_Mono'] text-primary/50 uppercase tracking-widest">
                  [ GHZ_FREQUENCY_LOCKED ]
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={handleCloseFrequencyModal}
                className="mt-8 px-8 py-2 border border-primary text-primary font-['Space_Grotesk'] font-bold text-xs tracking-[0.2em] uppercase hover:bg-primary/10 transition-colors rounded"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionDeploymentHub;
