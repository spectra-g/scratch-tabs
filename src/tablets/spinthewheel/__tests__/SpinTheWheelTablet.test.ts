import SpinTheWheelTablet from '../SpinTheWheelTablet';
import { DEFAULT_SETTINGS } from '../contentModel';
import type React from 'react';

describe('SpinTheWheelTablet interface', () => {
  describe('metadata', () => {
    it('has the correct id and label', () => {
      expect(SpinTheWheelTablet.id).toBe('spinthewheel');
      expect(SpinTheWheelTablet.label).toBe('Spin the Wheel');
    });

    it('includes relevant keywords', () => {
      expect(SpinTheWheelTablet.keywords).toContain('wheel');
      expect(SpinTheWheelTablet.keywords).toContain('raffle');
      expect(SpinTheWheelTablet.keywords).toContain('decision');
    });
  });

  describe('createInitialState', () => {
    it('creates valid default state with default entries', () => {
      const state = SpinTheWheelTablet.createInitialState();
      expect(state.type).toBe('spinthewheel');
      expect(state.data.entries.length).toBeGreaterThanOrEqual(2);
      expect(state.data.entries.every((e) => e.id && e.label && e.enabled)).toBe(true);
      expect(state.data.title).toBe('');
      expect(state.data.winnerHistory).toEqual([]);
      expect(state.data.snapshots).toEqual([]);
      expect(state.data.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('splits payload content into entries and uses payload title', () => {
      const state = SpinTheWheelTablet.createInitialState({
        content: 'Alice\nBob',
        title: 'Team standup',
      });
      expect(state.data.entries.map((e) => e.label)).toEqual(['Alice', 'Bob']);
      expect(state.data.title).toBe('Team standup');
    });

    it('falls back to defaults on empty payload content', () => {
      const state = SpinTheWheelTablet.createInitialState({ content: '' });
      expect(state.data.entries.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('serializeState / deserializeState', () => {
    it('round-trips state without loss', () => {
      const original = SpinTheWheelTablet.createInitialState({
        content: 'Alice\nBob\nCharlie',
        title: 'Prizes',
      });
      const restored = SpinTheWheelTablet.deserializeState(
        SpinTheWheelTablet.serializeState(original),
      );
      expect(restored.type).toBe('spinthewheel');
      expect(restored.data.entries.map((e) => e.label)).toEqual([
        'Alice',
        'Bob',
        'Charlie',
      ]);
      expect(restored.data.title).toBe('Prizes');
    });

    it('falls back to initial state on malformed JSON', () => {
      const state = SpinTheWheelTablet.deserializeState('{not json');
      expect(state.type).toBe('spinthewheel');
      expect(state.data.entries.length).toBeGreaterThanOrEqual(2);
    });

    it('falls back on wrong tablet type', () => {
      const state = SpinTheWheelTablet.deserializeState(
        JSON.stringify({ type: 'qrcode', data: {} }),
      );
      expect(state.type).toBe('spinthewheel');
    });
  });

  describe('render', () => {
    it('returns a React element for the UI', () => {
      const state = SpinTheWheelTablet.createInitialState();
      const element = SpinTheWheelTablet.render(state, jest.fn());
      expect(element).toBeTruthy();
      expect((element as React.ReactElement).props.state).toBe(state);
      expect(typeof (element as React.ReactElement).props.onChange).toBe('function');
    });
  });
});
