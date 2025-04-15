import React, { useCallback } from 'react';
import { Tablet, TabletState } from '../types';
import { Calculator, History, StickyNote, Delete, Percent, Divide, X as MultiplyIcon, Minus, Plus, Equal, Dot } from 'lucide-react';
import { format } from 'mathjs'; // Import mathjs

// --- State Interface ---
interface CalculatorData {
    display: string;        // What the user sees
    currentOperand: string | null; // The number currently being entered or result
    previousOperand: string | null; // The operand before the operator
    operation: string | null;     // The pending operation (+, -, *, /)
    overwrite: boolean;     // Should next number overwrite display (after equals/op)?
    history: string[];
    notes: string;
    lastOperationForRepeat: string | null;
    lastOperandForRepeat: string | null;
}

interface CalculatorTabletState extends TabletState {
    type: 'calculator';
    data: CalculatorData;
}

// --- Button Component (Refined Styling) ---
const CalculatorButton: React.FC<{
    value: string | React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'operator' | 'action' | 'equals';
    className?: string; // Allow additional classes
    ariaLabel?: string;
}> = ({ value, onClick, variant = 'default', className = '', ariaLabel }) => {
    const baseStyle = `
      border rounded-lg p-3 text-lg font-medium transition-all duration-100 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
      active:scale-95 active:brightness-90 transform
    `;

    let variantStyle = '';
    switch (variant) {
        case 'operator':
            variantStyle = 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/50 focus:ring-blue-500';
            break;
        case 'action':
            // Make action buttons slightly less prominent than operators maybe
            variantStyle = 'bg-gray-600/60 hover:bg-gray-500/60 text-gray-200 border-gray-600/50 focus:ring-gray-400';
            break;
        case 'equals':
             // Standard size now, but distinct color
            variantStyle = 'bg-green-500/30 hover:bg-green-500/40 text-green-300 border-green-500/50 focus:ring-green-500';
            break;
        default: // 'default'
            variantStyle = 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-100 border-gray-600/50 focus:ring-gray-500';
            break;
    }
     return (
        <button
            onClick={onClick}
            className={`${baseStyle} ${variantStyle} ${className}`}
            aria-label={ariaLabel || (typeof value === 'string' ? value : undefined)}
        >
            {value}
        </button>
    );
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
        const updateData = (newData: Partial<CalculatorData>) => {
            onChange({ ...state, data: { ...data, ...newData } });
        };

        // --- Clear Repeat State Helper ---
        const clearRepeatState = (): Partial<CalculatorData> => ({
            lastOperationForRepeat: null,
            lastOperandForRepeat: null,
        });

        // --- Calculation Logic (Modified for Repeat) ---
        const performCalculation = useCallback((
            op: string | null,
            prev: string | null,
            curr: string | null
        ): string | null => {
            if (op && prev && curr) {
                try {
                    const prevNum = parseFloat(prev);
                    const currNum = parseFloat(curr);
                    let result: number;

                    switch (op) {
                        case '+': result = prevNum + currNum; break;
                        case '-': result = prevNum - currNum; break;
                        case '*': result = prevNum * currNum; break;
                        case '/':
                            if (currNum === 0) throw new Error("Division by zero");
                            result = prevNum / currNum;
                            break;
                        default: throw new Error("Invalid operation");
                    }
                    return format(result, { precision: 14 });
                } catch (error: any) {
                    console.error("Calculation Error:", error);
                    return "Error";
                }
            }
            return curr; // Return current if no calculation needed/possible
        }, []);


        // --- Event Handlers ---
        const handleNumber = (num: string) => {
            let newCurrentOperand: string;
            const clearRepeat = clearRepeatState(); // Clear repeat state on new number input

            if (data.overwrite || data.currentOperand === '0' || data.currentOperand === null) {
                newCurrentOperand = num;
            } else {
                // Prevent excessively long numbers (optional)
                if (data.currentOperand.length >= 16) return;
                newCurrentOperand = data.currentOperand + num;
            }
            updateData({
                currentOperand: newCurrentOperand,
                display: newCurrentOperand,
                overwrite: false,
                ...clearRepeat // Apply cleared repeat state
            });
        };

        const handleDecimal = () => {
            const clearRepeat = clearRepeatState();
            if (data.overwrite) {
                updateData({ currentOperand: '0.', display: '0.', overwrite: false, ...clearRepeat });
                return;
            }
            if (data.currentOperand && !data.currentOperand.includes('.')) {
                const newCurrentOperand = data.currentOperand + '.';
                updateData({ currentOperand: newCurrentOperand, display: newCurrentOperand, ...clearRepeat });
            }
        };

        const handleOperator = (op: string) => {
            if (data.currentOperand === null && data.previousOperand === null) return;

            const clearRepeat = clearRepeatState();
            let result = data.currentOperand; // Default to current operand if no calc happens

            // If there's already a previous operand and operation, calculate first
            // Only calculate if overwrite is false (meaning user typed a new number after last op)
            if (data.previousOperand !== null && data.operation !== null && !data.overwrite) {
                 result = performCalculation(data.operation, data.previousOperand, data.currentOperand);
                if (result === "Error") {
                    updateData({ display: "Error", currentOperand: null, previousOperand: null, operation: null, overwrite: true, ...clearRepeat });
                    return;
                }
            } else if (data.previousOperand !== null && data.operation !== null && data.overwrite) {
                 // If user presses another operator immediately after one, just update the operator
                 updateData({ operation: op, ...clearRepeat });
                 return;
            } else {
                 // Use the current display value if no calculation happened yet
                 result = data.currentOperand ?? data.previousOperand;
            }


            updateData({
                previousOperand: result, // Result or current value becomes previous
                currentOperand: null, // Ready for next operand
                operation: op,
                display: result ?? '0', // Show result or the number being operated on
                overwrite: true, // Next number should overwrite
                ...clearRepeat,
            });
        };

        const handleEquals = () => {
            let result: string | null = null;
            let historyEntry: string | null = null;
            let nextStateUpdate: Partial<CalculatorData> = {};

            // --- Scenario 1: Standard Calculation ---
            if (data.operation && data.previousOperand && data.currentOperand) {
                result = performCalculation(data.operation, data.previousOperand, data.currentOperand);
                historyEntry = `${data.previousOperand} ${data.operation} ${data.currentOperand} = ${result}`;

                if (result !== "Error") {
                    nextStateUpdate = {
                        // Store for potential repeat
                        lastOperationForRepeat: data.operation,
                        lastOperandForRepeat: data.currentOperand,
                    };
                } else {
                     nextStateUpdate = clearRepeatState(); // Clear repeat state on error
                }

                nextStateUpdate = {
                    ...nextStateUpdate,
                    display: result ?? '0',
                    currentOperand: result,
                    previousOperand: null,
                    operation: null,
                    overwrite: true,
                };

            // --- Scenario 2: Repeat Last Operation ---
            } else if (data.lastOperationForRepeat && data.lastOperandForRepeat && data.currentOperand && !data.operation) {
                // Use current display (which is the previous result) as the new previousOperand
                const prev = data.currentOperand;
                const curr = data.lastOperandForRepeat;
                const op = data.lastOperationForRepeat;

                result = performCalculation(op, prev, curr);
                historyEntry = `${prev} ${op} ${curr} = ${result}`;

                 // Don't clear repeat state here, keep it for subsequent presses
                 if (result === "Error") {
                     nextStateUpdate = clearRepeatState(); // Clear repeat state on error
                 }

                nextStateUpdate = {
                    ...nextStateUpdate, // Keep existing repeat state if no error
                    display: result ?? '0',
                    currentOperand: result,
                    previousOperand: null, // Keep previous null
                    operation: null, // Keep operation null
                    overwrite: true,
                };

            // --- Scenario 3: Nothing to do (e.g., pressing = on '0') ---
            } else {
                return; // Or maybe clear repeat state? updateData(clearRepeatState());
            }

            // --- Update State ---
            if (historyEntry) {
                 nextStateUpdate.history = [...data.history, historyEntry].slice(-20);
            }
            updateData(nextStateUpdate);
        };

        const handleAllClear = () => {
            updateData({
                display: '0',
                currentOperand: '0',
                previousOperand: null,
                operation: null,
                overwrite: false,
                ...clearRepeatState(), // Also clear repeat state
            });
        };

        const handleBackspace = () => {
            if (data.overwrite || data.currentOperand === null || data.currentOperand === '0') return;

            const clearRepeat = clearRepeatState();
            let newCurrentOperand: string;

            if (data.currentOperand.length === 1) {
                newCurrentOperand = '0';
            } else {
                newCurrentOperand = data.currentOperand.slice(0, -1);
            }
            updateData({ currentOperand: newCurrentOperand, display: newCurrentOperand, ...clearRepeat });
        };

        const handlePercent = () => {
            if (data.currentOperand) {
                try {
                    const value = parseFloat(data.currentOperand);
                    const result = value / 100;
                    const formattedResult = format(result, { precision: 14 });
                    updateData({
                        currentOperand: formattedResult,
                        display: formattedResult,
                        overwrite: true,
                        ...clearRepeatState()
                    });
                } catch {
                    updateData({ display: "Error", currentOperand: null, overwrite: true, ...clearRepeatState() });
                }
            }
        };

        // --- Dynamic Font Size for Display ---
        const getDisplayFontSize = (text: string): string => {
            const length = text?.length || 1;
            if (length > 24) return 'text-lg'; // Smallest
            if (length > 18) return 'text-xl';
            if (length > 12) return 'text-2xl';
            return 'text-3xl'; // Default largest
        };

        return (
            <div className="flex flex-col md:flex-row h-full bg-gray-900 text-gray-200">
                {/* Calculator Section */}
                <div className="w-full md:w-7/12 p-4 flex flex-col border-b md:border-b-0 md:border-r border-gray-700/50">
                    {/* ... Header ... */}
                     <div className="flex items-center space-x-2 mb-4 px-2">
                        <Calculator className="text-gray-400" size={20} />
                        <h2 className="text-lg font-semibold text-gray-100">Calculator</h2>
                    </div>

                    {/* ... Display ... */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-4 text-right overflow-hidden">
                        <div className="h-5 text-sm text-gray-400 font-mono truncate">
                            {data.previousOperand} {data.operation}
                        </div>
                        <div
                            className={`font-mono ${getDisplayFontSize(data.display)} text-gray-100 break-all h-10 flex items-center justify-end`}
                            title={data.display}
                        >
                            {data.display}
                        </div>
                    </div>

                    {/* Keypad - Updated Layout */}
                    <div className="grid grid-cols-4 grid-rows-5 gap-2 flex-grow">
                        {/* Row 1 */}
                        <CalculatorButton value="AC" onClick={handleAllClear} variant="action" ariaLabel="All Clear" />
                        {/* CE replaced by Backspace */}
                        <CalculatorButton value={<Delete size={18} />} onClick={handleBackspace} variant="action" ariaLabel="Backspace" />
                        <CalculatorButton value={<Percent size={18} />} onClick={handlePercent} variant="operator" ariaLabel="Percent" />
                        <CalculatorButton value={<Divide size={18} />} onClick={() => handleOperator('/')} variant="operator" ariaLabel="Divide" />

                        {/* Row 2 */}
                        <CalculatorButton value="7" onClick={() => handleNumber('7')} />
                        <CalculatorButton value="8" onClick={() => handleNumber('8')} />
                        <CalculatorButton value="9" onClick={() => handleNumber('9')} />
                        <CalculatorButton value={<MultiplyIcon size={18} />} onClick={() => handleOperator('*')} variant="operator" ariaLabel="Multiply" />

                        {/* Row 3 */}
                        <CalculatorButton value="4" onClick={() => handleNumber('4')} />
                        <CalculatorButton value="5" onClick={() => handleNumber('5')} />
                        <CalculatorButton value="6" onClick={() => handleNumber('6')} />
                        <CalculatorButton value={<Minus size={18} />} onClick={() => handleOperator('-')} variant="operator" ariaLabel="Subtract" />

                        {/* Row 4 */}
                        <CalculatorButton value="1" onClick={() => handleNumber('1')} />
                        <CalculatorButton value="2" onClick={() => handleNumber('2')} />
                        <CalculatorButton value="3" onClick={() => handleNumber('3')} />
                        <CalculatorButton value={<Plus size={18} />} onClick={() => handleOperator('+')} variant="operator" ariaLabel="Add" />

                        {/* Row 5 */}
                        <CalculatorButton value="0" onClick={() => handleNumber('0')} className="col-span-2" />
                        <CalculatorButton value={<Dot size={18} />} onClick={handleDecimal} ariaLabel="Decimal" />
                        {/* Equals button in the bottom right, standard size */}
                        <CalculatorButton value={<Equal size={20} />} onClick={handleEquals} variant="equals" ariaLabel="Equals" />
                        {/* Removed the extra backspace button from here */}
                    </div>
                </div>

                {/* History & Notes Section */}
                <div className="w-full md:w-5/12 p-4 flex flex-col">
                    {/* History */}
                    <div className="mb-4 flex-shrink-0">
                        <div className="flex items-center space-x-2 mb-2 px-1">
                            <History className="text-gray-400" size={18} />
                            <h3 className="text-base font-medium text-gray-200">History</h3>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 h-40 overflow-y-auto custom-scrollbar">
                            {data.history.length === 0 ? (
                                <div className="text-gray-500 text-sm italic text-center mt-4">No history yet</div>
                            ) : (
                                <div className="space-y-1.5">
                                    {data.history.slice().reverse().map((entry, i) => ( // Show newest first
                                        <div key={data.history.length - 1 - i} className="font-mono text-sm text-gray-300 break-words">{entry}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="flex-grow flex flex-col min-h-0"> {/* Allow notes to take remaining space */}
                         <div className="flex items-center space-x-2 mb-2 px-1 flex-shrink-0">
                            <StickyNote className="text-gray-400" size={18} />
                            <h3 className="text-base font-medium text-gray-200">Notes</h3>
                        </div>
                        <textarea
                            value={data.notes}
                            onChange={(e) => updateData({ notes: e.target.value })}
                            className="w-full flex-grow bg-gray-800/50 border border-gray-700/50 p-3 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none custom-scrollbar text-sm"
                            placeholder="Add notes..."
                        />
                    </div>
                </div>
            </div>
        );
    },
};