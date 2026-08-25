import {
  createDefaultData,
  createEntryId,
  DEFAULT_SETTINGS,
  entriesToText,
  parseEntriesText,
} from '../contentModel';
import SpinTheWheelTablet from '../SpinTheWheelTablet';

describe('parseEntriesText', () => {
  it('splits one entry per line and trims whitespace', () => {
    const entries = parseEntriesText('Alice\n  Bob  \nCharlie');
    expect(entries.map((e) => e.label)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('skips blank lines', () => {
    const entries = parseEntriesText('Alice\n\n   \nBob\n');
    expect(entries).toHaveLength(2);
  });

  it('handles CRLF line endings', () => {
    const entries = parseEntriesText('Alice\r\nBob');
    expect(entries.map((e) => e.label)).toEqual(['Alice', 'Bob']);
  });

  it('returns empty array for empty or blank text', () => {
    expect(parseEntriesText('')).toEqual([]);
    expect(parseEntriesText('  \n \n')).toEqual([]);
  });

  it('assigns unique ids and enables entries by default', () => {
    const [a, b] = parseEntriesText('Alice\nBob');
    expect(a.id).not.toBe(b.id);
    expect(a.enabled).toBe(true);
    expect(b.enabled).toBe(true);
  });
});

describe('entriesToText', () => {
  it('joins labels with newlines', () => {
    const entries = parseEntriesText('Alice\nBob');
    expect(entriesToText(entries)).toBe('Alice\nBob');
  });

  it('round-trips through parseEntriesText (modulo ids)', () => {
    const labels = ['Alice', 'Bob', 'Charlie'];
    expect(entriesToText(parseEntriesText(labels.join('\n')))).toBe(labels.join('\n'));
  });

  it('returns empty string for no entries', () => {
    expect(entriesToText([])).toBe('');
  });
});

describe('createEntryId', () => {
  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, createEntryId));
    expect(ids.size).toBe(100);
  });
});

describe('createDefaultData', () => {
  it('creates a sensible default wheel when no payload', () => {
    const data = createDefaultData();
    expect(data.entries.length).toBeGreaterThanOrEqual(2);
    expect(data.title).toBe('');
    expect(data.winnerHistory).toEqual([]);
    expect(data.snapshots).toEqual([]);
    expect(data.settings).toEqual(DEFAULT_SETTINGS);
    expect(data.settings).not.toBe(DEFAULT_SETTINGS); // defensive copy
  });

  it('splits payload content into entries, one per line', () => {
    const data = createDefaultData({ content: 'Alice\nBob\n\nCharlie' });
    expect(data.entries.map((e) => e.label)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('falls back to defaults for whitespace-only content', () => {
    const data = createDefaultData({ content: '   \n  ' });
    expect(data.entries.length).toBeGreaterThanOrEqual(2);
  });

  it('uses payload title', () => {
    const data = createDefaultData({ title: 'Class 5B' });
    expect(data.title).toBe('Class 5B');
  });

  it('ignores undefined payload fields', () => {
    const data = createDefaultData({ content: undefined, title: undefined });
    expect(data.entries.length).toBeGreaterThanOrEqual(2);
    expect(data.title).toBe('');
  });
});

describe('deserializeState (coercion contract)', () => {
  const tablet = SpinTheWheelTablet;

  it('restores a valid serialized state', () => {
    const original = { type: 'spinthewheel', data: createDefaultData({ content: 'A\nB' }) };
    const restored = tablet.deserializeState(JSON.stringify(original));
    expect(restored.data.entries.map((e) => e.label)).toEqual(['A', 'B']);
    expect(restored.type).toBe('spinthewheel');
  });

  it('falls back to defaults on malformed JSON', () => {
    const restored = tablet.deserializeState('{oops');
    expect(restored.type).toBe('spinthewheel');
    expect(restored.data.entries.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back on wrong type discriminant', () => {
    const restored = tablet.deserializeState(JSON.stringify({ type: 'base64', data: {} }));
    expect(restored.type).toBe('spinthewheel');
    expect(restored.data.entries.length).toBeGreaterThanOrEqual(2);
  });

  it('merges missing collections with defaults on partial data', () => {
    const restored = tablet.deserializeState(
      JSON.stringify({
        type: 'spinthewheel',
        data: { entries: [{ label: 'Solo' }], title: 'My wheel' },
      }),
    );
    expect(restored.data.title).toBe('My wheel');
    expect(restored.data.entries).toHaveLength(1);
    expect(restored.data.entries[0].enabled).toBe(true);
    expect(restored.data.entries[0].id).toBeTruthy();
    expect(restored.data.winnerHistory).toEqual([]);
    expect(restored.data.snapshots).toEqual([]);
    expect(restored.data.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('drops invalid entries instead of failing', () => {
    const restored = tablet.deserializeState(
      JSON.stringify({
        type: 'spinthewheel',
        data: {
          entries: [{ label: 'Keep' }, null, { noLabel: true }, { label: '   ' }, 'junk'],
          winnerHistory: [{ label: 'Keep' }, 42, {}],
        },
      }),
    );
    expect(restored.data.entries.map((e) => e.label)).toEqual(['Keep']);
    expect(restored.data.winnerHistory).toHaveLength(1);
  });

  it('preserves custom colours, weights, and disabled flags', () => {
    const restored = tablet.deserializeState(
      JSON.stringify({
        type: 'spinthewheel',
        data: {
          entries: [
            { id: 'e1', label: 'A', color: '#123456', weight: 3 },
            { id: 'e2', label: 'B', enabled: false },
          ],
          settings: { soundEnabled: false },
        },
      }),
    );
    expect(restored.data.entries[0]).toMatchObject({ color: '#123456', weight: 3 });
    expect(restored.data.entries[1].enabled).toBe(false);
    expect(restored.data.settings.soundEnabled).toBe(false);
    expect(restored.data.settings.spinDurationMs).toBe(DEFAULT_SETTINGS.spinDurationMs);
  });

  it('rejects non-positive weights', () => {
    const restored = tablet.deserializeState(
      JSON.stringify({
        type: 'spinthewheel',
        data: { entries: [{ label: 'A', weight: 0 }, { label: 'B', weight: -2 }] },
      }),
    );
    expect(restored.data.entries[0].weight).toBeUndefined();
    expect(restored.data.entries[1].weight).toBeUndefined();
  });
});
