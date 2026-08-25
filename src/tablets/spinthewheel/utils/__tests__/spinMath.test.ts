import {
  computeTargetRotation,
  easeOutCubic,
  easeOutQuart,
  FULL_TURN_DEG,
  MAX_JITTER_RATIO,
  sliceArc,
  sliceIndexAtRotation,
  type Rng,
} from '../spinMath';

describe('easing functions', () => {
  it.each([
    ['easeOutCubic', easeOutCubic],
    ['easeOutQuart', easeOutQuart],
  ])('%s maps endpoints correctly', (_name, ease) => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it.each([
    ['easeOutCubic', easeOutCubic],
    ['easeOutQuart', easeOutQuart],
  ])('%s is monotonic and front-loaded', (_name, ease) => {
    let previous = -Infinity;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const value = ease(t);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous = value;
    }
    expect(ease(0.5)).toBeGreaterThan(0.5);
  });

  it.each([
    ['easeOutCubic', easeOutCubic],
    ['easeOutQuart', easeOutQuart],
  ])('%s clamps out-of-range input', (_name, ease) => {
    expect(ease(-5)).toBe(0);
    expect(ease(7)).toBe(1);
  });
});

describe('sliceIndexAtRotation', () => {
  it('returns slice 0 under the pointer when rotation is 0', () => {
    expect(sliceIndexAtRotation(0, 4)).toBe(0);
  });

  it('matches renderer geometry: rotation by one arc moves next slice to pointer', () => {
    // Slice i spans [-90 + rot + i*arc, ...+arc); pointer is at canvas angle -90.
    expect(sliceIndexAtRotation(-90, 4)).toBe(1);
    expect(sliceIndexAtRotation(90, 4)).toBe(3);
    expect(sliceIndexAtRotation(360 * 5, 4)).toBe(0);
    expect(sliceIndexAtRotation(-360 * 3 - 90, 4)).toBe(1);
  });

  it('never returns an out-of-range index for arbitrary rotations', () => {
    for (let rot = -2000; rot <= 2000; rot += 37.7) {
      const index = sliceIndexAtRotation(rot, 7);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(7);
    }
  });

  it('handles the single-slice wheel', () => {
    expect(sliceIndexAtRotation(1234, 1)).toBe(0);
  });
});

describe('computeTargetRotation', () => {
  const deterministicRng = (value: number): Rng => () => value;

  it('lands the winning slice under the pointer (visual honesty)', () => {
    for (let sliceCount = 2; sliceCount <= 24; sliceCount += 1) {
      for (let winnerIndex = 0; winnerIndex < sliceCount; winnerIndex += 1) {
        const target = computeTargetRotation({
          currentRotationDeg: 250,
          winnerIndex,
          sliceCount,
          rng: deterministicRng(0.42),
        });
        expect(sliceIndexAtRotation(target, sliceCount)).toBe(winnerIndex);
      }
    }
  });

  it('always moves forward past at least MIN_EXTRA_TURNS', () => {
    for (let i = 0; i < 200; i += 1) {
      const current = i * 173.3;
      const target = computeTargetRotation({
        currentRotationDeg: current,
        winnerIndex: i % 9,
        sliceCount: 9,
        rng: Math.random,
      });
      expect(target).toBeGreaterThan(current);
      expect(target - current).toBeGreaterThanOrEqual(4 * FULL_TURN_DEG);
      expect(target - current).toBeLessThan(8 * FULL_TURN_DEG + FULL_TURN_DEG);
    }
  });

  it('honours explicit extraTurns', () => {
    const target = computeTargetRotation({
      currentRotationDeg: 0,
      winnerIndex: 0,
      sliceCount: 4,
      extraTurns: 6,
      rng: deterministicRng(0),
    });
    const delta = target;
    expect(delta).toBeGreaterThanOrEqual(6 * FULL_TURN_DEG);
    expect(delta).toBeLessThanOrEqual(7 * FULL_TURN_DEG + FULL_TURN_DEG);
  });

  it('keeps jitter within the winning slice', () => {
    const arc = sliceArc(8);
    const target = computeTargetRotation({
      currentRotationDeg: 1000,
      winnerIndex: 2,
      sliceCount: 8,
      extraTurns: 5,
      rng: deterministicRng(1), // maximum jitter
    });
    // Rotation modulo a full turn must sit in slice 2's window.
    const mod = ((target % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG;
    const offsetFromCentre = Math.abs(mod - (-(2 + 0.5) * arc + FULL_TURN_DEG)) % arc;
    expect(offsetFromCentre).toBeLessThanOrEqual(arc * MAX_JITTER_RATIO + 1e-9);
  });
});
