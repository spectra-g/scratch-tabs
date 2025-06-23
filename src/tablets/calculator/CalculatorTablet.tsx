import React from 'react';
import { Tablet, TabletState } from '../types';
import { CalculatorData, useCalculatorEngine } from './useCalculatorEngine';
import { CalculatorUI } from './CalculatorUI';

interface CalculatorTabletState extends TabletState {
    type: 'calculator';
    data: CalculatorData;
}

// Separate React component for Calculator tablet UI
const CalculatorTabletUI: React.FC<{
    state: CalculatorTabletState;
    onChange: (state: CalculatorTabletState) => void;
    tabletId: string;
}> = ({ state, onChange, tabletId }) => {
    const { data } = state;

    // Helper to update state immutably
    const updateData = (newData: CalculatorData) => {
        onChange({ ...state, data: newData });
    };

    const engine = useCalculatorEngine(data, updateData);

    return <CalculatorUI engine={engine} tabletId={tabletId} />;
};

// Wrapper component to handle stable ID generation
const CalculatorTabletWrapper: React.FC<{
    state: CalculatorTabletState;
    onChange: (state: CalculatorTabletState) => void;
}> = ({ state, onChange }) => {
    const tabletInstanceId = React.useMemo(() => `calculator-${crypto.randomUUID()}`, []);
    return <CalculatorTabletUI state={state} onChange={onChange} tabletId={tabletInstanceId} />;
};

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
                // Ensure all required properties exist with proper defaults
                const data = parsed.data;
                return {
                    type: 'calculator',
                    data: {
                        display: data.display || '0',
                        currentOperand: data.currentOperand || '0',
                        previousOperand: data.previousOperand || null,
                        operation: data.operation || null,
                        overwrite: data.overwrite || false,
                        history: Array.isArray(data.history) ? data.history : [],
                        notes: data.notes || '',
                        lastOperationForRepeat: data.lastOperationForRepeat || null,
                        lastOperandForRepeat: data.lastOperandForRepeat || null,
                    }
                };
            }
        } catch (e) {
            console.error("Failed to deserialize calculator state:", e);
        }
        // Return default state on error
        return CalculatorTablet.createInitialState();
    },

    render(state: CalculatorTabletState, onChange) {
        return <CalculatorTabletWrapper state={state} onChange={onChange} />;
    },
};