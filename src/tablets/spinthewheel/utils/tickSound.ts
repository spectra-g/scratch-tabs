export interface TickPlayer {
  /** Plays a single short tick. No-op when Web Audio is unavailable. */
  play(): void;
  /** Releases the audio context (idempotent). */
  dispose(): void;
}

type AudioContextCtor = new () => AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return ctor ?? null;
}

const TICK_FREQUENCY_HZ = 1100;
const TICK_DURATION_S = 0.05;
const TICK_GAIN = 0.06;

/**
 * Creates a fail-silent tick-sound player built on a Web Audio oscillator
 * (no asset files). The context is created lazily on the first `play()` call
 * so it happens inside a user gesture, satisfying autoplay policies.
 */
export function createTickPlayer(): TickPlayer {
  let context: AudioContext | null = null;

  const ensureContext = (): AudioContext | null => {
    if (context) return context;
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch {
      context = null;
    }
    return context;
  };

  return {
    play() {
      try {
        const audio = ensureContext();
        if (!audio) return;
        if (audio.state === "suspended") void audio.resume().catch(() => undefined);

        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const now = audio.currentTime;

        oscillator.type = "square";
        oscillator.frequency.value = TICK_FREQUENCY_HZ;
        gain.gain.setValueAtTime(TICK_GAIN, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + TICK_DURATION_S);

        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now);
        oscillator.stop(now + TICK_DURATION_S);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
      } catch {
        // Fail-silent: sound must never break spinning.
      }
    },

    dispose() {
      const current = context;
      context = null;
      if (!current) return;
      try {
        void current.close().catch(() => undefined);
      } catch {
        // Fail-silent.
      }
    },
  };
}
