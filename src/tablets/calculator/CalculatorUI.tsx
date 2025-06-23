import React, { useEffect, useRef } from 'react';
import { Calculator, History, StickyNote, Delete, Percent, Divide, X as MultiplyIcon, Minus, Plus, Equal, Dot } from 'lucide-react';
import { CalculatorEngine } from './useCalculatorEngine';

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

interface CalculatorUIProps {
    engine: CalculatorEngine;
    tabletId: string; // Add tablet ID for unique identification
}

export const CalculatorUI: React.FC<CalculatorUIProps> = ({ engine, tabletId }) => {
    const { data } = engine;
    const calculatorRef = useRef<HTMLDivElement>(null);

    // Add keyboard event handler - make it specific to this calculator instance
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if this calculator is the active one by looking for the calculator container
            const calculatorContainer = document.querySelector(`[data-calculator-id="${tabletId}"]`);
            if (!calculatorContainer || !calculatorContainer.contains(e.target as Node)) {
                return;
            }

            // Only handle keyboard input if the calculator is focused or if no input elements are focused
            const activeElement = document.activeElement;
            const isInputFocused = activeElement?.tagName === 'INPUT' || 
                                 activeElement?.tagName === 'TEXTAREA' || 
                                 (activeElement as HTMLElement)?.contentEditable === 'true';
            
            // Skip if an input field is focused (allow typing in notes)
            if (isInputFocused) return;

            // Prevent default browser behavior for calculator keys
            const calculatorKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                                  '+', '-', '*', '/', '=', 'Enter', '.', '%', 'Backspace', 'Delete', 'Escape'];
            if (calculatorKeys.includes(e.key)) {
                e.preventDefault();
            }

            // Handle number inputs
            if (/^[0-9]$/.test(e.key)) {
                engine.handleNumber(e.key);
                return;
            }

            // Handle operator inputs
            switch (e.key) {
                case '+':
                    engine.handleOperator('+');
                    break;
                case '-':
                    engine.handleOperator('-');
                    break;
                case '*':
                    engine.handleOperator('*');
                    break;
                case '/':
                    engine.handleOperator('/');
                    break;
                case '=':
                case 'Enter':
                    engine.handleEquals();
                    break;
                case '.':
                    engine.handleDecimal();
                    break;
                case '%':
                    engine.handlePercent();
                    break;
                case 'Backspace':
                    engine.handleBackspace();
                    break;
                case 'Delete':
                case 'Escape':
                    engine.handleAllClear();
                    break;
            }
        };

        // Add event listener to document
        document.addEventListener('keydown', handleKeyDown);

        // Focus the calculator container to enable keyboard input
        if (calculatorRef.current) {
            calculatorRef.current.focus();
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [engine, tabletId]);

    return (
        <div 
            ref={calculatorRef}
            className="flex flex-col md:flex-row h-full bg-gray-900 text-gray-200"
            tabIndex={0}
            style={{ outline: 'none' }}
            data-calculator-id={tabletId}
        >
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
                        className={`font-mono ${engine.getDisplayFontSize(data.display)} text-gray-100 break-all h-10 flex items-center justify-end`}
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
                    <CalculatorButton value="AC" onClick={engine.handleAllClear} variant="action" ariaLabel="All Clear" />
                    <CalculatorButton value={<Delete size={18} />} onClick={engine.handleBackspace} variant="action" ariaLabel="Backspace" />
                    <CalculatorButton value={<Percent size={18} />} onClick={engine.handlePercent} variant="operator" ariaLabel="Percent" />
                    <CalculatorButton value={<Divide size={18} />} onClick={() => engine.handleOperator('/')} variant="operator" ariaLabel="Divide" />

                    {/* Row 2 */}
                    <CalculatorButton value="7" onClick={() => engine.handleNumber('7')} />
                    <CalculatorButton value="8" onClick={() => engine.handleNumber('8')} />
                    <CalculatorButton value="9" onClick={() => engine.handleNumber('9')} />
                    <CalculatorButton value={<MultiplyIcon size={18} />} onClick={() => engine.handleOperator('*')} variant="operator" ariaLabel="Multiply" />

                    {/* Row 3 */}
                    <CalculatorButton value="4" onClick={() => engine.handleNumber('4')} />
                    <CalculatorButton value="5" onClick={() => engine.handleNumber('5')} />
                    <CalculatorButton value="6" onClick={() => engine.handleNumber('6')} />
                    <CalculatorButton value={<Minus size={18} />} onClick={() => engine.handleOperator('-')} variant="operator" ariaLabel="Subtract" />

                    {/* Row 4 */}
                    <CalculatorButton value="1" onClick={() => engine.handleNumber('1')} />
                    <CalculatorButton value="2" onClick={() => engine.handleNumber('2')} />
                    <CalculatorButton value="3" onClick={() => engine.handleNumber('3')} />
                    <CalculatorButton value={<Plus size={18} />} onClick={() => engine.handleOperator('+')} variant="operator" ariaLabel="Add" />

                    {/* Row 5 */}
                    <CalculatorButton value="0" onClick={() => engine.handleNumber('0')} className="col-span-2" />
                    <CalculatorButton value={<Dot size={18} />} onClick={engine.handleDecimal} ariaLabel="Decimal" />
                    <CalculatorButton value={<Equal size={20} />} onClick={engine.handleEquals} variant="equals" ariaLabel="Equals" />
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
                        {(!data.history || data.history.length === 0) ? (
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
                        onChange={(e) => engine.handleNotesChange(e.target.value)}
                        className="w-full flex-grow bg-gray-800/50 border border-gray-700/50 p-3 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none custom-scrollbar text-sm"
                        placeholder="Add notes..."
                        aria-label="Calculator Notes"
                    />
                </div>
            </div>
        </div>
    );
}; 