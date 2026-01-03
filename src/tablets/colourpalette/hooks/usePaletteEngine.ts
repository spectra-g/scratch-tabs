import { useReducer, useCallback, useEffect } from 'react';
import { ColorInfo } from '../types';
import { createColorInfo, generateRandomPalette, generateColorHarmony } from '../utils/colourUtils';

interface PaletteState {
    colors: ColorInfo[];
    past: ColorInfo[][];
    future: ColorInfo[][];
}

type PaletteAction =
    | { type: 'GENERATE'; harmonyType?: string }
    | { type: 'UPDATE_COLOR'; id: string; hex: string }
    | { type: 'TOGGLE_LOCK'; id: string }
    | { type: 'MOVE_COLOR'; fromIndex: number; toIndex: number }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'SET_PALETTE'; colors: ColorInfo[] };

const MAX_HISTORY = 50;

function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
    switch (action.type) {
        case 'GENERATE': {
            const currentCount = state.colors.length;
            const targetCount = Math.max(currentCount, 5);
            const lockedColors = state.colors.filter((c) => c.isLocked);
            let newColors: ColorInfo[];

            const generateRandomHex = () => {
                const hex = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                return `#${hex}`;
            };

            if (lockedColors.length > 0) {
                // Use the first locked color as base for harmony
                const baseColor = lockedColors[0].hex;
                const harmonyType = (action.harmonyType as any) || 'analogous';
                const generated = generateColorHarmony({
                    type: harmonyType,
                    baseColor,
                    variations: Math.max(targetCount, 8), // Generate enough variations
                });

                // Map generated colors to unlocked slots, and fill up to targetCount
                let genIdx = 1; // skip base
                newColors = [];

                // First pass: fill existing slots
                state.colors.forEach((c) => {
                    if (c.isLocked) {
                        newColors.push(c);
                    } else if (genIdx < generated.length) {
                        newColors.push({ ...generated[genIdx++], id: c.id });
                    } else {
                        newColors.push(createColorInfo(generateRandomHex()));
                    }
                });

                // Second pass: add new slots if below targetCount
                while (newColors.length < targetCount) {
                    if (genIdx < generated.length) {
                        newColors.push(generated[genIdx++]);
                    } else {
                        newColors.push(createColorInfo(generateRandomHex()));
                    }
                }
            } else {
                newColors = generateRandomPalette(targetCount).map((nc, idx) => ({
                    ...nc,
                    id: state.colors[idx]?.id || nc.id,
                }));
            }

            return {
                ...state,
                past: [state.colors, ...state.past].slice(0, MAX_HISTORY),
                colors: newColors,
                future: [],
            };
        }

        case 'UPDATE_COLOR': {
            const newColors = state.colors.map((c) =>
                c.id === action.id ? { ...createColorInfo(action.hex), id: c.id, isLocked: c.isLocked } : c
            );
            return {
                ...state,
                past: [state.colors, ...state.past].slice(0, MAX_HISTORY),
                colors: newColors,
                future: [],
            };
        }

        case 'TOGGLE_LOCK': {
            return {
                ...state,
                colors: state.colors.map((c) => (c.id === action.id ? { ...c, isLocked: !c.isLocked } : c)),
            };
        }

        case 'MOVE_COLOR': {
            const newColors = [...state.colors];
            const [removed] = newColors.splice(action.fromIndex, 1);
            newColors.splice(action.toIndex, 0, removed);
            return {
                ...state,
                past: [state.colors, ...state.past].slice(0, MAX_HISTORY),
                colors: newColors,
                future: [],
            };
        }

        case 'UNDO': {
            if (state.past.length === 0) return state;
            const [previous, ...remainingPast] = state.past;
            return {
                past: remainingPast,
                colors: previous,
                future: [state.colors, ...state.future],
            };
        }

        case 'REDO': {
            if (state.future.length === 0) return state;
            const [next, ...remainingFuture] = state.future;
            return {
                past: [state.colors, ...state.past],
                colors: next,
                future: remainingFuture,
            };
        }

        case 'SET_PALETTE': {
            return {
                ...state,
                past: [state.colors, ...state.past].slice(0, MAX_HISTORY),
                colors: action.colors,
                future: [],
            };
        }

        default:
            return state;
    }
}

export function usePaletteEngine(initialColors: ColorInfo[]) {
    const [state, dispatch] = useReducer(paletteReducer, {
        colors: initialColors,
        past: [],
        future: [],
    });

    const generate = useCallback((harmonyType?: string) => dispatch({ type: 'GENERATE', harmonyType }), []);
    const updateColor = useCallback((id: string, hex: string) => dispatch({ type: 'UPDATE_COLOR', id, hex }), []);
    const toggleLock = useCallback((id: string) => dispatch({ type: 'TOGGLE_LOCK', id }), []);
    const moveColor = useCallback((fromIndex: number, toIndex: number) => dispatch({ type: 'MOVE_COLOR', fromIndex, toIndex }), []);
    const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
    const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
    const setPalette = useCallback((colors: ColorInfo[]) => dispatch({ type: 'SET_PALETTE', colors }), []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
                e.preventDefault();
                generate();
            } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [generate, undo, redo]);

    return {
        colors: state.colors,
        canUndo: state.past.length > 0,
        canRedo: state.future.length > 0,
        generate,
        updateColor,
        toggleLock,
        moveColor,
        undo,
        redo,
        setPalette,
    };
}
