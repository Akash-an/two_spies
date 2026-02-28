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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 15, 35, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#1a1a2e',
          border: '2px solid #e0c872',
          borderRadius: '8px',
          padding: '32px',
          maxWidth: '400px',
          textAlign: 'center',
        }}
      >
        <h1 style={{ color: '#e0c872', marginBottom: '16px', fontSize: '24px' }}>
          Enter Your Codename
        </h1>
        <p style={{ color: '#8888aa', marginBottom: '24px', fontSize: '14px' }}>
          Leave blank to generate a random codename.
        </p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Your codename..."
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#0f0f23',
            border: '1px solid #8888aa',
            borderRadius: '4px',
            color: '#e0c872',
            fontFamily: 'monospace',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
          autoFocus
        />
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#e0c872',
            border: 'none',
            borderRadius: '4px',
            color: '#0f0f23',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          Begin Game
        </button>
      </form>
    </div>
  );
}
