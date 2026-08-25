import type { WheelEntry } from '../../types';
import { createSnapshot } from '../snapshotModel';

const entry: WheelEntry = { id: 'e1', label: 'Alice', enabled: true };

describe('createSnapshot', () => {
  it('captures the name, entries, and creation time', () => {
    const snapshot = createSnapshot('Class 5B', [entry], 1234);
    expect(snapshot).toMatchObject({
      id: expect.any(String),
      name: 'Class 5B',
      createdAt: 1234,
    });
    expect(snapshot.entries).toEqual([entry]);
  });

  it('defensively copies entries so later mutations cannot leak in', () => {
    const entries = [{ ...entry }];
    const snapshot = createSnapshot('W', entries);
    entries[0].label = 'Hacked';
    expect(snapshot.entries[0].label).toBe('Alice');
    expect(snapshot.entries[0]).not.toBe(entries[0]);
  });

  it('generates unique ids across snapshots', () => {
    const a = createSnapshot('A', []);
    const b = createSnapshot('B', [], a.createdAt);
    expect(a.id).not.toBe(b.id);
  });
});
