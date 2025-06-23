// src/tablets/calculator/useCalculatorEngine.ts

import { useState, useCallback } from 'react';
import { evaluate } from 'mathjs';

// --- State Interface ---
export type CalculatorMode = 'standard' | 'scientific' | 'programmer';

export interface CalculatorData {
    mode: CalculatorMode;
    expression: string;
    display: string;
    history: { expression: string; result: string }[];
    notes: string;
    base: 'HEX' | 'DEC' | 'OCT' | 'BIN';
}

export interface CalculatorEngine {
    data: CalculatorData;
    handleInput: (input: string) => void;
    handleClear: () => void;
    handleBackspace: () => void;
    handleEquals: () => void;
    handleModeChange: (mode: CalculatorMode) => void;
    handleBaseChange: (base: 'HEX' | 'DEC' | 'OCT' | 'BIN') => void;
    handleHistoryClick: (entry: { expression: string; result: string }) => void;
    handleNotesChange: (notes: string) => void;
}

const formatDisplay = (value: any): string => {
    if (typeof value === 'number') {
        // Use toPrecision to avoid floating point inaccuracies and limit length
        return parseFloat(value.toPrecision(14)).toString();
    }
    return String(value);
};

export const useCalculatorEngine = (
    initialData: CalculatorData,
    onChange: (newData: CalculatorData) => void
): CalculatorEngine => {
    const updateData = useCallback((newData: Partial<CalculatorData>) => {
        onChange({ ...initialData, ...newData });
    }, [initialData, onChange]);

    const handleInput = useCallback((input: string) => {
        let newExpression = initialData.expression === '0' ? '' : initialData.expression;
        newExpression += input;
        updateData({ expression: newExpression, display: newExpression });
    }, [initialData.expression, updateData]);

    const handleClear = useCallback(() => {
        updateData({ expression: '0', display: '0' });
    }, [updateData]);

    const handleBackspace = useCallback(() => {
        if (initialData.expression.length <= 1) {
            updateData({ expression: '0', display: '0' });
        } else {
            const newExpression = initialData.expression.slice(0, -1);
            updateData({ expression: newExpression, display: newExpression });
        }
    }, [initialData.expression, updateData]);

    const handleEquals = useCallback(() => {
        try {
            const result = evaluate(initialData.expression);
            const formattedResult = formatDisplay(result);
            const newHistoryEntry = { expression: initialData.expression, result: formattedResult };
            
            updateData({
                display: formattedResult,
                expression: formattedResult, // The result becomes the new expression
                history: [newHistoryEntry, ...initialData.history].slice(0, 50),
            });
        } catch (error) {
            updateData({ display: 'Error', expression: '0' });
        }
    }, [initialData.expression, initialData.history, updateData]);

    const handleModeChange = useCallback((mode: CalculatorMode) => {
        updateData({ mode, expression: '0', display: '0' }); // Reset on mode change
    }, [updateData]);
    
    const handleBaseChange = useCallback((base: 'HEX' | 'DEC' | 'OCT' | 'BIN') => {
        updateData({ base });
    }, [updateData]);

    const handleHistoryClick = useCallback((entry: { expression: string; result: string }) => {
        updateData({ expression: entry.expression, display: entry.expression });
    }, [updateData]);

    const handleNotesChange = useCallback((notes: string) => {
        updateData({ notes });
    }, [updateData]);

    return {
        data: initialData,
        handleInput,
        handleClear,
        handleBackspace,
        handleEquals,
        handleModeChange,
        handleBaseChange,
        handleHistoryClick,
        handleNotesChange,
    };
};