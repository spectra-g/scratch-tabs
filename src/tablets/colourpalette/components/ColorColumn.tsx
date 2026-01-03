import React, { useState, useRef, useEffect } from 'react';
import { ColorInfo } from '../types';
import { generateShades } from '../utils/colourUtils';
import { Copy, Check, Grid } from '../../../components/Icons';

interface ColorColumnProps {
    color: ColorInfo;
    index: number;
    onLockToggle: (id: string) => void;
    onColorChange: (id: string, hex: string) => void;
}

export const ColorColumn: React.FC<ColorColumnProps> = ({
    color,
    index,
    onLockToggle,
    onColorChange,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(color.hex);
    const [showShades, setShowShades] = useState(false);
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isDark = color.luminance < 0.4;
    const textColor = isDark ? 'text-white' : 'text-black';
    const iconColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)';
    const iconActiveColor = isDark ? 'white' : 'black';

    const shades = generateShades(color.hex);

    useEffect(() => {
        if (copied) {
            const timer = setTimeout(() => setCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [copied]);

    const handleHexClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleBlur = () => {
        setIsEditing(false);
        if (editValue !== color.hex && /^#[0-9A-F]{6}$/i.test(editValue)) {
            onColorChange(color.id, editValue);
        } else {
            setEditValue(color.hex);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditValue(color.hex);
        }
    };

    const copyToClipboard = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(color.hex).then(() => {
            setCopied(true);
        });
    };

    return (
        <div
            className="relative w-full h-full flex flex-col items-center justify-between py-12 transition-colors duration-300 group select-none"
            style={{ backgroundColor: color.hex }}
        >
            {/* Action Bar (Top) */}
            <div className="flex flex-col items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Shades Picker Trigger */}
                <div className="relative">
                    <button
                        onMouseEnter={() => setShowShades(true)}
                        onMouseLeave={() => setShowShades(false)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        style={{ color: iconColor }}
                    >
                        <Grid size={24} />
                    </button>

                    {showShades && (
                        <div
                            onMouseEnter={() => setShowShades(true)}
                            onMouseLeave={() => setShowShades(false)}
                            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-surface-raised border border-base rounded-lg shadow-2xl overflow-hidden z-50 flex flex-col w-12"
                        >
                            {shades.map((shade, i) => (
                                <button
                                    key={i}
                                    onClick={() => onColorChange(color.id, shade)}
                                    className="w-12 h-8 hover:scale-110 transition-transform relative group/shade"
                                    style={{ backgroundColor: shade }}
                                    title={shade}
                                >
                                    <span className="sr-only">{shade}</span>
                                    <div className="absolute inset-0 border border-white/0 hover:border-white/40 transition-colors pointer-events-none" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col items-center gap-8">
                {/* Lock Button */}
                <button
                    onClick={() => onLockToggle(color.id)}
                    className="p-3 rounded-full transition-all hover:scale-110 active:scale-95"
                    style={{ backgroundColor: 'transparent' }}
                    aria-label={color.isLocked ? 'Unlock color' : 'Lock color'}
                >
                    {color.isLocked ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={iconActiveColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                        </svg>
                    )}
                </button>

                {/* Hex Code & Copy */}
                <div className={`flex flex-col items-center ${textColor}`}>
                    <div className="relative group/hex">
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value.toUpperCase())}
                                onBlur={handleBlur}
                                onKeyDown={handleKeyDown}
                                className="bg-transparent border-none text-center font-mono text-2xl font-bold focus:outline-none w-32"
                                autoFocus
                            />
                        ) : (
                            <div className="flex flex-col items-center">
                                <button
                                    onClick={handleHexClick}
                                    className="font-mono text-2xl font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
                                >
                                    {color.hex}
                                </button>

                                {/* Instant Copy Button (appears on hover) */}
                                <button
                                    onClick={copyToClipboard}
                                    className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/hex:opacity-100 transition-all duration-200 p-2 rounded-lg bg-black/80 backdrop-blur-sm text-white flex items-center gap-2 text-xs whitespace-nowrap"
                                >
                                    {copied ? (
                                        <>
                                            <Check size={14} className="text-success" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy size={14} />
                                            <span>Copy HEX</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                    <span className="text-xs uppercase font-medium opacity-60 mt-1">
                        {color.name || 'Color'}
                    </span>
                </div>
            </div>

            {/* Bottom spacer for balance */}
            <div className="h-24" />
        </div>
    );
};
