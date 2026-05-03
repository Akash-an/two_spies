import wave
import struct
import math

def generate_tone(filename, freq, duration_ms, volume=0.5, wave_type='sine'):
    sample_rate = 44100
    num_samples = int(sample_rate * (duration_ms / 1000.0))
    
    wav_file = wave.open(filename, "w")
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)
    
    for i in range(num_samples):
        t = float(i) / sample_rate
        if wave_type == 'sine':
            value = math.sin(2.0 * math.pi * freq * t)
        elif wave_type == 'square':
            value = 1.0 if math.sin(2.0 * math.pi * freq * t) > 0 else -1.0
        elif wave_type == 'sawtooth':
            value = 2.0 * (t * freq - math.floor(0.5 + t * freq))
        else:
            value = 0
            
        # apply envelope (fade out)
        envelope = 1.0 - (i / num_samples)
        
        packed_value = struct.pack('h', int(value * envelope * volume * 32767.0))
        wav_file.writeframes(packed_value)
        
    wav_file.close()

# UI Hover/Click (short, high)
generate_tone("stitch-frontend/public/assets/audio/ui_hover.wav", 800, 50, 0.2, 'sine')
generate_tone("stitch-frontend/public/assets/audio/ui_click.wav", 1200, 100, 0.3, 'sine')

# Action Success (chord-like or ascending)
generate_tone("stitch-frontend/public/assets/audio/success.wav", 600, 300, 0.4, 'sine')

# Error/Invalid (low, harsh)
generate_tone("stitch-frontend/public/assets/audio/error.wav", 150, 250, 0.5, 'sawtooth')

# Turn Start (notification bell)
generate_tone("stitch-frontend/public/assets/audio/turn_start.wav", 880, 500, 0.4, 'sine')

# Background drone (very low, long)
# Actually BGM might be too annoying as a generated tone, we'll leave it as a comment

print("Audio files generated.")
