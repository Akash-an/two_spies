import { Howl, Howler } from 'howler';

// Sound effect names mapped to their file paths
const SOUND_ASSETS = {
  ui_hover: '/assets/audio/ui_hover.wav',
  ui_click: '/assets/audio/ui_click.wav',
  success: '/assets/audio/success.wav',
  error: '/assets/audio/error.wav',
  turn_start: '/assets/audio/turn_start.wav',
} as const;

export type SoundName = keyof typeof SOUND_ASSETS;

class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<SoundName, Howl> = new Map();
  private initialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Must be called on first user interaction to unlock Web Audio API and preload sounds.
   */
  public init() {
    if (this.initialized) return;

    // Load all sounds
    Object.entries(SOUND_ASSETS).forEach(([key, path]) => {
      this.sounds.set(key as SoundName, new Howl({
        src: [path],
        preload: true,
      }));
    });

    this.initialized = true;
    console.log('[AudioManager] Initialized and sounds preloaded.');
  }

  /**
   * Plays a preloaded sound effect.
   */
  public play(name: SoundName) {
    if (!this.initialized) {
      console.warn('[AudioManager] Cannot play sound before initialization.');
      return;
    }
    
    const sound = this.sounds.get(name);
    if (sound) {
      sound.play();
    } else {
      console.warn(`[AudioManager] Sound not found: ${name}`);
    }
  }

  /**
   * Toggle global mute state
   */
  public toggleMute(): boolean {
    const isMuted = !Howler.mute(); // Returns the NEW state
    Howler.mute(isMuted);
    return isMuted;
  }

  /**
   * Check global mute state
   */
  public isMuted(): boolean {
    return Howler._muted;
  }
  
  /**
   * Set global volume (0.0 to 1.0)
   */
  public setVolume(volume: number) {
    Howler.volume(volume);
  }
}

export const audioManager = AudioManager.getInstance();
