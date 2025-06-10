import React from 'react';
import { Tablet, TabletState } from '../types';
import { CalculatorData, useCalculatorEngine } from './useCalculatorEngine';
import { CalculatorUI } from './CalculatorUI';

interface CalculatorTabletState extends TabletState {
    type: 'calculator';
    data: CalculatorData;
}

// --- Main Tablet Logic ---
export const CalculatorTablet: Tablet = {
    id: 'calculator',
    label: 'Calculator',
    keywords: ['calculator', 'math', 'compute', 'numbers'],

    createInitialState(): CalculatorTabletState {
        return {
            type: 'calculator',
            data: {
                display: '0',
                currentOperand: '0',
                previousOperand: null,
                operation: null,
                overwrite: false,
                history: [],
                notes: '',
                lastOperationForRepeat: null,
                lastOperandForRepeat: null,
            },
        };
    },

    serializeState(state: TabletState): string {
        return JSON.stringify(state);
    },

    deserializeState(json: string): TabletState {
        try {
            const parsed = JSON.parse(json);
            // Add basic validation/migration if needed in the future
            if (parsed.type === 'calculator' && parsed.data) {
                 parsed.data.lastOperationForRepeat = parsed.data.lastOperationForRepeat || null;
                 parsed.data.lastOperandForRepeat = parsed.data.lastOperandForRepeat || null;
                 return parsed;
            }
        } catch (e) {
            console.error("Failed to deserialize calculator state:", e);
        }
        // Return default state on error
        return CalculatorTablet.createInitialState();
    },

    render(state: CalculatorTabletState, onChange) {
        const { data } = state;

        // Helper to update state immutably
        const updateData = (newData: CalculatorData) => {
            onChange({ ...state, data: newData });
        };

        const engine = useCalculatorEngine(data, updateData);

        return <CalculatorUI engine={engine} />;
    },
};