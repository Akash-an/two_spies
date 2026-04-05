import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { WebSocketClient } from '../../network/WebSocketClient';
import './PhaserGame.css';

export interface PhaserGameProps {
  operativeName: string;
  playerName: string;
  webSocketClient: WebSocketClient;
  onGameEnd?: () => void;
  onTerminateLink?: () => void;
}

const PhaserGame: React.FC<PhaserGameProps> = ({
  operativeName,
  playerName,
  webSocketClient: _webSocketClient,
  onGameEnd: _onGameEnd,
  onTerminateLink,
}) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameContainerRef.current) return;

    /**
     * GameScene - Main game logic and rendering
     */
    class GameScene extends Phaser.Scene {
      private gridWidth = 10;
      private gridHeight = 10;
      private cellSize = 60;
      private selectedCity: string | null = null;

      constructor() {
        super({ key: 'GameScene' });
      }

      preload() {
        console.log('[GameScene] Preload phase');
      }

      create() {
        console.log('[GameScene] Create phase - initializing game board');

        // Add background
        this.add.rectangle(
          this.scale.width / 2,
          this.scale.height / 2,
          this.scale.width,
          this.scale.height,
          0x0f0f23
        );

        // Draw grid
        this.drawGrid();

        // Draw game title
        this.add.text(20, 20, `OPERATIVE: ${operativeName}`, {
          font: '16px Space Grotesk',
          color: '#00ffff',
          stroke: '#001f1f',
          strokeThickness: 2,
        });

        // Draw status bar
        this.add.text(20, 50, `MATCH: Active | PLAYER: ${playerName}`, {
          font: '12px Space Grotesk',
          color: '#c1fffe',
        });

        // Draw instructions
        this.add.text(20, this.scale.height - 40, 'Click cities to select | ESC to terminate', {
          font: '11px Inter',
          color: '#c1fffe',
        }).setAlpha(0.7);
      }

      private drawGrid() {
        const offsetX = 150;
        const offsetY = 100;

        // Draw grid lines
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.lineStyle(1, 0x00ffff, 0.2);

        for (let row = 0; row <= this.gridHeight; row++) {
          graphics.moveTo(offsetX, offsetY + row * this.cellSize);
          graphics.lineTo(offsetX + this.gridWidth * this.cellSize, offsetY + row * this.cellSize);
        }

        for (let col = 0; col <= this.gridWidth; col++) {
          graphics.moveTo(offsetX + col * this.cellSize, offsetY);
          graphics.lineTo(offsetX + col * this.cellSize, offsetY + this.gridHeight * this.cellSize);
        }

        graphics.strokePath();
        this.add.existing(graphics);

        // Draw city nodes at random positions
        const cities = ['BERLIN', 'MOSCOW', 'LONDON', 'PARIS', 'PRAGUE'];
        for (let i = 0; i < cities.length; i++) {
          const col = Math.floor(Math.random() * this.gridWidth);
          const row = Math.floor(Math.random() * this.gridHeight);
          const x = offsetX + col * this.cellSize + this.cellSize / 2;
          const y = offsetY + row * this.cellSize + this.cellSize / 2;

          const socket = this.add
            .circle(x, y, 8, 0x00ffff)
            .setStrokeStyle(2, 0x00ffff)
            .setInteractive();

          socket.on('pointerover', () => {
            socket.setFillStyle(0x00ffff, 0.8);
          });

          socket.on('pointerout', () => {
            socket.setFillStyle(0x00ffff, 0.3);
          });

          socket.on('pointerdown', () => {
            this.selectCity(cities[i], socket);
          });

          this.add.text(x + 15, y - 5, cities[i], {
            font: '10px Space Grotesk',
            color: '#c1fffe',
          });
        }
      }

      private selectCity(cityId: string, socket: Phaser.GameObjects.Arc) {
        if (this.selectedCity) {
          // Deselect previous city
          const previousSocket = this.children.list.find(
            (obj) => obj instanceof Phaser.GameObjects.Arc && obj.getData('cityId') === this.selectedCity
          ) as Phaser.GameObjects.Arc | undefined;
          if (previousSocket) {
            previousSocket.setStrokeStyle(2, 0x00ffff);
            previousSocket.setFillStyle(0x00ffff, 0.3);
          }
        }

        this.selectedCity = cityId;
        socket.setData('cityId', cityId);
        socket.setStrokeStyle(3, 0xffd700);
        socket.setFillStyle(0xffd700, 0.6);

        console.log('[GameScene] Selected city:', cityId);
      }

      update() {
        // Game update logic
      }
    }

    // Phaser configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainerRef.current,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
      },
      scene: [GameScene],
      render: {
        pixelArt: false,
        antialias: true,
      },
    };

    // Create Phaser game instance
    gameRef.current = new Phaser.Game(config);

    return () => {
      // Cleanup on unmount
      gameRef.current?.destroy(true);
    };
  }, [operativeName, playerName]);

  return (
    <div className="phaser-game-container">
      <div ref={gameContainerRef} className="phaser-game" />
      {/* Overlay controls */}
      <div className="game-overlay">
        <button onClick={onTerminateLink} className="terminate-button">
          TERMINATE LINK (ESC)
        </button>
      </div>
    </div>
  );
};

export default PhaserGame;
