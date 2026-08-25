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

/** Bright "click" layer — a quick downward chirp, like a fingernail on a paddle. */
const CLICK_FROM_HZ = 2100;
const CLICK_TO_HZ = 1200;
const CLICK_DURATION_S = 0.035;
const CLICK_GAIN = 0.09;

/** Warm "body" layer — a soft low thump that gives the click physical weight. */
const BODY_HZ = 320;
const BODY_DURATION_S = 0.05;
const BODY_GAIN = 0.05;

/** Subtle random detune so rapid ticks never sound mechanical. */
const DETUNE_RATIO = 0.06;

/**
 * Creates a fail-silent, two-layer tick player built on Web Audio
 * (no asset files): a bright triangle-wave chirp over a soft low sine thump,
 * with gentle per-tick pitch variation for an organic feel. The context is
 * created lazily on the first `play()` call so it happens inside a user
 * gesture, satisfying autoplay policies.
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

  const playLayer = (
    audio: AudioContext,
    options: {
      type: OscillatorType;
      fromHz: number;
      toHz?: number;
      durationS: number;
      gain: number;
      detuneRatio: number;
    },
  ): void => {
    const now = audio.currentTime;

    const oscillator = audio.createOscillator();
    oscillator.type = options.type;
    const detune = 1 + (Math.random() * 2 - 1) * options.detuneRatio;
    const startHz = options.fromHz * detune;
    oscillator.frequency.setValueAtTime(startHz, now);
    if (options.toHz !== undefined) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, options.toHz * detune),
        now + options.durationS,
      );
    }

    const gain = audio.createGain();
    gain.gain.setValueAtTime(options.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + options.durationS);

    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + options.durationS);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  };

  return {
    play() {
      try {
        const audio = ensureContext();
        if (!audio) return;
        if (audio.state === "suspended") void audio.resume().catch(() => undefined);

        // Soft low body first, bright click on top — perceived as one "tick".
        playLayer(audio, {
          type: "sine",
          fromHz: BODY_HZ,
          durationS: BODY_DURATION_S,
          gain: BODY_GAIN,
          detuneRatio: DETUNE_RATIO,
        });
        playLayer(audio, {
          type: "triangle",
          fromHz: CLICK_FROM_HZ,
          toHz: CLICK_TO_HZ,
          durationS: CLICK_DURATION_S,
          gain: CLICK_GAIN,
          detuneRatio: DETUNE_RATIO,
        });
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
