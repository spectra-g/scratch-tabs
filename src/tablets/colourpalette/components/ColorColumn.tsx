import React, { useState, useRef } from 'react';
import { ColorInfo } from '../types';

interface ColorColumnProps {
    color: ColorInfo;
    index: number;
    onLockToggle: (id: string) => void;
    onColorChange: (id: string, hex: string) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDrop: (e: React.DragEvent, index: number) => void;
}

export const ColorColumn: React.FC<ColorColumnProps> = ({
    color,
    index,
    onLockToggle,
    onColorChange,
    onDragStart,
    onDragOver,
    onDrop,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(color.hex);
    const inputRef = useRef<HTMLInputElement>(null);

    const isDark = color.luminance < 0.4;
    const textColor = isDark ? 'text-white' : 'text-black';
    const iconColor = isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.5)';
    const iconActiveColor = isDark ? 'white' : 'black';

    const handleHexClick = () => {
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

    return (
        <div
            className="relative flex-1 h-full flex flex-col items-center justify-between py-12 transition-all duration-300 group select-none"
            style={{ backgroundColor: color.hex }}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={(e) => onDrop(e, index)}
        >
            {/* Drag Handle Top */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="12" r="1" />
                    <circle cx="9" cy="5" r="1" />
                    <circle cx="9" cy="19" r="1" />
                    <circle cx="15" cy="12" r="1" />
                    <circle cx="15" cy="5" r="1" />
                    <circle cx="15" cy="19" r="1" />
                </svg>
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

                {/* Hex Code */}
                <div className={`flex flex-col items-center ${textColor}`}>
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
                        <button
                            onClick={handleHexClick}
                            className="font-mono text-2xl font-bold uppercase tracking-wider hover:opacity-80 transition-opacity"
                        >
                            {color.hex}
                        </button>
                    )}
                    <span className="text-xs uppercase font-medium opacity-60 mt-1">
                        {color.name || 'Color'}
                    </span>
                </div>
            </div>

            {/* Placeholder at bottom for balance */}
            <div className="h-10" />
        </div>
    );
};
