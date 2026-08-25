import type { WheelEntry } from '../../types';
import { dedupeEntries, shuffleEntries, sortEntries } from '../entryOperations';

const entry = (id: string, label: string, enabled = true): WheelEntry => ({
  id,
  label,
  enabled,
});

describe('shuffleEntries', () => {
  it('is a permutation — same multiset, input untouched', () => {
    const input = [entry('1', 'A'), entry('2', 'B'), entry('3', 'C'), entry('4', 'D')];
    const snapshot = [...input];
    const shuffled = shuffleEntries(input);
    expect([...shuffled].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...input].sort((a, b) => a.id.localeCompare(b.id)),
    );
    expect(input).toEqual(snapshot);
  });

  it('uses the injected rng deterministically (swap(0, last) rng)', () => {
    const input = [entry('1', 'A'), entry('2', 'B'), entry('3', 'C')];
    // rng() = 0.999… → j always = i → identity shuffle.
    expect(shuffleEntries(input, () => 0.9999)).toEqual(input);
  });

  it('returns a new array even when nothing moves', () => {
    const input = [entry('1', 'A')];
    expect(shuffleEntries(input, () => 0)).not.toBe(input);
  });
});

describe('sortEntries', () => {
  it('sorts A→Z case-insensitively and keeps all attributes', () => {
    const input = [entry('1', 'carol'), entry('2', 'Bob'), entry('3', 'alice', false)];
    const sorted = sortEntries(input);
    expect(sorted.map((e) => e.label)).toEqual(['alice', 'Bob', 'carol']);
    expect(sorted[0]).toMatchObject({ id: '3', enabled: false });
  });

  it('does not mutate the input', () => {
    const input = [entry('1', 'B'), entry('2', 'A')];
    sortEntries(input);
    expect(input.map((e) => e.label)).toEqual(['B', 'A']);
  });

  it('handles empty lists', () => {
    expect(sortEntries([])).toEqual([]);
  });
});

describe('dedupeEntries', () => {
  it('drops later duplicates case-insensitively, keeping the first occurrence', () => {
    const input = [
      entry('1', 'Alice'),
      entry('2', 'ALICE'),
      entry('3', 'Bob'),
      entry('4', ' alice '),
    ];
    const deduped = dedupeEntries(input);
    expect(deduped.map((e) => e.id)).toEqual(['1', '3']);
  });

  it('preserves order and attributes of kept entries', () => {
    const input = [entry('1', 'Bob', false), entry('2', 'Alice'), entry('3', 'BOB')];
    const deduped = dedupeEntries(input);
    expect(deduped).toEqual([entry('1', 'Bob', false), entry('2', 'Alice')]);
  });

  it('passes through entries with unique labels unchanged', () => {
    const input = [entry('1', 'A'), entry('2', 'B')];
    expect(dedupeEntries(input)).toEqual(input);
  });
});
