// src/tablets/calculator/CalculatorUI.tsx

import React, { useEffect, useRef } from 'react';
import { Calculator, History, StickyNote, Delete, Percent, Divide, X as MultiplyIcon, Minus, Plus, Equal, Dot, Sigma, Code, Binary, Parentheses, Bot } from 'lucide-react';
import { CalculatorEngine, CalculatorMode } from './useCalculatorEngine';

const CalculatorButton: React.FC<{
    value: string | React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'operator' | 'action' | 'equals' | 'mode';
    className?: string;
    ariaLabel?: string;
    isActive?: boolean;
}> = ({ value, onClick, variant = 'default', className = '', ariaLabel, isActive = false }) => {
    const baseStyle = "border rounded-lg p-2 text-base md:text-lg font-medium transition-all duration-100 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-95 active:brightness-90 transform";
    
    const variantMap = {
        operator: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/50 focus:ring-blue-500',
        action: 'bg-gray-600/60 hover:bg-gray-500/60 text-gray-200 border-gray-600/50 focus:ring-gray-400',
        equals: 'bg-green-500/30 hover:bg-green-500/40 text-green-300 border-green-500/50 focus:ring-green-500',
        mode: `border-gray-600/50 ${isActive ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'}`,
        default: 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-100 border-gray-600/50 focus:ring-gray-500'
    };

    return (
        <button onClick={onClick} className={`${baseStyle} ${variantMap[variant]} ${className}`} aria-label={ariaLabel || (typeof value === 'string' ? value : undefined)}>
            {value}
        </button>
    );
};

interface CalculatorUIProps {
    engine: CalculatorEngine;
    tabletId: string;
}

export const CalculatorUI: React.FC<CalculatorUIProps> = ({ engine, tabletId }) => {
    const { data } = engine;
    const calculatorRef = useRef<HTMLDivElement>(null);

    // Keyboard handling remains largely the same but simplified for the new engine
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const calculatorContainer = document.querySelector(`[data-calculator-id="${tabletId}"]`);
            if (!calculatorContainer || !calculatorContainer.contains(e.target as Node)) return;
            
            const activeElement = document.activeElement;
            if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA' || (activeElement as HTMLElement)?.contentEditable === 'true') return;

            const keyMap: Record<string, () => void> = {
                '0': () => engine.handleInput('0'), '1': () => engine.handleInput('1'), '2': () => engine.handleInput('2'), '3': () => engine.handleInput('3'), '4': () => engine.handleInput('4'), '5': () => engine.handleInput('5'), '6': () => engine.handleInput('6'), '7': () => engine.handleInput('7'), '8': () => engine.handleInput('8'), '9': () => engine.handleInput('9'),
                '+': () => engine.handleInput('+'), '-': () => engine.handleInput('-'), '*': () => engine.handleInput('*'), '/': () => engine.handleInput('/'),
                '.': () => engine.handleInput('.'), '%': () => engine.handleInput('%'), '(': () => engine.handleInput('('), ')': () => engine.handleInput(')'),
                'Enter': engine.handleEquals, '=': engine.handleEquals,
                'Backspace': engine.handleBackspace, 'Delete': engine.handleClear, 'Escape': engine.handleClear
            };
            if (keyMap[e.key]) {
                e.preventDefault();
                keyMap[e.key]();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        calculatorRef.current?.focus();
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [engine, tabletId]);
    
    const getDisplayFontSize = (text: string): string => {
        const length = text?.length || 1;
        if (length > 24) return 'text-xl';
        if (length > 16) return 'text-2xl';
        return 'text-3xl';
    };

    return (
        <div ref={calculatorRef} className="flex flex-col md:flex-row h-full bg-gray-900 text-gray-200" tabIndex={0} style={{ outline: 'none' }} data-calculator-id={tabletId}>
            <div className="w-full md:w-8/12 p-4 flex flex-col border-b md:border-b-0 md:border-r border-gray-700/50">
                <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center space-x-2">
                        <Calculator className="text-gray-400" size={20} />
                        <h2 className="text-lg font-semibold text-gray-100">Calculator</h2>
                    </div>
                    <div className="flex items-center space-x-1 bg-gray-800/50 p-1 rounded-lg">
                        <CalculatorButton value={<Bot size={16}/>} onClick={() => engine.handleModeChange('standard')} variant="mode" ariaLabel="Standard Mode" isActive={data.mode === 'standard'}/>
                        <CalculatorButton value={<Sigma size={16}/>} onClick={() => engine.handleModeChange('scientific')} variant="mode" ariaLabel="Scientific Mode" isActive={data.mode === 'scientific'}/>
                        <CalculatorButton value={<Code size={16}/>} onClick={() => engine.handleModeChange('programmer')} variant="mode" ariaLabel="Programmer Mode" isActive={data.mode === 'programmer'}/>
                    </div>
                </div>

                <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 mb-4 text-right overflow-hidden">
                    <div className="h-5 text-sm text-gray-400 font-mono truncate" aria-live="polite">{data.expression}</div>
                    <div className={`font-mono ${getDisplayFontSize(data.display)} text-gray-100 break-all h-10 flex items-center justify-end`} title={data.display}>{data.display ?? '0'}</div>
                </div>

                {/* Keypads */}
                {data.mode === 'standard' && (
                    <div className="grid grid-cols-4 gap-2 flex-grow">
                        <CalculatorButton value="AC" onClick={engine.handleClear} variant="action" />
                        <CalculatorButton value={<Delete size={18} />} onClick={engine.handleBackspace} variant="action" />
                        <CalculatorButton value="%" onClick={() => engine.handleInput('%')} variant="operator" />
                        <CalculatorButton value={<Divide size={18} />} onClick={() => engine.handleInput('/')} variant="operator" />
                        <CalculatorButton value="7" onClick={() => engine.handleInput('7')} />
                        <CalculatorButton value="8" onClick={() => engine.handleInput('8')} />
                        <CalculatorButton value="9" onClick={() => engine.handleInput('9')} />
                        <CalculatorButton value={<MultiplyIcon size={18} />} onClick={() => engine.handleInput('*')} variant="operator" />
                        <CalculatorButton value="4" onClick={() => engine.handleInput('4')} />
                        <CalculatorButton value="5" onClick={() => engine.handleInput('5')} />
                        <CalculatorButton value="6" onClick={() => engine.handleInput('6')} />
                        <CalculatorButton value={<Minus size={18} />} onClick={() => engine.handleInput('-')} variant="operator" />
                        <CalculatorButton value="1" onClick={() => engine.handleInput('1')} />
                        <CalculatorButton value="2" onClick={() => engine.handleInput('2')} />
                        <CalculatorButton value="3" onClick={() => engine.handleInput('3')} />
                        <CalculatorButton value={<Plus size={18} />} onClick={() => engine.handleInput('+')} variant="operator" />
                        <CalculatorButton value="0" onClick={() => engine.handleInput('0')} className="col-span-2" />
                        <CalculatorButton value={<Dot size={18} />} onClick={() => engine.handleInput('.')} />
                        <CalculatorButton value={<Equal size={20} />} onClick={engine.handleEquals} variant="equals" />
                    </div>
                )}
                {data.mode === 'scientific' && (
                     <div className="grid grid-cols-5 gap-2 flex-grow text-sm">
                        <CalculatorButton value="AC" onClick={engine.handleClear} variant="action" />
                        <CalculatorButton value={<Delete size={16} />} onClick={engine.handleBackspace} variant="action" />
                        <CalculatorButton value={<Parentheses size={16}/>} onClick={() => engine.handleInput('()')} variant="operator"/>
                        <CalculatorButton value="%" onClick={() => engine.handleInput('%')} variant="operator" />
                        <CalculatorButton value={<Divide size={16} />} onClick={() => engine.handleInput('/')} variant="operator" />

                        <CalculatorButton value="sin" onClick={() => engine.handleInput('sin(')} variant="action" />
                        <CalculatorButton value="7" onClick={() => engine.handleInput('7')} />
                        <CalculatorButton value="8" onClick={() => engine.handleInput('8')} />
                        <CalculatorButton value="9" onClick={() => engine.handleInput('9')} />
                        <CalculatorButton value={<MultiplyIcon size={16} />} onClick={() => engine.handleInput('*')} variant="operator" />

                        <CalculatorButton value="cos" onClick={() => engine.handleInput('cos(')} variant="action" />
                        <CalculatorButton value="4" onClick={() => engine.handleInput('4')} />
                        <CalculatorButton value="5" onClick={() => engine.handleInput('5')} />
                        <CalculatorButton value="6" onClick={() => engine.handleInput('6')} />
                        <CalculatorButton value={<Minus size={16} />} onClick={() => engine.handleInput('-')} variant="operator" />

                        <CalculatorButton value="tan" onClick={() => engine.handleInput('tan(')} variant="action" />
                        <CalculatorButton value="1" onClick={() => engine.handleInput('1')} />
                        <CalculatorButton value="2" onClick={() => engine.handleInput('2')} />
                        <CalculatorButton value="3" onClick={() => engine.handleInput('3')} />
                        <CalculatorButton value={<Plus size={16} />} onClick={() => engine.handleInput('+')} variant="operator" />
                        
                        <CalculatorButton value="√" onClick={() => engine.handleInput('sqrt(')} variant="action" />
                        <CalculatorButton value="x²" onClick={() => engine.handleInput('^2')} variant="action" />
                        <CalculatorButton value="0" onClick={() => engine.handleInput('0')} />
                        <CalculatorButton value="." onClick={() => engine.handleInput('.')} />
                        <CalculatorButton value={<Equal size={18} />} onClick={engine.handleEquals} variant="equals" />
                     </div>
                )}
                 {data.mode === 'programmer' && (
                     <div className="grid grid-cols-5 gap-2 flex-grow text-sm">
                        <CalculatorButton value="AC" onClick={engine.handleClear} variant="action" />
                        <CalculatorButton value="NOT" onClick={() => engine.handleInput('~')} variant="action" />
                        <CalculatorButton value="AND" onClick={() => engine.handleInput(' & ')} variant="operator" />
                        <CalculatorButton value="OR" onClick={() => engine.handleInput(' | ')} variant="operator" />
                        <CalculatorButton value="XOR" onClick={() => engine.handleInput(' ^ ')} variant="operator" />

                        <CalculatorButton value="A" onClick={() => engine.handleInput('A')} />
                        <CalculatorButton value="B" onClick={() => engine.handleInput('B')} />
                        <CalculatorButton value="7" onClick={() => engine.handleInput('7')} />
                        <CalculatorButton value="8" onClick={() => engine.handleInput('8')} />
                        <CalculatorButton value="9" onClick={() => engine.handleInput('9')} />
                        
                        <CalculatorButton value="C" onClick={() => engine.handleInput('C')} />
                        <CalculatorButton value="D" onClick={() => engine.handleInput('D')} />
                        <CalculatorButton value="4" onClick={() => engine.handleInput('4')} />
                        <CalculatorButton value="5" onClick={() => engine.handleInput('5')} />
                        <CalculatorButton value="6" onClick={() => engine.handleInput('6')} />
                        
                        <CalculatorButton value="E" onClick={() => engine.handleInput('E')} />
                        <CalculatorButton value="F" onClick={() => engine.handleInput('F')} />
                        <CalculatorButton value="1" onClick={() => engine.handleInput('1')} />
                        <CalculatorButton value="2" onClick={() => engine.handleInput('2')} />
                        <CalculatorButton value="3" onClick={() => engine.handleInput('3')} />
                        
                        <div className="col-span-3 grid grid-cols-3 gap-2">
                           <CalculatorButton value={<Binary size={16}/>} onClick={() => engine.handleBaseChange('BIN')} variant="mode" isActive={data.base === 'BIN'} />
                           <CalculatorButton value="OCT" onClick={() => engine.handleBaseChange('OCT')} variant="mode" isActive={data.base === 'OCT'}/>
                           <CalculatorButton value="HEX" onClick={() => engine.handleBaseChange('HEX')} variant="mode" isActive={data.base === 'HEX'}/>
                        </div>
                        <CalculatorButton value="0" onClick={() => engine.handleInput('0')} />
                        <CalculatorButton value={<Equal size={18} />} onClick={engine.handleEquals} variant="equals" />
                     </div>
                )}
            </div>
            <div className="w-full md:w-4/12 p-4 flex flex-col">
                <div className="mb-4 flex-shrink-0">
                    <div className="flex items-center space-x-2 mb-2 px-1">
                        <History className="text-gray-400" size={18} />
                        <h3 className="text-base font-medium text-gray-200">History</h3>
                    </div>
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 h-40 overflow-y-auto custom-scrollbar">
                        {(!data.history || data.history.length === 0) ? (
                            <div className="text-gray-500 text-sm italic text-center mt-4">No history yet</div>
                        ) : (
                            <div className="space-y-2">
                                {data.history.map((entry, i) => (
                                    <button key={i} onClick={() => engine.handleHistoryClick(entry)} className="w-full text-left p-1.5 rounded hover:bg-gray-700/50 transition-colors">
                                        <div className="font-mono text-xs text-gray-400 truncate">{entry.expression}</div>
                                        <div className="font-mono text-sm text-gray-200 text-right truncate">= {entry.result}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-grow flex flex-col min-h-0">
                    <div className="flex items-center space-x-2 mb-2 px-1 flex-shrink-0">
                        <StickyNote className="text-gray-400" size={18} />
                        <h3 className="text-base font-medium text-gray-200">Notes</h3>
                    </div>
                    <textarea value={data.notes} onChange={(e) => engine.handleNotesChange(e.target.value)} className="w-full flex-grow bg-gray-800/50 border border-gray-700/50 p-3 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-none custom-scrollbar text-sm" placeholder="Add notes..." />
                </div>
            </div>
        </div>
    );
};