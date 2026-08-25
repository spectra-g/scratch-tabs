import type { WinnerHistoryItem } from '../../types';
import {
  HISTORY_LIMIT,
  historyToText,
  recordWinner,
  summarizeHistory,
} from '../historyModel';

const item = (label: string, timestamp: number, id = label): WinnerHistoryItem => ({
  id,
  entryId: null,
  label,
  timestamp,
});

describe('recordWinner', () => {
  it('prepends the newest win', () => {
    const history = recordWinner([item('Alice', 1)], { entryId: 'e2', label: 'Bob' }, 2);
    expect(history.map((h) => h.label)).toEqual(['Bob', 'Alice']);
    expect(history[0].entryId).toBe('e2');
  });

  it('does not mutate the input array', () => {
    const original = [item('Alice', 1)];
    const copy = [...original];
    recordWinner(original, { entryId: null, label: 'Bob' }, 2);
    expect(original).toEqual(copy);
  });

  it('caps the history at HISTORY_LIMIT entries', () => {
    let history: WinnerHistoryItem[] = [];
    for (let i = 0; i < HISTORY_LIMIT + 50; i++) {
      history = recordWinner(history, { entryId: null, label: `W${i}` }, i);
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
    // Newest kept, oldest dropped.
    expect(history[0].label).toBe(`W${HISTORY_LIMIT + 49}`);
  });

  it('assigns unique ids to each recorded win', () => {
    let history: WinnerHistoryItem[] = [];
    for (let i = 0; i < 20; i++) {
      history = recordWinner(history, { entryId: null, label: 'Alice' }, i);
    }
    expect(new Set(history.map((h) => h.id)).size).toBe(20);
  });
});

describe('summarizeHistory', () => {
  it('counts wins per label', () => {
    const history = [
      item('Alice', 3),
      item('Bob', 2),
      item('Alice', 4),
      item('Alice', 1),
    ];
    expect(summarizeHistory(history)).toEqual([
      { label: 'Alice', count: 3 },
      { label: 'Bob', count: 1 },
    ]);
  });

  it('breaks count ties by most recent win', () => {
    const history = [
      item('Alice', 10),
      item('Bob', 20),
    ];
    expect(summarizeHistory(history)[0].label).toBe('Bob');
  });

  it('returns empty for empty history', () => {
    expect(summarizeHistory([])).toEqual([]);
  });
});

describe('historyToText', () => {
  it('lists one winner per line in chronological order', () => {
    // Stored newest-first; output must be oldest-first.
    const history = [item('Carol', 3), item('Bob', 2), item('Alice', 1)];
    expect(historyToText(history)).toBe('Alice\nBob\nCarol');
  });

  it('returns empty string for empty history', () => {
    expect(historyToText([])).toBe('');
  });
});
