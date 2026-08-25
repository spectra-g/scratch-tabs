import { act, renderHook } from '@testing-library/react';
import { useSpin } from '../useSpin';
import type { WheelEntry } from '../../types';
import { sliceIndexAtRotation } from '../../utils/spinMath';

type Frame = (now: number) => void;

const entries = (labels: string[]): WheelEntry[] =>
  labels.map((label) => ({ id: label, label, enabled: true }));

describe('useSpin', () => {
  let rafCallbacks: Map<number, Frame>;
  let nextRafId: number;
  let now: number;

  const installFakeRaf = () => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: Frame) => {
      nextRafId += 1;
      rafCallbacks.set(nextRafId, cb);
      return nextRafId;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafCallbacks.delete(id);
    });
    jest.spyOn(performance, 'now').mockImplementation(() => now);
  };

  beforeEach(() => {
    rafCallbacks = new Map();
    nextRafId = 0;
    now = 0;
    installFakeRaf();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /** Flushes every currently queued animation frame, advancing the clock. */
  const advanceFrames = (stepMs: number) => {
    now += stepMs;
    const pending = [...rafCallbacks.values()];
    rafCallbacks.clear();
    pending.forEach((frame) =>
      act(() => {
        frame(now);
      }),
    );
  };

  const runFullSpin = (durationMs: number, stepMs = 50) => {
    const elapsedSteps = Math.ceil(durationMs / stepMs) + 2;
    for (let i = 0; i < elapsedSteps && rafCallbacks.size > 0; i += 1) {
      advanceFrames(stepMs);
    }
  };

  it('starts idle with no winner', () => {
    const { result } = renderHook(() =>
      useSpin({ entries: entries(['A', 'B']), durationMs: 1000 }),
    );
    expect(result.current.phase).toBe('idle');
    expect(result.current.winner).toBeNull();
    expect(result.current.rotationDeg).toBe(0);
  });

  it('does nothing when there are no entries', () => {
    const { result } = renderHook(() => useSpin({ entries: [], durationMs: 1000 }));
    act(() => result.current.spin());
    expect(result.current.phase).toBe('idle');
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('moves through spinning → result and reports the drawn winner', () => {
    // rng = 0.9999 over uniform weights of 3 → index 2 ("C").
    const { result } = renderHook(() =>
      useSpin({ entries: entries(['A', 'B', 'C']), durationMs: 1000, rng: () => 0.9999 }),
    );

    act(() => result.current.spin());
    expect(result.current.phase).toBe('spinning');
    expect(result.current.winner).toBeNull();

    runFullSpin(1000);

    expect(result.current.phase).toBe('result');
    expect(result.current.winner?.label).toBe('C');
  });

  it('lands on the winning slice under the pointer (visual honesty)', () => {
    const { result } = renderHook(() =>
      useSpin({
        entries: entries(['A', 'B', 'C', 'D', 'E']),
        durationMs: 2000,
        rng: () => 0.3,
      }),
    );

    act(() => result.current.spin());
    runFullSpin(2000);

    const winnerIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(result.current.winner!.label);
    expect(sliceIndexAtRotation(result.current.rotationDeg, 5)).toBe(winnerIndex);
  });

  it('animates rotation monotonically forward', () => {
    const rotations: number[] = [];
    const { result } = renderHook(() =>
      useSpin({ entries: entries(['A', 'B']), durationMs: 1000, rng: () => 0.5 }),
    );

    act(() => result.current.spin());
    while (rafCallbacks.size > 0 && rotations.length < 500) {
      advanceFrames(40);
      rotations.push(result.current.rotationDeg);
    }

    for (let i = 1; i < rotations.length; i += 1) {
      expect(rotations[i]).toBeGreaterThanOrEqual(rotations[i - 1]);
    }
    expect(Math.max(...rotations)).toBeGreaterThan(4 * 360);
  });

  it('ignores spin clicks while already spinning', () => {
    const { result } = renderHook(() =>
      useSpin({ entries: entries(['A', 'B']), durationMs: 2000 }),
    );

    act(() => result.current.spin());
    advanceFrames(50);
    const rafCallsAfterFirstSpin = window.requestAnimationFrame.mock.calls.length;

    act(() => result.current.spin());
    expect(result.current.phase).toBe('spinning');
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(rafCallsAfterFirstSpin);

    runFullSpin(2000);
    expect(result.current.phase).toBe('result');
  });

  it('calls onSpinEnd exactly once with the winner', () => {
    const onSpinEnd = jest.fn();
    const list = entries(['A', 'B']);
    const { result } = renderHook(() =>
      useSpin({ entries: list, durationMs: 1000, rng: () => 0.99, onSpinEnd }),
    );

    act(() => result.current.spin());
    runFullSpin(1000);

    expect(onSpinEnd).toHaveBeenCalledTimes(1);
    expect(onSpinEnd).toHaveBeenCalledWith(list[1]);
  });

  it('fires onTick as slices pass the pointer', () => {
    const onTick = jest.fn();
    const { result } = renderHook(() =>
      useSpin({ entries: entries(['A', 'B', 'C', 'D']), durationMs: 1500, onTick }),
    );

    act(() => result.current.spin());
    runFullSpin(1500);

    expect(onTick.mock.calls.length).toBeGreaterThan(0);
  });

  it('honours an explicit entry override (remove-winner-then-respin)', () => {
    // First draw picks "B" (rng 0.99), then a re-spin with only "A" left.
    const rolls = [0.99];
    const { result } = renderHook(() =>
      useSpin({ entries: entries(['A', 'B']), durationMs: 500, rng: () => rolls.shift()! }),
    );

    act(() => result.current.spin());
    runFullSpin(500);
    expect(result.current.winner?.label).toBe('B');

    act(() => result.current.spin([entries(['A'])[0]]));
    runFullSpin(500);
    expect(result.current.winner?.label).toBe('A');
  });

  it('reset returns to idle and clears the winner', () => {
    const { result } = renderHook(() =>
      useSpin({ entries: entries(['A', 'B']), durationMs: 1000 }),
    );

    act(() => result.current.spin());
    runFullSpin(1000);
    expect(result.current.phase).toBe('result');

    act(() => result.current.reset());
    expect(result.current.phase).toBe('idle');
    expect(result.current.winner).toBeNull();
  });

  it('cancels the animation frame on unmount', () => {
    const { result, unmount } = renderHook(() =>
      useSpin({ entries: entries(['A', 'B']), durationMs: 5000 }),
    );

    act(() => result.current.spin());
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
