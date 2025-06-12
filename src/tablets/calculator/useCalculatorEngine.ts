import { useCallback } from 'react';

// --- State Interface ---
export interface CalculatorData {
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

// --- Helper Function for Number Formatting ---
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

export interface CalculatorEngine {
    data: CalculatorData;
    handleNumber: (num: string) => void;
    handleDecimal: () => void;
    handleOperator: (op: string) => void;
    handleEquals: () => void;
    handleAllClear: () => void;
    handleBackspace: () => void;
    handlePercent: () => void;
    handleNotesChange: (notes: string) => void;
    getDisplayFontSize: (text: string) => string;
}

export const useCalculatorEngine = (
    initialData: CalculatorData,
    onChange: (newData: CalculatorData) => void
): CalculatorEngine => {
    // Helper to update state immutably
    const updateData = (newData: Partial<CalculatorData>) => {
        onChange({ ...initialData, ...newData });
    };

    // --- Clear Repeat State Helper ---
    const clearRepeatState = (): Partial<CalculatorData> => ({
        lastOperationForRepeat: null,
        lastOperandForRepeat: null,
    });

    // --- Calculation Logic ---
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

        if (initialData.overwrite || initialData.currentOperand === '0' || initialData.currentOperand === null) {
            // Start new number or replace '0'
            newCurrentOperand = num;
        } else {
            // Prevent excessively long numbers (optional display limit)
            // Using 16 as an arbitrary limit, adjust as needed
            if (initialData.currentOperand.replace('.', '').replace('-', '').length >= 16) return;
            newCurrentOperand = initialData.currentOperand + num;
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
        if (initialData.overwrite) {
            // If overwriting (e.g., after equals or operator), start with "0."
            updateData({ currentOperand: '0.', display: '0.', overwrite: false, ...clearRepeat });
            return;
        }
        // Add decimal only if not already present
        if (initialData.currentOperand && !initialData.currentOperand.includes('.')) {
            const newCurrentOperand = initialData.currentOperand + '.';
            updateData({ currentOperand: newCurrentOperand, display: newCurrentOperand, ...clearRepeat });
        } else if (initialData.currentOperand === null) {
            // Handle case where user presses "." first
            updateData({ currentOperand: '0.', display: '0.', overwrite: false, ...clearRepeat });
        }
    };

    const handleOperator = (op: string) => {
        // Prevent operator if nothing has been entered yet
        if (initialData.currentOperand === null && initialData.previousOperand === null) return;

        const clearRepeat = clearRepeatState();
        let result = initialData.currentOperand; // Default to current operand if no calc happens

        // --- Case 1: Chaining operations (e.g., 5 + 3 - ) ---
        // Calculate the previous operation *before* setting the new one,
        // but only if a new number was entered (overwrite is false).
        if (initialData.previousOperand !== null && initialData.operation !== null && !initialData.overwrite && initialData.currentOperand !== null) {
            result = performCalculation(initialData.operation, initialData.previousOperand, initialData.currentOperand);
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
        } else if (initialData.previousOperand !== null && initialData.operation !== null && initialData.overwrite) {
            updateData({ operation: op, ...clearRepeat }); // Only change the operation

        // --- Case 3: First operator or operator after equals ---
        // No previous operation pending, or we just hit equals.
        // Move current operand (or the existing previous operand if current is null) to previousOperand.
        } else {
            // If currentOperand is null (e.g., pressed operator right after another),
            // use the existing previousOperand. Otherwise, use the currentOperand.
            const valueToMove = initialData.currentOperand ?? initialData.previousOperand;

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
        if (initialData.operation && initialData.previousOperand && initialData.currentOperand) {
            result = performCalculation(initialData.operation, initialData.previousOperand, initialData.currentOperand);
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
                historyEntry = `${initialData.previousOperand} ${initialData.operation} ${initialData.currentOperand} = ${result}`;
                nextStateUpdate = {
                    // Store details for potential repeat operation
                    lastOperationForRepeat: initialData.operation,
                    lastOperandForRepeat: initialData.currentOperand,
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
        } else if (initialData.lastOperationForRepeat && initialData.lastOperandForRepeat && initialData.currentOperand && !initialData.operation) {
            // Use current display (which should be the previous result) as the new 'previous' operand
            const prev = initialData.currentOperand;
            const curr = initialData.lastOperandForRepeat; // The number to repeat the operation with
            const op = initialData.lastOperationForRepeat; // The operation to repeat

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
            nextStateUpdate.history = [...initialData.history, historyEntry].slice(-20); // Keep last 20 entries
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
        if (initialData.overwrite || initialData.currentOperand === null || initialData.currentOperand === '0') return;

        const clearRepeat = clearRepeatState();
        let newCurrentOperand: string;

        if (initialData.currentOperand.length === 1 || (initialData.currentOperand.startsWith('-') && initialData.currentOperand.length === 2)) {
            // If only one digit left (or just '-'), reset to '0'
            newCurrentOperand = '0';
        } else {
            // Remove the last character
            newCurrentOperand = initialData.currentOperand.slice(0, -1);
        }
        updateData({ currentOperand: newCurrentOperand, display: newCurrentOperand, ...clearRepeat });
    };

    const handlePercent = () => {
        // Apply percent only to the current number being entered or the result
        if (initialData.currentOperand) {
            const clearRepeat = clearRepeatState();
            try {
                const value = parseFloat(initialData.currentOperand);
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

    const handleNotesChange = (notes: string) => {
        updateData({ notes });
    };

    // --- Dynamic Font Size for Display ---
    const getDisplayFontSize = (text: string): string => {
        const length = text?.length || 1;
        if (length > 24) return 'text-lg'; // Smallest
        if (length > 18) return 'text-xl';
        if (length > 12) return 'text-2xl';
        return 'text-3xl'; // Default largest
    };

    return {
        data: initialData,
        handleNumber,
        handleDecimal,
        handleOperator,
        handleEquals,
        handleAllClear,
        handleBackspace,
        handlePercent,
        handleNotesChange,
        getDisplayFontSize,
    };
}; 