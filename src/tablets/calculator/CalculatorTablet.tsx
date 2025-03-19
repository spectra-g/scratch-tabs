import React from 'react';
import { Tablet, TabletState } from '../types';
import { Calculator, Delete, RotateCw } from 'lucide-react';

interface CalculatorTabletState extends TabletState {
    type: 'calculator';
    data: {
        display: string;
        history: string[];
        notes: string;
        lastOperation: {
            operator: string;
            operand: string;
        } | null;
    };
}

const CalculatorButton: React.FC<{
    value: string;
    onClick: () => void;
    variant?: 'default' | 'operator' | 'action';
    size?: 'normal' | 'wide';
}> = ({ value, onClick, variant = 'default', size = 'normal' }) => (
    <button
        onClick={onClick}
        className={`
      ${size === 'wide' ? 'col-span-2' : ''}
      ${variant === 'operator'
            ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/50'
            : variant === 'action'
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/50'
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-200 border-gray-700/50'}
      border rounded-lg p-4 text-xl font-medium transition-colors
      active:scale-95 transform duration-100
    `}
    >
        {value}
    </button>
);

export const CalculatorTablet: Tablet = {
    id: 'calculator',
    label: 'Calculator',
    keywords: ['calculator', 'math', 'compute'],

    createInitialState(): CalculatorTabletState {
        return {
            type: 'calculator',
            data: {
                display: '0',
                history: [],
                notes: '',
                lastOperation: null
            },
        };
    },

    serializeState(state: TabletState): string {
        return JSON.stringify(state);
    },

    deserializeState(json: string): TabletState {
        return JSON.parse(json);
    },

    render(state: CalculatorTabletState, onChange) {
        const updateDisplay = (newDisplay: string) => {
            onChange({
                ...state,
                data: { ...state.data, display: newDisplay }
            });
        };

        const addToHistory = (entry: string) => {
            onChange({
                ...state,
                data: {
                    ...state.data,
                    history: [...state.data.history, entry].slice(-10) // Keep last 10 entries
                }
            });
        };

        const handleNumber = (num: string) => {
            const display = state.data.display;
            if (display === '0') {
                updateDisplay(num);
            } else {
                updateDisplay(display + num);
            }
        };

        const handleOperator = (op: string) => {
            const display = state.data.display;
            const lastChar = display[display.length - 1];

            if (['+', '-', '*', '/', '.'].includes(lastChar)) {
                updateDisplay(display.slice(0, -1) + op);
            } else {
                updateDisplay(display + op);
            }
        };

        const handleDecimal = () => {
            const display = state.data.display;
            const parts = display.split(/[-+*/]/);
            const lastNumber = parts[parts.length - 1];

            if (!lastNumber.includes('.')) {
                updateDisplay(display + '.');
            }
        };

        const handleDelete = () => {
            const display = state.data.display;
            if (display.length === 1) {
                updateDisplay('0');
            } else {
                updateDisplay(display.slice(0, -1));
            }
        };

        const handleClear = () => {
            onChange({
                ...state,
                data: {
                    ...state.data,
                    display: '0',
                    lastOperation: null
                }
            });
        };

        const handleEquals = () => {
            try {
                const display = state.data.display;
                // Replace × with * and ÷ with /
                const expression = display.replace(/×/g, '*').replace(/÷/g, '/');

                let result: number;
                let historyEntry: string;

                if (state.data.lastOperation && !expression.includes('+') &&
                    !expression.includes('-') && !expression.includes('*') &&
                    !expression.includes('/')) {
                    // If we have a last operation and current display is just a number,
                    // apply the last operation
                    const { operator, operand } = state.data.lastOperation;
                    const newExpression = `${expression}${operator}${operand}`;
                    result = new Function('return ' + newExpression)();
                    historyEntry = `${expression}${operator}${operand} = ${result}`;
                } else {
                    // Normal calculation
                    result = new Function('return ' + expression)();
                    historyEntry = `${display} = ${result}`;

                    // Store last operation if this was a binary operation
                    const match = expression.match(/([0-9.]+)\s*([-+*/])\s*([0-9.]+)$/);
                    if (match) {
                        const [, , operator, operand] = match;
                        onChange({
                            ...state,
                            data: {
                                ...state.data,
                                display: result.toString(),
                                history: [...state.data.history, historyEntry].slice(-10),
                                lastOperation: { operator, operand }
                            }
                        });
                        return;
                    }
                }

                const formatted = Number.isInteger(result)
                    ? result.toString()
                    : result.toFixed(8).replace(/\.?0+$/, '');

                onChange({
                    ...state,
                    data: {
                        ...state.data,
                        display: formatted,
                        history: [...state.data.history, historyEntry].slice(-10)
                    }
                });
            } catch (e) {
                updateDisplay('Error');
                setTimeout(() => updateDisplay('0'), 1000);
            }
        };

        return (
            <div className="flex h-full bg-gray-900">
                <div className="w-7/12 p-6 border-r border-gray-700/50">
                    <div className="flex items-center space-x-3 mb-6">
                        <Calculator className="text-gray-400" size={24} />
                        <h2 className="text-xl font-semibold text-gray-100">Calculator</h2>
                    </div>

                    {/* Display */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-6">
                        <div className="font-mono text-right text-3xl text-gray-100 overflow-x-auto whitespace-nowrap">
                            {state.data.display}
                        </div>
                    </div>

                    {/* Keypad */}
                    <div className="grid grid-cols-4 gap-2">
                        {/* First row */}
                        <CalculatorButton value="C" onClick={handleClear} variant="action" />
                        <CalculatorButton value="(" onClick={() => handleNumber('(')} />
                        <CalculatorButton value=")" onClick={() => handleNumber(')')} />
                        <CalculatorButton value="÷" onClick={() => handleOperator('/')} variant="operator" />

                        {/* Second row */}
                        <CalculatorButton value="7" onClick={() => handleNumber('7')} />
                        <CalculatorButton value="8" onClick={() => handleNumber('8')} />
                        <CalculatorButton value="9" onClick={() => handleNumber('9')} />
                        <CalculatorButton value="×" onClick={() => handleOperator('*')} variant="operator" />

                        {/* Third row */}
                        <CalculatorButton value="4" onClick={() => handleNumber('4')} />
                        <CalculatorButton value="5" onClick={() => handleNumber('5')} />
                        <CalculatorButton value="6" onClick={() => handleNumber('6')} />
                        <CalculatorButton value="-" onClick={() => handleOperator('-')} variant="operator" />

                        {/* Fourth row */}
                        <CalculatorButton value="1" onClick={() => handleNumber('1')} />
                        <CalculatorButton value="2" onClick={() => handleNumber('2')} />
                        <CalculatorButton value="3" onClick={() => handleNumber('3')} />
                        <CalculatorButton value="+" onClick={() => handleOperator('+')} variant="operator" />

                        {/* Fifth row */}
                        <CalculatorButton value="0" onClick={() => handleNumber('0')} size="wide" />
                        <CalculatorButton value="." onClick={handleDecimal} />
                        <CalculatorButton value="=" onClick={handleEquals} variant="operator" />
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-between mt-4">
                        <button
                            onClick={handleDelete}
                            className="flex items-center space-x-2 px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                            <Delete size={16} />
                            <span>Delete</span>
                        </button>
                        <button
                            onClick={handleClear}
                            className="flex items-center space-x-2 px-3 py-2 text-gray-400 hover:bg-gray-700/50 rounded-lg transition-colors"
                        >
                            <RotateCw size={16} />
                            <span>Clear All</span>
                        </button>
                    </div>
                </div>

                <div className="w-5/12 p-6 flex flex-col">
                    {/* History */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-200 mb-3">History</h3>
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 hover:scrollbar-thumb-gray-500">
                            {state.data.history.length === 0 ? (
                                <div className="text-gray-500 text-sm">No calculations yet</div>
                            ) : (
                                <div className="space-y-2">
                                    {state.data.history.map((entry, i) => (
                                        <div key={i} className="font-mono text-sm text-gray-300">{entry}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-200 mb-3">Notes</h3>
                        <textarea
                            value={state.data.notes}
                            onChange={(e) => onChange({
                                ...state,
                                data: { ...state.data, notes: e.target.value }
                            })}
                            className="w-full h-[calc(100%-2rem)] bg-gray-800/50 border border-gray-700/50 p-3 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50 hover:scrollbar-thumb-gray-500"
                            placeholder="Add notes..."
                        />
                    </div>
                </div>
            </div>
        );
    },
};