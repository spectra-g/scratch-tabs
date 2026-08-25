import type { Rng } from "./spinMath";

interface Weighted {
  weight?: number;
}

function effectiveWeight(entry: Weighted): number {
  return typeof entry.weight === "number" && Number.isFinite(entry.weight) && entry.weight > 0
    ? entry.weight
    : 1;
}

/**
 * Crypto-quality RNG in [0, 1). Falls back to Math.random when the Web Crypto
 * API is unavailable.
 */
export function createCryptoRng(): Rng {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return () => {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0] / 2 ** 32;
    };
  }
  return Math.random;
}

/**
 * Picks a winner index honouring per-entry weights (default weight 1).
 * Returns -1 when `entries` is empty.
 *
 * The winner is chosen BEFORE any animation runs — the animation then targets
 * that slice, guaranteeing what the wheel shows matches what was drawn.
 */
export function selectWinnerIndex(
  entries: readonly Weighted[],
  rng: Rng = createCryptoRng(),
): number {
  if (entries.length === 0) return -1;

  const total = entries.reduce((sum, entry) => sum + effectiveWeight(entry), 0);
  let roll = rng() * total;

  for (let i = 0; i < entries.length; i += 1) {
    roll -= effectiveWeight(entries[i]);
    if (roll < 0) return i;
  }
  return entries.length - 1;
}
