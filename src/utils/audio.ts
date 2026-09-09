// Web Audio API synthesized chimes and bells (zero external audio file dependencies)

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

// Auto-unlock audio on user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
}

/**
 * Play a cute synthesized bunny bell melody
 * Chime pattern: C6 -> E6 -> G6 -> C7 with warm harmonics
 */
export function playChime(volume: number = 0.3) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playTone = (freq: number, start: number, duration: number, gainVal: number) => {
      // Fundamental oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Soft sine tone with a gentle attack and bell decay
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(gainVal * volume, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);

      // Add gentle harmonic sparkle (2nd harmonic)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, start);

      gain2.gain.setValueAtTime(0, start);
      gain2.gain.linearRampToValueAtTime(gainVal * 0.25 * volume, start + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.6);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(start);
      osc2.stop(start + duration * 0.6);
    };

    const now = ctx.currentTime;
    // Pleasant celesta/doorbell progression: G5 (784Hz) -> C6 (1046Hz) -> E6 (1318Hz) -> G6 (1568Hz)
    playTone(783.99, now, 0.45, 0.22);
    playTone(1046.50, now + 0.12, 0.45, 0.26);
    playTone(1318.51, now + 0.24, 0.50, 0.28);
    playTone(1567.98, now + 0.36, 0.75, 0.30);
  } catch (error) {
    console.error('Failed to play audio chime:', error);
  }
}
