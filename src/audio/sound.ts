import { COLOR_TONES, type Color } from '../game/colors';

export type Sound = {
  unlock(): void;
  play(color: Color, durationMs: number): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
};

const ATTACK_S = 0.02;
const RELEASE_S = 0.05;
const VOLUME = 0.3;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

// Web Audio tones. Every failure is swallowed so the game keeps working with lights only.
export function createSound(): Sound {
  let ctx: AudioContext | null = null;
  let muted = false;

  return {
    // Must be called from a user gesture (autoplay policy).
    unlock() {
      try {
        if (!ctx) {
          const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
          if (!Ctor) return;
          ctx = new Ctor();
        }
        if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
      } catch {
        ctx = null;
      }
    },

    play(color, durationMs) {
      if (muted || !ctx) return;
      try {
        const start = ctx.currentTime;
        const end = start + durationMs / 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = COLOR_TONES[color];
        // Short fade in/out avoids audible clicks.
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(VOLUME, start + ATTACK_S);
        gain.gain.setValueAtTime(VOLUME, Math.max(start + ATTACK_S, end - RELEASE_S));
        gain.gain.linearRampToValueAtTime(0, end);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(end + 0.01);
      } catch {
        // Ignore audio errors.
      }
    },

    setMuted(value) {
      muted = value;
    },

    isMuted: () => muted,
  };
}
