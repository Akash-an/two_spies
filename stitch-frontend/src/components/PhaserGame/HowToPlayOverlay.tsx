import React, { useState } from 'react';

interface HowToPlayOverlayProps {
  onClose: () => void;
}

const HowToPlayOverlay: React.FC<HowToPlayOverlayProps> = ({ onClose }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="howto-overlay">
      <div className="howto-card">
        <button className="howto-close" onClick={onClose}>✕</button>
        <h2 className="howto-title">How to Play</h2>
        {!showDetails && (
          <div className="howto-brief">
            <p>Two Spies is a turn‑based, 2‑player strategy game. Each player controls an agent moving between cities, gathering intel, and attempting a strike on the opponent’s location.</p>
            <ul className="howto-list">
              <li>Each turn you have <strong>2 actions</strong> (Move, Ability, or Strike).</li>
              <li>Use <strong>Move</strong> to travel to an adjacent city.</li>
              <li>Gather <strong>Intel</strong> (4/turn, +4 per controlled city, +4 for new cities, +10 from markers) to unlock abilities like <em>Locate</em>, <em>Deep Cover</em>, <em>Encryption</em>, <em>Rapid Recon</em>, or <em>Prep Mission</em>.</li>
              <li>A successful <strong>Strike</strong> ends the match instantly.</li>
              <li>Failed strikes reveal your location ONLY if the opponent has <em>Strike Report</em>.</li>
            </ul>
            <button className="howto-details-btn" onClick={() => setShowDetails(true)}>
              Show Detailed Mechanics
            </button>
          </div>
        )}
        {showDetails && (
          <div className="howto-details">
            <h3>Game Flow</h3>
            <ol className="howto-steps">
              <li>Match starts with each player placed in a hidden starting city.</li>
              <li>On your turn you receive <strong>2 actions</strong>. You may move, use an ability, or strike.</li>
              <li>Moving is only allowed to adjacent cities (see the highlighted edges).</li>
              <li><strong>Gathering Intel:</strong> You gain <strong>4 Intel</strong> at the end of every turn. Moving to a city you haven't visited yet grants an <strong>Exploration Bonus (+4 Intel)</strong>.</li>
              <li><strong>Intel Markers:</strong> These spawn randomly (+10 Intel). End your turn in a marked city to collect it at the start of your next turn. <strong>Warning: Claiming a marker reveals your location to the opponent!</strong></li>
              <li><strong>Action Pickups:</strong> ⚡ pickups spawn on the map. End your turn on one to gain <strong>+1 extra action</strong> next turn. <strong>Warning: Also reveals your location!</strong></li>
              <li><strong>Locate</strong> (cost 10 Intel) reveals the opponent’s city for one turn.</li>
              <li><strong>Deep Cover</strong> (cost 20 Intel) protects you from being located. Must be your last action.</li>
              <li><strong>Strike Report</strong> (cost 10 Intel) permanently reveals the opponent’s location if they attempt a strike.</li>
              <li><strong>Encryption</strong> (cost 25 Intel) permanently hides what intel actions you take from your opponent.</li>
              <li><strong>Rapid Recon</strong> (cost 40 Intel) permanently lets you blow your opponent’s cover by entering their city.</li>
              <li><strong>Prep Mission</strong> (cost 40 Intel) gives you an extra action on your next turn. Must be your last action.</li>
              <li>When you feel confident, use <strong>Strike</strong> on your current city. If the opponent is there you win.</li>
              <li>If the strike fails, your location is revealed ONLY if the opponent has <em>Strike Report</em> active.</li>
              <li>The game ends when a strike succeeds or all cities disappear.</li>
            </ol>
            <button className="howto-close-btn" onClick={onClose}>Got it!</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HowToPlayOverlay;
