// Web Audio API synthesized chimes and bells
let audioContext: AudioContext | null = null;
let isUnlocked = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) {
    audioContext = new AudioContextClass();
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (!isUnlocked) {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        isUnlocked = true;
      }
    }
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  ['touchstart', 'touchend', 'click', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });
}

export function playChime(volume: number = 0.5) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playTone = (freq: number, start: number, duration: number, gainVal: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(gainVal * volume, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, start);

      gain2.gain.setValueAtTime(0, start);
      gain2.gain.linearRampToValueAtTime(gainVal * 0.3 * volume, start + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.6);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(start);
      osc2.stop(start + duration * 0.6);
    };

    const now = ctx.currentTime;
    playTone(783.99, now, 0.45, 0.35);         // G5
    playTone(1046.50, now + 0.13, 0.45, 0.40);  // C6
    playTone(1318.51, now + 0.26, 0.50, 0.45);  // E6
    playTone(1567.98, now + 0.39, 0.85, 0.50);  // G6
  } catch (error) {
    console.error('Failed to play audio chime:', error);
  }
}
