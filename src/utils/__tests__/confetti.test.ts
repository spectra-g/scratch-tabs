import { fireCelebrationConfetti } from '../confetti';

jest.mock('canvas-confetti', () => jest.fn());

import confetti from 'canvas-confetti';
const mockConfetti = confetti as jest.Mock;

describe('fireCelebrationConfetti', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockConfetti.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires bursts from both sides on each interval tick', () => {
    fireCelebrationConfetti();
    jest.advanceTimersByTime(250);
    expect(mockConfetti).toHaveBeenCalledTimes(2);
    const [left, right] = mockConfetti.mock.calls.map((call) => call[0]);
    expect(left.origin.x).toBeLessThan(0.3);
    expect(right.origin.x).toBeGreaterThan(0.7);
    // Must render above modals.
    expect(left.zIndex).toBeGreaterThanOrEqual(100);
  });

  it('stops firing once the duration elapses', () => {
    fireCelebrationConfetti(1000);
    jest.advanceTimersByTime(1000);
    const callsAtEnd = mockConfetti.mock.calls.length;
    jest.advanceTimersByTime(2000);
    expect(mockConfetti.mock.calls.length).toBe(callsAtEnd);
  });

  it('stops early when the returned handle is used', () => {
    const celebration = fireCelebrationConfetti();
    jest.advanceTimersByTime(250);
    celebration.stop();
    const callsAtStop = mockConfetti.mock.calls.length;
    jest.advanceTimersByTime(5000);
    expect(mockConfetti.mock.calls.length).toBe(callsAtStop);
  });

  it('stop() is idempotent', () => {
    const celebration = fireCelebrationConfetti();
    celebration.stop();
    expect(() => celebration.stop()).not.toThrow();
  });
});
