import confetti from "canvas-confetti";

const CONFETTI_DEFAULTS = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };
const BURST_INTERVAL_MS = 250;
const DEFAULT_DURATION_MS = 3000;

export interface CelebrationConfettiHandle {
  /** Stops any pending bursts (idempotent). */
  stop(): void;
}

/**
 * Fires a side-to-side celebration confetti burst over `durationMs`.
 * Returns a handle so callers can cut it short. Safe to call in any
 * environment — errors from the confetti canvas never propagate.
 */
export function fireCelebrationConfetti(durationMs = DEFAULT_DURATION_MS): CelebrationConfettiHandle {
  const animationEnd = Date.now() + durationMs;
  const defaults = { ...CONFETTI_DEFAULTS };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      window.clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / durationMs);

    try {
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    } catch {
      window.clearInterval(interval);
    }
  }, BURST_INTERVAL_MS);

  let stopped = false;
  return {
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearInterval(interval);
    },
  };
}
