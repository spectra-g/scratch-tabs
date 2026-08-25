import { useCallback, useEffect, useRef, useState } from "react";
import type { WheelEntry } from "../types";
import {
  computeTargetRotation,
  easeOutQuart,
  sliceIndexAtRotation,
} from "../utils/spinMath";
import { createCryptoRng, selectWinnerIndex, type Rng } from "../utils/winnerSelection";

export type SpinPhase = "idle" | "spinning" | "result";

interface SpinAnimation {
  fromDeg: number;
  toDeg: number;
  sliceCount: number;
  startTimeMs: number;
  durationMs: number;
  winner: WheelEntry;
  lastTickSliceIndex: number;
  lastTickTimeMs: number;
}

interface UseSpinOptions {
  /** Entries currently on the wheel (already filtered to enabled). */
  entries: WheelEntry[];
  /** Total animation time in milliseconds. */
  durationMs: number;
  /** Called exactly once when the wheel stops. */
  onSpinEnd?: (winner: WheelEntry) => void;
  /** Fired whenever a slice boundary passes the pointer. */
  onTick?: () => void;
  rng?: Rng;
}

/** Minimum gap between tick sounds so fast early spins don't machine-gun. */
const MIN_TICK_INTERVAL_MS = 30;

/**
 * Spin state machine (idle → spinning → result).
 *
 * The winner is drawn first via weighted random selection; the animation is
 * then computed to land on that slice under the pointer — the visual result
 * always matches the draw.
 *
 * Clicks while spinning are ignored; callers can pass an explicit entry list
 * to `spin()` when the wheel contents are about to change (e.g. remove-winner
 * then re-spin in one action).
 */
export function useSpin({ entries, durationMs, onSpinEnd, onTick, rng }: UseSpinOptions) {
  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [rotationDeg, setRotationDeg] = useState(0);
  const [winner, setWinner] = useState<WheelEntry | null>(null);

  const rafRef = useRef(0);
  const animationRef = useRef<SpinAnimation | null>(null);
  const rotationRef = useRef(0);
  const latestRef = useRef({ entries, durationMs, onSpinEnd, onTick, rng });

  latestRef.current = { entries, durationMs, onSpinEnd, onTick, rng };

  useEffect(() => {
    return () => {
      window.cancelAnimationFrame(rafRef.current);
      animationRef.current = null;
    };
  }, []);

  const finish = useCallback((animation: SpinAnimation) => {
    animationRef.current = null;
    setRotationDeg(animation.toDeg);
    rotationRef.current = animation.toDeg;
    setPhase("result");
    setWinner(animation.winner);
    latestRef.current.onSpinEnd?.(animation.winner);
  }, []);

  const frame = useCallback(
    (nowMs: number) => {
      const animation = animationRef.current;
      if (!animation) return;

      const progress = Math.min((nowMs - animation.startTimeMs) / animation.durationMs, 1);
      const eased = easeOutQuart(progress);
      const rotation = animation.fromDeg + (animation.toDeg - animation.fromDeg) * eased;

      setRotationDeg(rotation);
      rotationRef.current = rotation;

      const sliceIndex = sliceIndexAtRotation(rotation, animation.sliceCount);
      if (
        sliceIndex !== animation.lastTickSliceIndex &&
        nowMs - animation.lastTickTimeMs >= MIN_TICK_INTERVAL_MS
      ) {
        animation.lastTickSliceIndex = sliceIndex;
        animation.lastTickTimeMs = nowMs;
        latestRef.current.onTick?.();
      }

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(frame);
      } else {
        finish(animation);
      }
    },
    [finish],
  );

  const spin = useCallback(
    (entryOverride?: readonly WheelEntry[]) => {
      if (animationRef.current) return;

      const list = entryOverride ?? latestRef.current.entries;
      const selectRng = latestRef.current.rng ?? createCryptoRng();
      const winnerIndex = selectWinnerIndex(list, selectRng);
      if (winnerIndex < 0) return;

      const winnerEntry = list[winnerIndex];
      const toDeg = computeTargetRotation({
        currentRotationDeg: rotationRef.current,
        winnerIndex,
        sliceCount: list.length,
      });

      setWinner(null);
      setPhase("spinning");

      animationRef.current = {
        fromDeg: rotationRef.current,
        toDeg,
        sliceCount: list.length,
        startTimeMs: performance.now(),
        durationMs: Math.max(latestRef.current.durationMs, 100),
        winner: winnerEntry,
        lastTickSliceIndex: sliceIndexAtRotation(rotationRef.current, list.length),
        lastTickTimeMs: performance.now(),
      };
      rafRef.current = window.requestAnimationFrame(frame);
    },
    [frame],
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setWinner(null);
  }, []);

  return { phase, rotationDeg, winner, spin, reset };
}
