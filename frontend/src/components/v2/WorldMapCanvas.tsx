import React from 'react';

/**
 * WorldMapCanvas - Simplified world map canvas for the Codename Authorization Terminal background.
 * Features simplified continent shapes with a vintage board-game aesthetic.
 */
const WorldMapCanvas: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ 
  className = '', 
  style = {} 
}) => {
  return (
    <svg
      viewBox="0 0 1280 720"
      className={className}
      style={{ ...style, width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Ocean background */}
      <rect width="1280" height="720" fill="#6db5ae" />

      {/* North America */}
      <path
        d="M 150 100 L 180 90 L 200 110 L 210 140 L 200 180 L 170 200 L 140 180 L 130 140 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* Central America & Caribbean */}
      <ellipse cx="210" cy="220" rx="20" ry="30" fill="#f5f0d8" stroke="#6db5ae" strokeWidth="2" />

      {/* South America */}
      <path
        d="M 220 240 L 240 250 L 245 320 L 230 380 L 200 370 L 190 300 L 210 260 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* Europe */}
      <path
        d="M 480 120 L 520 115 L 530 145 L 510 160 L 480 155 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* Africa */}
      <path
        d="M 520 160 L 580 140 L 600 180 L 600 320 L 570 360 L 520 340 L 510 240 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* Middle East */}
      <path
        d="M 580 140 L 620 145 L 630 200 L 600 210 L 600 180 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* Russia / Asia (simplified) */}
      <path
        d="M 620 90 L 920 100 L 930 160 L 870 180 L 800 170 L 700 165 L 630 150 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* India */}
      <path
        d="M 660 200 L 680 210 L 685 260 L 665 270 L 655 240 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* Southeast Asia / Indonesia */}
      <path
        d="M 700 240 L 780 250 L 790 290 L 750 310 L 700 290 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* Australia */}
      <path
        d="M 800 350 L 850 345 L 865 410 L 820 420 L 790 390 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* East Asia / China Japan */}
      <path
        d="M 800 140 L 880 130 L 920 160 L 900 210 L 840 220 L 800 170 Z"
        fill="#f5f0d8"
        stroke="#6db5ae"
        strokeWidth="2"
      />

      {/* Decorative title area overlay */}
      <rect
        x="400"
        y="280"
        width="480"
        height="160"
        fill="rgba(245, 240, 216, 0.85)"
        rx="8"
        stroke="#c8a96e"
        strokeWidth="2"
      />
      
      {/* Placeholder for content - will be overlaid by React component */}
      <text
        x="640"
        y="360"
        textAnchor="middle"
        fontSize="24"
        fontFamily="Georgia, serif"
        fill="#2a1a0a"
        opacity="0.3"
      >
        MISSION OVERLAY
      </text>
    </svg>
  );
};

export default WorldMapCanvas;
