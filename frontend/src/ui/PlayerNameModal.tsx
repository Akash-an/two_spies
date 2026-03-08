import React, { useState } from 'react';

interface PlayerNameModalProps {
  onSubmit: (name: string) => void;
}

/**
 * PlayerNameModal — prompts user for a player name at game start.
 * Generates a random name if left empty.
 */
export function PlayerNameModal({ onSubmit }: PlayerNameModalProps) {
  const [input, setInput] = useState('');

  const generateRandomName = (): string => {
    const adjectives = ['Silent', 'Shadow', 'Swift', 'Cunning', 'Bold', 'Agile', 'Keen', 'Stealth'];
    const nouns = ['Fox', 'Hawk', 'Raven', 'Viper', 'Ghost', 'Echo', 'Cipher', 'Spark'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = input.trim() || generateRandomName();
    onSubmit(name);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#6db5ae',  // OCEAN_TEAL — full background
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      {/* Map-style title above the card */}
      <h1 style={{
        fontFamily: "'Georgia', serif",
        fontSize: '52px',
        fontWeight: 'bold',
        color: '#2a1a0a',
        marginBottom: '4px',
        letterSpacing: '2px',
      }}>
        TWO SPIES
      </h1>
      <p style={{
        fontFamily: "'Georgia', serif",
        fontSize: '16px',
        fontStyle: 'italic',
        color: '#5a3a1a',
        marginBottom: '40px',
      }}>
        a game of espionage
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#f5f0d8',  // PARCHMENT_LIGHT
          border: '2px solid #c8a96e',  // PARCHMENT_DARK
          borderRadius: '6px',
          padding: '32px 40px',
          width: '360px',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(42,26,10,0.18)',
        }}
      >
        <h2 style={{
          fontFamily: "'Georgia', serif",
          color: '#2a1a0a',
          marginBottom: '10px',
          fontSize: '20px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          Enter Your Codename
        </h2>
        <p style={{
          fontFamily: "'Georgia', serif",
          color: '#5a3a1a',
          marginBottom: '22px',
          fontSize: '13px',
          fontStyle: 'italic',
        }}>
          Leave blank to generate a random codename.
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your codename..."
          style={{
            width: '100%',
            padding: '10px 12px',
            marginBottom: '14px',
            backgroundColor: '#e8dfc0',  // PARCHMENT_MID
            border: '1px solid #c8a96e',  // PARCHMENT_DARK
            borderRadius: '4px',
            color: '#2a1a0a',
            fontFamily: "'Georgia', serif",
            fontSize: '15px',
            boxSizing: 'border-box',
            outline: 'none',
          }}
          autoFocus
        />
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '11px',
            backgroundColor: '#3d2010',  // PANEL_HEADER
            border: '1px solid #2a1a0a',
            borderRadius: '4px',
            color: '#f5f0d8',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: "'Georgia', serif",
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#5a3010')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3d2010')}
        >
          Begin Game
        </button>
      </form>
    </div>
  );
}
