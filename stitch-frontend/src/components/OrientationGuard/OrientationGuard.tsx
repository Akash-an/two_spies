import React, { useState, useEffect } from 'react';
import './OrientationGuard.css';

const OrientationGuard: React.FC = () => {
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
      if (!portrait) {
        setIsDismissed(false); // Reset if they actually rotate
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleForceLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      
      // Attempt to lock orientation (supported on Chrome/Android)
      const orientation = screen.orientation as any;
      if (orientation && orientation.lock) {
        await orientation.lock('landscape').catch(() => {});
      }
      
      // Dismiss the overlay regardless of whether the lock succeeded
      // This ensures the button actually "works" from the user's perspective
      setIsDismissed(true);
    } catch (err) {
      console.error('Rotation Error:', err);
      setIsDismissed(true);
    }
  };

  if (!isPortrait || isDismissed) return null;

  return (
    <div className="orientation-guard-overlay">
      <div className="orientation-content">
        <div className="tactical-warning-icon">
          <span className="material-symbols-outlined">screen_rotation</span>
        </div>
        <h1 className="tactical-header">ROTATE YOUR DEVICE</h1>
        <p className="tactical-subtext">
          This game is designed for landscape mode.
        </p>
        
        <button className="tactical-rotate-btn" onClick={handleForceLandscape}>
          SWITCH TO LANDSCAPE
        </button>

        <button className="tactical-dismiss-link" onClick={() => setIsDismissed(true)}>
          CONTINUE IN PORTRAIT
        </button>

        <div className="terminal-decor top-left"></div>
        <div className="terminal-decor top-right"></div>
        <div className="terminal-decor bottom-left"></div>
        <div className="terminal-decor bottom-right"></div>
      </div>
    </div>
  );
};

export default OrientationGuard;
