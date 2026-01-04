import { renderHook, act } from '@testing-library/react';
import { usePaletteEngine } from '../usePaletteEngine';
import { createColorInfo } from '../../utils/colourUtils';

const mockColors = [
    '#FF0000',
    '#00FF00',
    '#0000FF',
].map(createColorInfo);

describe('usePaletteEngine', () => {
    it('should initialize with provided colors', () => {
        const { result } = renderHook(() => usePaletteEngine(mockColors));
        expect(result.current.colors).toEqual(mockColors);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it('should toggle lock on a color', () => {
        const { result } = renderHook(() => usePaletteEngine(mockColors));
        const targetId = mockColors[0].id;

        act(() => {
            result.current.toggleLock(targetId);
        });

        expect(result.current.colors[0].isLocked).toBe(true);

        act(() => {
            result.current.toggleLock(targetId);
        });

        expect(result.current.colors[0].isLocked).toBe(false);
    });

    it('should update a color and add to history', () => {
        const { result } = renderHook(() => usePaletteEngine(mockColors));
        const targetId = mockColors[1].id;
        const newHex = '#ABCDEF';

        act(() => {
            result.current.updateColor(targetId, newHex);
        });

        expect(result.current.colors[1].hex).toBe(newHex);
        expect(result.current.canUndo).toBe(true);
    });

    it('should undo and redo changes', () => {
        const { result } = renderHook(() => usePaletteEngine(mockColors));
        const targetId = mockColors[0].id;
        const originalHex = mockColors[0].hex;
        const newHex = '#123456';

        act(() => {
            result.current.updateColor(targetId, newHex);
        });

        expect(result.current.colors[0].hex).toBe(newHex);

        act(() => {
            result.current.undo();
        });

        expect(result.current.colors[0].hex).toBe(originalHex);
        expect(result.current.canRedo).toBe(true);

        act(() => {
            result.current.redo();
        });

        expect(result.current.colors[0].hex).toBe(newHex);
    });

    it('should not change locked colors during generation', () => {
        const { result } = renderHook(() => usePaletteEngine(mockColors));
        const lockedId = mockColors[0].id;
        const lockedHex = mockColors[0].hex;

        act(() => {
            result.current.toggleLock(lockedId);
        });

        act(() => {
            result.current.generate();
        });

        expect(result.current.colors[0].id).toBe(lockedId);
        expect(result.current.colors[0].hex).toBe(lockedHex);
        // Unlocked colors should have changed
        expect(result.current.colors[1].hex).not.toBe(mockColors[1].hex);
    });

    it('should move colors correctly', () => {
        const { result } = renderHook(() => usePaletteEngine(mockColors));
        const firstId = mockColors[0].id;

        act(() => {
            result.current.moveColor(0, 1);
        });

        expect(result.current.colors[1].id).toBe(firstId);
        expect(result.current.canUndo).toBe(true);
    });

    it('should ensure all colors have # prefix during generation', () => {
        const { result } = renderHook(() => usePaletteEngine(mockColors));

        act(() => {
            result.current.generate();
        });

        result.current.colors.forEach(color => {
            expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
        });
    });

    it('should expand palette to at least 5 colors during generation', () => {
        const smallPalette = ['#FF0000', '#00FF00', '#0000FF'].map(createColorInfo);
        const { result } = renderHook(() => usePaletteEngine(smallPalette));

        expect(result.current.colors.length).toBe(3);

        act(() => {
            result.current.generate();
        });

        expect(result.current.colors.length).toBe(Math.max(3, 5));
        expect(result.current.colors.length).toBe(5);
    });
});
