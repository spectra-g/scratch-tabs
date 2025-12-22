import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, RotateCcw, Zap, Calendar, Copy, Check } from '../../../components/Icons';
import { intelligentParse, DetectedFormat, ensureDate } from '../utils/dateUtils';
import { useClipboard } from '../hooks/useClipboard';

interface SmartInputProps {
    inputValue: string;
    parsedDate: Date | null;
    onUpdate: (value: string, date: Date | null, error: string | null) => void;
}

export const SmartInput: React.FC<SmartInputProps> = ({
    inputValue = '',
    parsedDate,
    onUpdate
}) => {
    const [detectedFormat, setDetectedFormat] = useState<DetectedFormat | null>(null);
    const [arithmetic, setArithmetic] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const { copy, copiedId } = useClipboard();
    const isCopied = copiedId === 'smart-input-date';
    const isHandlingUserInput = useRef(false);

    const handleCopy = useCallback(() => {
        if (!parsedDate) return;
        const text = ensureDate(parsedDate)?.toISOString() || '';
        copy(text, 'smart-input-date');
    }, [parsedDate, copy]);

    // Parse initial "now" value
    useEffect(() => {
        const result = intelligentParse('now');
        if (result.date) {
            onUpdate('now', result.date, null);
            setDetectedFormat(result.format);
        }
    }, []);

    // React to external inputValue changes (e.g. from LiveHeader)
    useEffect(() => {
        if (isHandlingUserInput.current) {
            isHandlingUserInput.current = false;
            return;
        }

        if (!inputValue || !inputValue.trim()) {
            setDetectedFormat(null);
            setArithmetic(undefined);
            // Removed setWarning
            return;
        }

        const result = intelligentParse(inputValue);
        if (result.date) {
            setDetectedFormat(result.format);
            setArithmetic(result.arithmetic);
        } else if (result.format === 'Command') {
            setDetectedFormat('Command');
            setArithmetic(undefined);
        } else {
            setDetectedFormat(null);
            setArithmetic(undefined);
        }
    }, [inputValue]);

    const handleInternalInputChange = useCallback((value: string) => {
        isHandlingUserInput.current = true;
        setError(null);

        if (!value.trim()) {
            onUpdate(value, null, null);
            setDetectedFormat(null);
            setArithmetic(undefined);
            // Removed setWarning
            return;
        }

        const result = intelligentParse(value);
        if (result.date) {
            // Normal date parsing
            onUpdate(value, result.date, null);
            setDetectedFormat(result.format);
            setArithmetic(result.arithmetic);
        } else if (result.format === 'Command' && result.commandResult) {
            // Command handling
            onUpdate(value, null, JSON.stringify({ type: 'COMMAND', result: result.commandResult }));
            setDetectedFormat('Command');
            setArithmetic(undefined);
        } else if (result.format === 'Command') {
            // Invalid/Unknown command
            onUpdate(value, null, null); // Don't error, just don't set a date
            setDetectedFormat('Command');
            setArithmetic(undefined);
        } else {
            onUpdate(value, null, 'Unable to parse date/time');
            setDetectedFormat(null);
            setArithmetic(undefined);
        }
    }, [onUpdate]);

    const handleClear = useCallback(() => {
        onUpdate('', null, null);
        setDetectedFormat(null);
        setArithmetic(undefined);
        setError(null);
        // Removed setWarning
    }, [onUpdate]);

    const handleReset = useCallback(() => {
        const result = intelligentParse('now');
        onUpdate('now', result.date, null);
        setDetectedFormat(result.format);
        setArithmetic(undefined);
        setError(null);
        // Removed setWarning
    }, [onUpdate]);

    const getFormatBadgeColor = (format: DetectedFormat) => {
        switch (format) {
            case 'Arithmetic': return 'bg-primary/20 text-primary border-primary/30';
            case 'Unix Seconds':
            case 'Unix Milliseconds': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
            case 'ISO 8601': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30';
            case 'SQL Datetime': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
            case 'Natural Language': return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
            case 'Command': return 'bg-accent/20 text-accent border-accent/30';
            default: return 'bg-surface-secondary text-secondary border-base';
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative group">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-wider mb-2">
                    Omni-Input (Unix, ISO, Math, Natural)
                </label>

                <div className="relative flex items-center">
                    <div className="absolute left-4 flex items-center pointer-events-none">
                        <Calendar size={20} className="text-secondary group-focus-within:text-primary transition-colors" />
                    </div>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => handleInternalInputChange(e.target.value)}
                        placeholder="e.g., now + 5d, 1734876439, > Tokyo, > diff 123"
                        autoFocus
                        className={`input-themed w-full pl-12 pr-24 py-4 text-lg font-mono tracking-tight shadow-sm transition-all focus:ring-2 focus:ring-primary/20 ${error ? 'border-danger bg-danger-subtle/10' : ''
                            }`}
                        autoComplete="off"
                        spellCheck={false}
                    />

                    <div className="absolute right-4 flex items-center gap-2">
                        {parsedDate && (
                            <button
                                onClick={handleCopy}
                                className={`p-1 transition-colors ${isCopied ? 'text-success' : 'text-secondary hover:text-main'}`}
                                title="Copy parsed ISO string"
                            >
                                {isCopied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        )}
                        {inputValue && (
                            <button
                                onClick={handleClear}
                                className="p-1 text-secondary hover:text-main transition-colors"
                                title="Clear input"
                            >
                                {isCopied ? <X size={18} /> : <X size={18} />}
                            </button>
                        )}
                        <button
                            onClick={handleReset}
                            className="p-1 text-secondary hover:text-main transition-colors"
                            title="Reset to 'now'"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 min-h-[24px]">
                    {detectedFormat && (
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${getFormatBadgeColor(detectedFormat)} flex items-center gap-1`}>
                            <Zap size={10} />
                            Format: {detectedFormat}
                        </div>
                    )}

                    {arithmetic && (
                        <div className="text-[11px] text-secondary font-mono flex items-center gap-1">
                            <span className="text-primary italic">Calculated:</span> {arithmetic}
                        </div>
                    )}

                    {error && <span className="text-[11px] text-danger">{error}</span>}
                </div>
            </div>
        </div>
    );
};
