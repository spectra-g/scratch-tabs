import {
  coerceSettings,
  createDefaultData,
  createEntryId,
  DEFAULT_SETTINGS,
  entriesToText,
  parseEntriesText,
  SPIN_DURATION_PRESETS,
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

  describe('with previous entries (attribute carry-over)', () => {
    const previous = [
      { id: 'p1', label: 'Alice', color: '#ff0000', weight: 3, enabled: false },
      { id: 'p2', label: 'Bob', enabled: true },
    ];

    it('carries id, color, weight, and enabled through unchanged labels', () => {
      const entries = parseEntriesText('Bob\nAlice', previous);
      expect(entries[0]).toMatchObject({ id: 'p2', label: 'Bob', enabled: true });
      expect(entries[1]).toMatchObject({
        id: 'p1',
        label: 'Alice',
        color: '#ff0000',
        weight: 3,
        enabled: false,
      });
    });

    it('creates fresh entries for new labels only', () => {
      const entries = parseEntriesText('Alice\nCarol', previous);
      expect(entries[0].id).toBe('p1');
      expect(entries[1].id).not.toBe('p1');
      expect(entries[1].id).not.toBe('p2');
      expect(entries[1].enabled).toBe(true);
    });

    it('matches labels after trimming', () => {
      const entries = parseEntriesText('  Alice  ', previous);
      expect(entries[0].id).toBe('p1');
    });

    it('works without previous entries as before', () => {
      const entries = parseEntriesText('Alice');
      expect(entries[0].id).toBeTruthy();
      expect(entries[0].enabled).toBe(true);
    });
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

describe('coerceSettings', () => {
  it('returns defaults for missing or non-object input', () => {
    expect(coerceSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(coerceSettings('junk')).toEqual(DEFAULT_SETTINGS);
  });

  it.each([
    ['soundEnabled', 'soundEnabled'],
    ['removeWinnerAfterSpin', 'removeWinnerAfterSpin'],
    ['hideWinnerUntilClick', 'hideWinnerUntilClick'],
  ] as const)('sanitizes %s to a strict boolean', (field) => {
    expect(coerceSettings({ [field]: true })[field]).toBe(true);
    expect(coerceSettings({ [field]: false })[field]).toBe(false);
    expect(coerceSettings({ [field]: 'yes' })[field]).toBe(false);
    expect(coerceSettings({ [field]: 1 })[field]).toBe(false);
  });

  it('keeps defaults for fields that are absent', () => {
    const settings = coerceSettings({});
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it.each(SPIN_DURATION_PRESETS.map((p) => [p.id, p.ms] as const))(
    'snaps duration to the nearest preset (%s)',
    (_id, ms) => {
      expect(coerceSettings({ spinDurationMs: ms }).spinDurationMs).toBe(ms);
    },
  );

  it('clamps unknown durations to the nearest preset value', () => {
    const fast = SPIN_DURATION_PRESETS.find((p) => p.id === 'fast')!.ms;
    const normal = SPIN_DURATION_PRESETS.find((p) => p.id === 'normal')!.ms;
    expect(coerceSettings({ spinDurationMs: fast + 100 }).spinDurationMs).toBe(fast);
    // Midpoint between fast and normal rounds down to the earlier preset.
    expect(coerceSettings({ spinDurationMs: (fast + normal) / 2 }).spinDurationMs).toBe(fast);
  });

  it('falls back to default duration for NaN/garbage numbers', () => {
    expect(coerceSettings({ spinDurationMs: NaN }).spinDurationMs).toBe(
      DEFAULT_SETTINGS.spinDurationMs,
    );
    expect(coerceSettings({ spinDurationMs: 'fast' }).spinDurationMs).toBe(
      DEFAULT_SETTINGS.spinDurationMs,
    );
  });
});
