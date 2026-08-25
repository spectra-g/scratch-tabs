/**
 * Pure spin geometry and easing math. No DOM, no React — fully unit-testable.
 *
 * Geometry contract (matches utils/wheelRenderer.ts):
 * - Slice i is drawn from angle `-90° + rotationDeg + i * arc` (canvas angles,
 *   clockwise, 0° = 3 o'clock).
 * - The pointer sits at the top of the wheel, i.e. at canvas angle `-90°`.
 */

export const FULL_TURN_DEG = 360;

/** Range of full extra turns a spin travels before settling on the winner. */
export const MIN_EXTRA_TURNS = 4;
export const MAX_EXTRA_TURNS = 7;

/** Winner must land within this fraction of the slice, measured from centre. */
export const MAX_JITTER_RATIO = 0.35;

export type Rng = () => number;

function clamp01(t: number): number {
  return Math.min(Math.max(t, 0), 1);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 3);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - clamp01(t), 4);
}

/** Angle of each slice in degrees (equal slices). */
export function sliceArc(sliceCount: number): number {
  return FULL_TURN_DEG / sliceCount;
}

/** Index of the slice sitting under the top pointer for the given rotation. */
export function sliceIndexAtRotation(rotationDeg: number, sliceCount: number): number {
  if (sliceCount <= 0) return -1;
  const arc = sliceArc(sliceCount);
  const normalized = (((-rotationDeg % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG);
  return Math.floor(normalized / arc) % sliceCount;
}

export interface TargetRotationOptions {
  currentRotationDeg: number;
  winnerIndex: number;
  sliceCount: number;
  /** Full turns to travel; defaults to a random value in [MIN_EXTRA_TURNS, MAX_EXTRA_TURNS]. */
  extraTurns?: number;
  /** Random landing offset as a ratio of the arc; capped at MAX_JITTER_RATIO. */
  jitterRatio?: number;
  rng?: Rng;
}

/**
 * Computes the final wheel rotation so the winning slice rests under the
 * pointer. Always returns a forward-moving target (strictly greater than the
 * current rotation) so the wheel never visibly reverses.
 */
export function computeTargetRotation(options: TargetRotationOptions): number {
  const { currentRotationDeg, winnerIndex, sliceCount } = options;
  const rng = options.rng ?? Math.random;
  const arc = sliceArc(sliceCount);
  const jitterCap = Math.min(options.jitterRatio ?? MAX_JITTER_RATIO, MAX_JITTER_RATIO);

  // Whole turns only — fractional turns would break the landing congruence.
  const extraTurns =
    options.extraTurns ??
    Math.floor(MIN_EXTRA_TURNS + rng() * (MAX_EXTRA_TURNS - MIN_EXTRA_TURNS + 1));

  const jitter = (rng() * 2 - 1) * arc * jitterCap;
  const idealMod = (((-(winnerIndex + 0.5) * arc + jitter) % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG;

  const currentMod = ((currentRotationDeg % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG;
  let delta = idealMod - currentMod;
  if (delta <= 0) delta += FULL_TURN_DEG;

  return currentRotationDeg + extraTurns * FULL_TURN_DEG + delta;
}
