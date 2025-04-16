import React, { useCallback } from 'react';
import { Tablet, TabletState } from '../types';
import { Calculator, History, StickyNote, Delete, Percent, Divide, X as MultiplyIcon, Minus, Plus, Equal, Dot } from 'lucide-react';
// Removed: import { format } from 'mathjs'; // Import mathjs

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

// --- Helper Function for Number Formatting (replaces mathjs.format) ---
const formatNumberResult = (num: number): string => {
    // Handle non-finite numbers (Infinity, NaN)
    if (!isFinite(num)) {
        return "Error";
    }

    // Use toPrecision to control significant digits.
    // 14 significant digits seems reasonable for a calculator display.
    const precision = 14;
    const preciseNumStr = num.toPrecision(precision);

    // parseFloat(preciseNumStr).toString() has the nice effect of:
    // 1. Removing trailing zeros after the decimal point (e.g., "1.2000" -> "1.2")
    // 2. Converting back from scientific notation if possible within JS number limits,
    //    but keeping it if necessary (e.g., "1e+21" remains "1e+21").
    // 3. Handling integers correctly (e.g., "123.000" -> "123")
    return parseFloat(preciseNumStr).toString();
};


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

        // --- Calculation Logic (Modified for Repeat, removed mathjs) ---
        const performCalculation = useCallback((
            op: string | null,
            prev: string | null,
            curr: string | null
        ): string | null => {
            if (op && prev && curr) {
                try {
                    const prevNum = parseFloat(prev);
                    const currNum = parseFloat(curr);

                    // Check for invalid number inputs before calculation
                    if (isNaN(prevNum) || isNaN(currNum)) {
                        console.error("Invalid number input for calculation:", prev, curr);
                        return "Error";
                    }

                    let result: number;

                    switch (op) {
                        case '+': result = prevNum + currNum; break;
                        case '-': result = prevNum - currNum; break;
                        case '*': result = prevNum * currNum; break;
                        case '/':
                            if (currNum === 0) return "Error"; // Division by zero check
                            result = prevNum / currNum;
                            break;
                        default:
                            console.error("Invalid operation received:", op);
                            return "Error"; // Treat invalid operation as error
                    }

                    // Format the result using the helper function
                    return formatNumberResult(result);

                } catch (error: any) {
                    // Catch any unexpected errors during parsing or calculation
                    console.error("Calculation Error:", error);
                    return "Error";
                }
            }
            // Return current operand if no calculation is needed/possible
            // (e.g., first operator press)
            return curr;
        }, []);


        // --- Event Handlers ---
        const handleNumber = (num: string) => {
            let newCurrentOperand: string;
            const clearRepeat = clearRepeatState(); // Clear repeat state on new number input

            if (data.overwrite || data.currentOperand === '0' || data.currentOperand === null) {
                // Start new number or replace '0'
                newCurrentOperand = num;
            } else {
                 // Prevent excessively long numbers (optional display limit)
                 // Using 16 as an arbitrary limit, adjust as needed
                if (data.currentOperand.replace('.', '').replace('-', '').length >= 16) return;
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
                // If overwriting (e.g., after equals or operator), start with "0."
                updateData({ currentOperand: '0.', display: '0.', overwrite: false, ...clearRepeat });
                return;
            }
            // Add decimal only if not already present
            if (data.currentOperand && !data.currentOperand.includes('.')) {
                const newCurrentOperand = data.currentOperand + '.';
                updateData({ currentOperand: newCurrentOperand, display: newCurrentOperand, ...clearRepeat });
            } else if (data.currentOperand === null) {
                 // Handle case where user presses "." first
                 updateData({ currentOperand: '0.', display: '0.', overwrite: false, ...clearRepeat });
            }
        };

        const handleOperator = (op: string) => {
            // Prevent operator if nothing has been entered yet
            if (data.currentOperand === null && data.previousOperand === null) return;

            const clearRepeat = clearRepeatState();
            let result = data.currentOperand; // Default to current operand if no calc happens

            // --- Case 1: Chaining operations (e.g., 5 + 3 - ) ---
            // Calculate the previous operation *before* setting the new one,
            // but only if a new number was entered (overwrite is false).
            if (data.previousOperand !== null && data.operation !== null && !data.overwrite && data.currentOperand !== null) {
                 result = performCalculation(data.operation, data.previousOperand, data.currentOperand);
                if (result === "Error") {
                    updateData({ display: "Error", currentOperand: null, previousOperand: null, operation: null, overwrite: true, ...clearRepeat });
                    return;
                }
                // The result becomes the new previous operand for the *next* operation
                updateData({
                    previousOperand: result,
                    currentOperand: null, // Ready for next number
                    operation: op,
                    display: result ?? '0',
                    overwrite: true,
                    ...clearRepeat,
                });

            // --- Case 2: Changing operator (e.g., 5 + - ) ---
            // If user presses another operator immediately after one (overwrite is true),
            // just update the operator, using the existing previousOperand.
            } else if (data.previousOperand !== null && data.operation !== null && data.overwrite) {
                 updateData({ operation: op, ...clearRepeat }); // Only change the operation

            // --- Case 3: First operator or operator after equals ---
            // No previous operation pending, or we just hit equals.
            // Move current operand (or the existing previous operand if current is null) to previousOperand.
            } else {
                 // If currentOperand is null (e.g., pressed operator right after another),
                 // use the existing previousOperand. Otherwise, use the currentOperand.
                 const valueToMove = data.currentOperand ?? data.previousOperand;

                 updateData({
                     previousOperand: valueToMove, // Current number becomes previous
                     currentOperand: null, // Ready for next number
                     operation: op,
                     display: valueToMove ?? '0', // Show the number being operated on
                     overwrite: true, // Next number should overwrite display
                     ...clearRepeat,
                 });
            }
        };


        const handleEquals = () => {
            let result: string | null = null;
            let historyEntry: string | null = null;
            let nextStateUpdate: Partial<CalculatorData> = {};

            // --- Scenario 1: Standard Calculation (e.g., 5 + 3 =) ---
            // Requires an operation, a previous operand, and a current operand.
            if (data.operation && data.previousOperand && data.currentOperand) {
                result = performCalculation(data.operation, data.previousOperand, data.currentOperand);
                // Check for error from calculation
                 if (result === "Error") {
                     nextStateUpdate = {
                         display: "Error",
                         currentOperand: null,
                         previousOperand: null,
                         operation: null,
                         overwrite: true,
                         ...clearRepeatState(), // Clear repeat state on error
                     };
                 } else {
                    // Format history entry using the *inputs* to the calculation
                    historyEntry = `${data.previousOperand} ${data.operation} ${data.currentOperand} = ${result}`;
                    nextStateUpdate = {
                        // Store details for potential repeat operation
                        lastOperationForRepeat: data.operation,
                        lastOperandForRepeat: data.currentOperand,
                        // Update state with result
                        display: result ?? '0',
                        currentOperand: result, // Result becomes the new current operand
                        previousOperand: null, // Clear previous operand
                        operation: null, // Clear operation
                        overwrite: true, // Next number input overwrites display
                    };
                 }

            // --- Scenario 2: Repeat Last Operation (e.g., 5 + 3 = = = ...) ---
            // Requires a stored last operation/operand, a current operand (result of previous calc),
            // and no *pending* operation.
            } else if (data.lastOperationForRepeat && data.lastOperandForRepeat && data.currentOperand && !data.operation) {
                // Use current display (which should be the previous result) as the new 'previous' operand
                const prev = data.currentOperand;
                const curr = data.lastOperandForRepeat; // The number to repeat the operation with
                const op = data.lastOperationForRepeat; // The operation to repeat

                result = performCalculation(op, prev, curr);

                 if (result === "Error") {
                     nextStateUpdate = {
                         display: "Error",
                         currentOperand: null,
                         previousOperand: null,
                         operation: null,
                         overwrite: true,
                         ...clearRepeatState(), // Clear repeat state on error
                     };
                 } else {
                     // Format history entry using the *inputs* to this repeat calculation
                    historyEntry = `${prev} ${op} ${curr} = ${result}`;
                    // Don't clear repeat state here, keep it for subsequent presses
                    nextStateUpdate = {
                        display: result ?? '0',
                        currentOperand: result, // Result becomes the new current operand
                        previousOperand: null, // Keep previous null
                        operation: null, // Keep operation null
                        overwrite: true, // Next number input overwrites display
                        // Keep existing lastOperationForRepeat & lastOperandForRepeat
                    };
                 }

            // --- Scenario 3: Nothing to calculate ---
            // e.g., pressing '=' when display is '0', or after 'AC'
            } else {
                // Optionally clear repeat state if equals is pressed without a valid context
                // updateData(clearRepeatState());
                return; // Do nothing
            }

            // --- Update State ---
            if (historyEntry) {
                 // Add to history, ensuring it doesn't grow indefinitely
                 nextStateUpdate.history = [...data.history, historyEntry].slice(-20); // Keep last 20 entries
            }
            updateData(nextStateUpdate);
        };


        const handleAllClear = () => {
            updateData({
                display: '0',
                currentOperand: '0', // Reset current operand to '0' for consistency
                previousOperand: null,
                operation: null,
                overwrite: false, // Ready for new input
                ...clearRepeatState(), // Also clear repeat state
            });
        };

        const handleBackspace = () => {
            // Don't backspace if we should overwrite (e.g., after '=' or operator)
            // or if the current operand is null or effectively zero
            if (data.overwrite || data.currentOperand === null || data.currentOperand === '0') return;

            const clearRepeat = clearRepeatState();
            let newCurrentOperand: string;

            if (data.currentOperand.length === 1 || (data.currentOperand.startsWith('-') && data.currentOperand.length === 2) ) {
                // If only one digit left (or just '-'), reset to '0'
                newCurrentOperand = '0';
            } else {
                // Remove the last character
                newCurrentOperand = data.currentOperand.slice(0, -1);
            }
            updateData({ currentOperand: newCurrentOperand, display: newCurrentOperand, ...clearRepeat });
        };

        const handlePercent = () => {
             // Apply percent only to the current number being entered or the result
            if (data.currentOperand) {
                 const clearRepeat = clearRepeatState();
                try {
                    const value = parseFloat(data.currentOperand);
                     if (isNaN(value)) throw new Error("Invalid number for percent");

                    // Calculate percentage (divide by 100)
                    const result = value / 100;

                    // Format the result using the helper function
                    const formattedResult = formatNumberResult(result);

                     if (formattedResult === "Error") throw new Error("Percentage result formatting error");

                    updateData({
                        currentOperand: formattedResult,
                        display: formattedResult,
                        overwrite: true, // Treat % like an operation end; next number overwrites
                        ...clearRepeat
                    });
                } catch (error) {
                     console.error("Percent Error:", error);
                    updateData({ display: "Error", currentOperand: null, overwrite: true, ...clearRepeat });
                }
            }
             // Consider what happens if user presses % after an operator?
             // Current logic only applies it to currentOperand. This seems reasonable.
             // E.g., 5 + 10 % -> 5 + 0.1 (updates currentOperand before potential equals)
             // If you wanted 5 + 10% (of 5), the logic would be more complex.
        };

        // --- Dynamic Font Size for Display ---
        const getDisplayFontSize = (text: string): string => {
            const length = text?.length || 1;
            if (length > 24) return 'text-lg'; // Smallest
            if (length > 18) return 'text-xl';
            if (length > 12) return 'text-2xl';
            return 'text-3xl'; // Default largest
        };

        // --- Render UI ---
        return (
            <div className="flex flex-col md:flex-row h-full bg-gray-900 text-gray-200">
                {/* Calculator Section */}
                <div className="w-full md:w-7/12 p-4 flex flex-col border-b md:border-b-0 md:border-r border-gray-700/50">
                    {/* Header */}
                     <div className="flex items-center space-x-2 mb-4 px-2">
                        <Calculator className="text-gray-400" size={20} />
                        <h2 className="text-lg font-semibold text-gray-100">Calculator</h2>
                    </div>

                    {/* Display */}
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-4 text-right overflow-hidden">
                        {/* Mini display for context (previous op) */}
                        <div className="h-5 text-sm text-gray-400 font-mono truncate" aria-live="polite">
                            {/* Show pending operation context */}
                            {data.previousOperand} {data.operation}
                        </div>
                         {/* Main display */}
                        <div
                            className={`font-mono ${getDisplayFontSize(data.display)} text-gray-100 break-all h-10 flex items-center justify-end`}
                            title={data.display} // Tooltip for long numbers
                            aria-live="polite" // Announce changes
                            role="textbox" // Semantic role for display
                            aria-readonly="true"
                        >
                            {data.display ?? '0'} {/* Ensure display isn't null */}
                        </div>
                    </div>

                    {/* Keypad */}
                    <div className="grid grid-cols-4 grid-rows-5 gap-2 flex-grow">
                        {/* Row 1 */}
                        <CalculatorButton value="AC" onClick={handleAllClear} variant="action" ariaLabel="All Clear" />
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
                        <CalculatorButton value={<Equal size={20} />} onClick={handleEquals} variant="equals" ariaLabel="Equals" />
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
                                <div className="space-y-1.5" aria-live="polite"> {/* Announce history changes */}
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
                            aria-label="Calculator Notes"
                        />
                    </div>
                </div>
            </div>
        );
    },
};