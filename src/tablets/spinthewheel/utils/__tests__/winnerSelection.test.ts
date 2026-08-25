import { createCryptoRng, selectWinnerIndex } from '../winnerSelection';

const sequenceRng = (values: number[]) => {
  let cursor = 0;
  return () => values[cursor++ % values.length];
};

describe('selectWinnerIndex', () => {
  it('returns -1 for an empty list', () => {
    expect(selectWinnerIndex([], () => 0.5)).toBe(-1);
  });

  it('always selects the only entry', () => {
    const entries = [{}, {}, {}];
    [0, 0.2, 0.5, 0.99].forEach((roll) => {
      expect(selectWinnerIndex([entries[0]], () => roll)).toBe(0);
    });
  });

  it('spreads uniform weights evenly across entries', () => {
    const entries = [{}, {}, {}, {}];
    expect(selectWinnerIndex(entries, () => 0)).toBe(0);
    expect(selectWinnerIndex(entries, () => 0.25)).toBe(1);
    expect(selectWinnerIndex(entries, () => 0.5)).toBe(2);
    expect(selectWinnerIndex(entries, () => 0.999)).toBe(3);
  });

  it('honours custom weights deterministically', () => {
    // total weight = 1 + 3 = 4; boundary between entry 0 and 1 is at 1/4.
    const entries = [{}, { weight: 3 }];
    expect(selectWinnerIndex(entries, () => 0.24)).toBe(0);
    expect(selectWinnerIndex(entries, () => 0.25)).toBe(1);
    expect(selectWinnerIndex(entries, () => 0.999)).toBe(1);
  });

  it('matches expected frequencies over many draws', () => {
    const entries = [{ weight: 6 }, { weight: 2 }, {}];
    const counts = [0, 0, 0];
    const samples = 6000;
    for (let i = 0; i < samples; i += 1) {
      counts[selectWinnerIndex(entries, Math.random)] += 1;
    }
    // total weight 9 → expected shares 2/3, 2/9, 1/9.
    expect(counts[0] / samples).toBeCloseTo(6 / 9, 1);
    expect(counts[1] / samples).toBeCloseTo(2 / 9, 1);
    expect(counts[2] / samples).toBeCloseTo(1 / 9, 1);
  });

  it('treats invalid weights as 1', () => {
    const entries = [
      { weight: Number.NaN },
      { weight: 0 },
      { weight: -3 },
      {},
    ];
    // All effective weights are 1 → boundaries at each quarter.
    expect(selectWinnerIndex(entries, sequenceRng([0.1]))).toBe(0);
    expect(selectWinnerIndex(entries, sequenceRng([0.35]))).toBe(1);
    expect(selectWinnerIndex(entries, sequenceRng([0.6]))).toBe(2);
    expect(selectWinnerIndex(entries, sequenceRng([0.9]))).toBe(3);
  });

  it('clamps out-of-domain rng output into range via last-entry fallback', () => {
    const entries = [{}, {}];
    expect(selectWinnerIndex(entries, () => 1)).toBe(1);
  });
});

describe('createCryptoRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = createCryptoRng();
    for (let i = 0; i < 500; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
